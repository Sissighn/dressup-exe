import logging
import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

import services
from database import get_db
from routers.auth import get_user_for_actor
from security import enforce_rate_limit, get_current_actor
from settings import UPLOAD_DIR, build_upload_url
from storage import save_validated_upload, validate_image_filename

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate-avatar")
async def generate_avatar(
    request: Request,
    face_scan: UploadFile = File(...),
    display_name: str = Form(...),
    height: str = Form(...),
    weight: str = Form(...),
    body_type: str = Form(...),
    gender: str = Form(...),
    db: Session = Depends(get_db),
    actor=Depends(get_current_actor),
):
    enforce_rate_limit(
        request, key="ai:generate-avatar", limit=6, window_seconds=60 * 60
    )

    try:
        original_ext = validate_image_filename(face_scan.filename or "face.png")
        face_path = os.path.join(
            UPLOAD_DIR,
            f"face_{actor['owner_key']}_{uuid.uuid4().hex}{original_ext}",
        )
        face_path = await save_validated_upload(face_scan, face_path)
        face_scan_url = build_upload_url(os.path.basename(face_path))

        result = await services.try_gemini_generation(
            face_path,
            f"{actor['owner_key']}_{display_name}",
            height,
            weight,
            body_type,
            gender,
        )

        if not result["success"]:
            raise HTTPException(
                status_code=422,
                detail=result.get("error", "Generation failed"),
            )

        result["face_scan_url"] = face_scan_url
        user = get_user_for_actor(actor, db)
        if user and result.get("avatar_url"):
            user.avatar_url = result.get("avatar_url", "")
            user.face_scan_url = face_scan_url
            user.display_name = display_name or ""
            user.gender = gender or ""
            user.height = height or ""
            user.weight = weight or ""
            user.body_type = body_type or ""
            db.add(user)
            db.commit()
        return {"status": "success", "data": result}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Avatar generation failed")
        raise HTTPException(status_code=500, detail="Avatar generation failed.")


@router.post("/try-on-outfit")
async def try_on_outfit(
    request: Request,
    avatar_image: UploadFile = File(...),
    top_image: UploadFile = File(...),
    bottom_image: UploadFile = File(...),
    actor=Depends(get_current_actor),
):
    enforce_rate_limit(
        request, key="ai:try-on-outfit", limit=12, window_seconds=60 * 60
    )

    try:
        upload_id = uuid.uuid4().hex
        av_p = await save_validated_upload(
            avatar_image,
            os.path.join(UPLOAD_DIR, f"temp_av_{actor['owner_key']}_{upload_id}.png"),
        )
        tp_p = await save_validated_upload(
            top_image,
            os.path.join(UPLOAD_DIR, f"temp_tp_{actor['owner_key']}_{upload_id}.png"),
        )
        bt_p = await save_validated_upload(
            bottom_image,
            os.path.join(UPLOAD_DIR, f"temp_bt_{actor['owner_key']}_{upload_id}.png"),
        )

        result = await services.try_gemini_outfit_generation(av_p, tp_p, bt_p)
        if result["success"]:
            return result
        raise HTTPException(status_code=422, detail=result.get("error"))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Try-on generation failed")
        raise HTTPException(status_code=500, detail="Try-on generation failed.")


@router.get("/providers/check")
def check_providers():
    google_key = os.getenv("GOOGLE_API_KEY")
    return {
        "gemini": "Ready" if google_key else "Missing",
    }
