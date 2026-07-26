import os

from fastapi.testclient import TestClient

from conftest import TEST_UPLOAD_DIR, current_owner_key, make_png_bytes, register_user
from main import app


def upload_item(client, name="Top", category="TOPS", filename="item.png", data=None):
    return client.post(
        "/upload-item",
        data={"name": name, "category": category},
        files={
            "file": (
                filename,
                data if data is not None else make_png_bytes(),
                "image/png",
            )
        },
    )


def test_upload_rejects_non_image_payload(client):
    register_user(client)

    response = upload_item(client, data=b"not really an image")

    assert response.status_code == 400
    assert response.json()["detail"] == "Uploaded file is not a valid image."


def test_upload_rejects_unsupported_extension(client):
    register_user(client)

    response = upload_item(client, filename="item.gif", data=make_png_bytes())

    assert response.status_code == 400
    assert "Unsupported image extension" in response.json()["detail"]


def test_upload_requires_authentication(client):
    response = upload_item(client)

    assert response.status_code == 401


def test_upload_rejects_invalid_category(client):
    register_user(client)

    response = upload_item(client, category="HATS")

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid closet category."


def test_upload_creates_owner_scoped_item_and_protected_asset(client):
    register_user(client)

    response = upload_item(client, name="Silk Top")

    assert response.status_code == 200, response.text
    item = response.json()["item"]
    owner_key = current_owner_key(client)
    assert item["owner_key"] == owner_key
    assert f"/uploads/{owner_key}_TOPS_" in item["image_path"]

    filename = os.path.basename(item["image_path"])
    assert os.path.exists(os.path.join(TEST_UPLOAD_DIR, filename))

    asset = client.get(f"/uploads/{filename}")
    assert asset.status_code == 200
    assert asset.headers["content-type"].startswith("image/")


def test_owner_isolation_for_closet_upload_access_and_delete(client):
    register_user(client, email="owner@example.com")
    upload_response = upload_item(client, name="Private Top")
    item = upload_response.json()["item"]
    filename = os.path.basename(item["image_path"])
    item_id = item["id"]

    with TestClient(app) as other_client:
        register_user(other_client, email="other@example.com")

        other_closet = other_client.get("/closet")
        assert other_closet.status_code == 200
        assert other_closet.json() == []

        forbidden_asset = other_client.get(f"/uploads/{filename}")
        assert forbidden_asset.status_code == 403

        forbidden_delete = other_client.delete(f"/delete-item/{item_id}")
        assert forbidden_delete.status_code == 404

    owner_delete = client.delete(f"/delete-item/{item_id}")
    assert owner_delete.status_code == 200
    assert client.get("/closet").json() == []


def test_export_styling_board_creates_owner_scoped_image(client):
    register_user(client)
    upload_response = upload_item(client, name="Board Top")
    item = upload_response.json()["item"]

    response = client.post(
        "/export-styling-board",
        json={
            "board_width": 240,
            "board_height": 320,
            "export_scale": 1,
            "items": [
                {
                    "image_path": item["image_path"],
                    "x": 20,
                    "y": 30,
                    "width": 80,
                    "aspect_ratio": 1,
                    "rotation": 0,
                    "z_index": 0,
                }
            ],
        },
    )

    assert response.status_code == 200, response.text
    filename = os.path.basename(response.json()["image_url"])
    assert filename.startswith(f"styling_board_{current_owner_key(client)}_")
    assert os.path.exists(os.path.join(TEST_UPLOAD_DIR, filename))


def test_export_styling_board_validates_payload(client):
    register_user(client)

    response = client.post(
        "/export-styling-board",
        json={"board_width": 0, "board_height": 100, "items": []},
    )

    assert response.status_code == 400
