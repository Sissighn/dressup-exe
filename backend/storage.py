import logging
import os
import shutil
import time
from io import BytesIO

from fastapi import HTTPException, UploadFile
from PIL import Image

from settings import (
    MAX_UPLOAD_BYTES,
    MAX_UPLOAD_PIXELS,
    UPLOAD_DIR,
    build_upload_url,
)

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}
CLOSET_CATEGORIES = {"TOPS", "BOTTOMS", "DRESSES", "SHOES", "BAGS"}


def extract_upload_filename_from_url(file_url: str) -> str:
    return os.path.basename((file_url or "").split("?")[0])


def normalize_upload_url(file_url: str) -> str:
    filename = extract_upload_filename_from_url(file_url)
    return build_upload_url(filename) if filename else ""


def is_actor_owned_upload(filename: str, actor: dict) -> bool:
    owner_key = actor.get("owner_key", "")
    if not filename or not owner_key or os.path.basename(filename) != filename:
        return False

    owner_markers = (
        f"{owner_key}_",
        f"face_{owner_key}_",
        f"avatar_{owner_key}_",
        f"temp_av_{owner_key}_",
        f"temp_tp_{owner_key}_",
        f"temp_bt_{owner_key}_",
        f"outfit_result_temp_av_{owner_key}_",
        f"styling_board_{owner_key}_",
        f"archived_look_{owner_key}_",
        f"archived_board_{owner_key}_",
    )
    return filename.startswith(owner_markers)


def validate_image_filename(filename: str) -> str:
    _, extension = os.path.splitext(filename or "")
    extension = extension.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image extension. Use JPG, PNG, or WEBP.",
        )
    return extension


async def save_validated_upload(
    upload: UploadFile, destination_path: str, *, allowed_content_types=None
) -> str:
    allowed_content_types = allowed_content_types or ALLOWED_IMAGE_CONTENT_TYPES
    extension = validate_image_filename(upload.filename or "upload.png")
    content_type = (upload.content_type or "").lower()

    if content_type and content_type not in allowed_content_types:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image type. Use JPG, PNG, or WEBP.",
        )

    data = await upload.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image is too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)}MB.",
        )

    try:
        with Image.open(BytesIO(data)) as image:
            image.verify()
        with Image.open(BytesIO(data)) as image:
            width, height = image.size
            if width <= 0 or height <= 0 or width * height > MAX_UPLOAD_PIXELS:
                raise HTTPException(
                    status_code=413,
                    detail="Image dimensions are too large.",
                )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.")

    if not destination_path.lower().endswith(extension):
        destination_path = f"{os.path.splitext(destination_path)[0]}{extension}"

    with open(destination_path, "wb") as destination:
        destination.write(data)

    return destination_path


def is_actor_owned_look_source(filename: str, actor: dict) -> bool:
    owner_key = actor.get("owner_key", "")
    return bool(filename and owner_key and filename.startswith(f"outfit_result_temp_av_{owner_key}_"))


def is_actor_owned_board_source(filename: str, actor: dict) -> bool:
    owner_key = actor.get("owner_key", "")
    return bool(filename and owner_key and filename.startswith(f"styling_board_{owner_key}_"))


def archive_uploaded_image(
    *, file_url: str, actor: dict, archive_prefix: str, source_guard
) -> dict:
    filename = extract_upload_filename_from_url(file_url)
    source_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(source_path):
        raise HTTPException(status_code=404, detail="Source image not found")

    if not source_guard(filename, actor):
        raise HTTPException(
            status_code=403,
            detail="Not permitted to archive this image",
        )

    archived_filename = f"{archive_prefix}_{actor['owner_key']}_{int(time.time())}.png"
    dest_path = os.path.join(UPLOAD_DIR, archived_filename)
    shutil.copy2(source_path, dest_path)

    return {
        "status": "success",
        "archived_url": build_upload_url(archived_filename),
        "id": archived_filename,
    }


def list_archived_assets(actor: dict, archive_prefix: str) -> list[dict]:
    assets = []
    if not os.path.exists(UPLOAD_DIR):
        return assets

    owner_prefix = f"{archive_prefix}_{actor['owner_key']}_"
    for file in os.listdir(UPLOAD_DIR):
        if file.startswith(owner_prefix):
            assets.append(
                {
                    "id": file,
                    "url": build_upload_url(file),
                    "date": os.path.getctime(os.path.join(UPLOAD_DIR, file)),
                }
            )

    assets.sort(key=lambda item: item["date"], reverse=True)
    return assets


def delete_archived_asset(filename: str, actor: dict, archive_prefix: str) -> dict:
    owner_prefix = f"{archive_prefix}_{actor['owner_key']}_"
    if not filename.startswith(owner_prefix):
        raise HTTPException(
            status_code=403,
            detail="Not permitted to delete this file",
        )

    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    os.remove(file_path)
    return {"status": "success", "message": f"Asset {filename} deleted"}
