from fastapi import APIRouter, Depends, HTTPException

from schemas import ArchiveLookRequest
from security import get_current_actor
from storage import (
    archive_uploaded_image,
    delete_archived_asset,
    is_actor_owned_board_source,
    is_actor_owned_look_source,
    list_archived_assets,
)

router = APIRouter()


@router.post("/archive-look")
async def archive_look(
    payload: ArchiveLookRequest, actor=Depends(get_current_actor)
):
    temp_url = payload.image_url or payload.outfit_url or ""
    if not temp_url:
        raise HTTPException(status_code=400, detail="No URL provided")

    return archive_uploaded_image(
        file_url=temp_url,
        actor=actor,
        archive_prefix="archived_look",
        source_guard=is_actor_owned_look_source,
    )


@router.post("/archive-board")
async def archive_board(
    payload: ArchiveLookRequest, actor=Depends(get_current_actor)
):
    board_url = payload.image_url or payload.outfit_url or ""
    if not board_url:
        raise HTTPException(status_code=400, detail="No URL provided")

    return archive_uploaded_image(
        file_url=board_url,
        actor=actor,
        archive_prefix="archived_board",
        source_guard=is_actor_owned_board_source,
    )


@router.get("/gallery")
async def get_gallery(actor=Depends(get_current_actor)):
    return list_archived_assets(actor, "archived_look")


@router.get("/boards")
async def get_boards(actor=Depends(get_current_actor)):
    return list_archived_assets(actor, "archived_board")


@router.delete("/delete-look/{filename}")
async def delete_look(filename: str, actor=Depends(get_current_actor)):
    return delete_archived_asset(filename, actor, "archived_look")


@router.delete("/delete-board/{filename}")
async def delete_board(filename: str, actor=Depends(get_current_actor)):
    return delete_archived_asset(filename, actor, "archived_board")
