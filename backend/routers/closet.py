import logging
import os
import time
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, ImageDraw
from sqlalchemy.orm import Session

import services
from database import ClothingItem, get_db
from schemas import StylingBoardExportRequest
from security import enforce_rate_limit, get_current_actor
from settings import UPLOAD_DIR, build_upload_url
from storage import (
    CLOSET_CATEGORIES,
    extract_upload_filename_from_url,
    is_actor_owned_upload,
    normalize_upload_url,
    save_validated_upload,
    validate_image_filename,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/uploads/{filename:path}")
def get_upload(filename: str, actor=Depends(get_current_actor)):
    safe_filename = os.path.basename(filename or "")
    if not safe_filename or safe_filename != filename:
        raise HTTPException(status_code=400, detail="Invalid file path.")

    if not is_actor_owned_upload(safe_filename, actor):
        raise HTTPException(status_code=403, detail="Not permitted to access this file.")

    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(file_path)


@router.post("/upload-item")
async def upload_item(
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form(...),
    db: Session = Depends(get_db),
    actor=Depends(get_current_actor),
):
    enforce_rate_limit(request, key="upload:item", limit=30, window_seconds=15 * 60)

    category = (category or "").upper()
    if category not in CLOSET_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid closet category.")

    original_ext = validate_image_filename(file.filename or "item.png")
    safe_filename = f"{actor['owner_key']}_{category}_{uuid.uuid4().hex}{original_ext}"
    local_path = os.path.join(UPLOAD_DIR, safe_filename)
    local_path = await save_validated_upload(file, local_path)

    processed_path = local_path
    removal_error = None

    for _ in range(2):
        try:
            processed_path = services.remove_background_from_image(local_path)
            removal_error = None
            break
        except Exception as exc:
            removal_error = exc

    if removal_error is not None:
        logger.error(
            "Background removal failed for %s",
            safe_filename,
            exc_info=(
                type(removal_error),
                removal_error,
                removal_error.__traceback__,
            ),
        )
        raise HTTPException(
            status_code=500,
            detail="Background removal failed. Please retry upload.",
        )

    image_url = build_upload_url(os.path.basename(processed_path))
    new_item = ClothingItem(
        name=name,
        category=category,
        image_path=image_url,
        owner_key=actor["owner_key"],
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return {"status": "success", "item": new_item}


@router.get("/closet")
async def get_closet(db: Session = Depends(get_db), actor=Depends(get_current_actor)):
    items = (
        db.query(ClothingItem)
        .filter(ClothingItem.owner_key == actor["owner_key"])
        .all()
    )
    return [
        {
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "image_path": normalize_upload_url(item.image_path),
            "owner_key": item.owner_key,
        }
        for item in items
    ]


@router.post("/export-styling-board")
async def export_styling_board(
    payload: StylingBoardExportRequest, actor=Depends(get_current_actor)
):
    if payload.board_width <= 0 or payload.board_height <= 0:
        raise HTTPException(status_code=400, detail="Invalid board size.")

    if not payload.items:
        raise HTTPException(status_code=400, detail="No board items provided.")

    try:
        scale = max(1, min(int(payload.export_scale or 3), 6))
        out_w = int(payload.board_width * scale)
        out_h = int(payload.board_height * scale)

        canvas = Image.new("RGBA", (out_w, out_h), (255, 255, 255, 255))
        draw = ImageDraw.Draw(canvas)

        grid = 28 * scale
        grid_color = (0, 0, 0, 2)

        for x in range(0, out_w + 1, grid):
            draw.line([(x, 0), (x, out_h)], fill=grid_color, width=1)
        for y in range(0, out_h + 1, grid):
            draw.line([(0, y), (out_w, y)], fill=grid_color, width=1)

        ordered_items = sorted(payload.items, key=lambda item: item.z_index or 0)

        for item in ordered_items:
            raw_path = (item.image_path or "").split("?")[0]
            filename = os.path.basename(raw_path)
            if not filename or not filename.startswith(f"{actor['owner_key']}_"):
                continue

            file_path = os.path.join(UPLOAD_DIR, filename)
            if not os.path.exists(file_path):
                continue

            with Image.open(file_path) as src:
                source = src.convert("RGBA")

            draw_w = max(1, int(round(item.width * scale)))
            ratio = item.aspect_ratio or 1.0
            draw_h = max(1, int(round(draw_w * ratio)))

            source = source.resize((draw_w, draw_h), Image.Resampling.LANCZOS)
            rotated = source.rotate(
                float(item.rotation or 0.0),
                resample=Image.Resampling.BICUBIC,
                expand=True,
            )

            center_x = (item.x * scale) + draw_w / 2
            center_y = (item.y * scale) + draw_h / 2
            paste_x = int(round(center_x - rotated.width / 2))
            paste_y = int(round(center_y - rotated.height / 2))

            canvas.paste(rotated, (paste_x, paste_y), rotated)

        filename = f"styling_board_{actor['owner_key']}_{int(time.time())}.png"
        output_path = os.path.join(UPLOAD_DIR, filename)
        canvas.convert("RGB").save(output_path, format="PNG", optimize=False)

        return {
            "status": "success",
            "image_url": build_upload_url(filename),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Board export failed")
        raise HTTPException(status_code=500, detail=f"Board export failed: {exc}")


@router.delete("/delete-item/{item_id}")
async def delete_item(
    item_id: int, db: Session = Depends(get_db), actor=Depends(get_current_actor)
):
    item_to_delete = (
        db.query(ClothingItem)
        .filter(
            ClothingItem.id == item_id,
            ClothingItem.owner_key == actor["owner_key"],
        )
        .first()
    )

    if not item_to_delete:
        raise HTTPException(status_code=404, detail="Item not found")

    try:
        filename = extract_upload_filename_from_url(item_to_delete.image_path)
        local_file_path = os.path.join(UPLOAD_DIR, filename)

        if filename and os.path.exists(local_file_path):
            os.remove(local_file_path)
    except Exception:
        logger.warning("Could not delete file for closet item %s", item_id, exc_info=True)

    db.delete(item_to_delete)
    db.commit()

    return {"status": "success", "message": f"Item {item_id} deleted"}
