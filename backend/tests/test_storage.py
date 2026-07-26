import os

import pytest
from fastapi import HTTPException

from conftest import TEST_UPLOAD_DIR, make_png_bytes
from storage import (
    delete_archived_asset,
    is_actor_owned_upload,
    list_archived_assets,
    normalize_upload_url,
    validate_image_filename,
)


def test_validate_image_filename_allows_expected_extensions():
    assert validate_image_filename("shirt.JPG") == ".jpg"
    assert validate_image_filename("pants.webp") == ".webp"


def test_validate_image_filename_rejects_unexpected_extension():
    with pytest.raises(HTTPException) as exc:
        validate_image_filename("script.svg")

    assert exc.value.status_code == 400


def test_actor_owned_upload_rejects_path_traversal_and_foreign_names():
    actor = {"owner_key": "u_owner"}

    assert is_actor_owned_upload("u_owner_TOPS_item.png", actor)
    assert not is_actor_owned_upload("../u_owner_TOPS_item.png", actor)
    assert not is_actor_owned_upload("u_other_TOPS_item.png", actor)


def test_list_and_delete_archived_assets():
    actor = {"owner_key": "u_owner"}
    filename = "archived_look_u_owner_123.png"
    with open(os.path.join(TEST_UPLOAD_DIR, filename), "wb") as image_file:
        image_file.write(make_png_bytes())

    assets = list_archived_assets(actor, "archived_look")
    assert [asset["id"] for asset in assets] == [filename]
    assert assets[0]["url"] == normalize_upload_url(filename)

    response = delete_archived_asset(filename, actor, "archived_look")
    assert response["status"] == "success"
    assert not os.path.exists(os.path.join(TEST_UPLOAD_DIR, filename))
