from typing import Optional

from pydantic import BaseModel


class AuthRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    gender: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[str] = None
    body_type: Optional[str] = None
    avatar_url: Optional[str] = None
    face_scan_url: Optional[str] = None


class StylingPlacedItem(BaseModel):
    image_path: str
    x: float
    y: float
    width: float
    aspect_ratio: Optional[float] = 1.0
    rotation: Optional[float] = 0.0
    z_index: Optional[int] = 0


class StylingBoardExportRequest(BaseModel):
    board_width: int
    board_height: int
    export_scale: Optional[int] = 3
    items: list[StylingPlacedItem]


class ArchiveLookRequest(BaseModel):
    image_url: Optional[str] = None
    outfit_url: Optional[str] = None
