import os

from conftest import TEST_UPLOAD_DIR, current_owner_key, make_png_bytes, register_user


def test_profile_persists_and_normalizes_private_urls(client):
    register_user(client)
    owner_key = current_owner_key(client)
    avatar_filename = f"avatar_{owner_key}_profile.png"
    face_filename = f"face_{owner_key}_profile.png"

    update = client.put(
        "/profile",
        json={
            "display_name": "Seta",
            "avatar_url": f"http://old-host/uploads/{avatar_filename}?cache=1",
            "face_scan_url": f"http://old-host/uploads/{face_filename}",
            "gender": "FEMALE",
            "height": "170",
            "weight": "60",
            "body_type": "ATHLETIC",
        },
    )
    assert update.status_code == 200

    profile = client.get("/profile")
    assert profile.status_code == 200
    assert profile.json()["display_name"] == "Seta"
    assert profile.json()["avatar_url"] == f"http://testserver/uploads/{avatar_filename}"
    assert profile.json()["face_scan_url"] == f"http://testserver/uploads/{face_filename}"


def test_guest_cannot_persist_profile(client):
    client.post("/auth/guest")

    response = client.put("/profile", json={"display_name": "Guest"})

    assert response.status_code == 403


def test_archive_look_is_owner_scoped_and_deletable(client):
    register_user(client)
    owner_key = current_owner_key(client)
    source_filename = f"outfit_result_temp_av_{owner_key}_look.png"
    source_path = os.path.join(TEST_UPLOAD_DIR, source_filename)
    with open(source_path, "wb") as image_file:
        image_file.write(make_png_bytes())

    archive = client.post(
        "/archive-look",
        json={"outfit_url": f"http://testserver/uploads/{source_filename}"},
    )
    assert archive.status_code == 200
    archived_id = archive.json()["id"]
    assert archived_id.startswith(f"archived_look_{owner_key}_")

    gallery = client.get("/gallery")
    assert gallery.status_code == 200
    assert gallery.json()[0]["id"] == archived_id

    delete = client.delete(f"/delete-look/{archived_id}")
    assert delete.status_code == 200
    assert client.get("/gallery").json() == []


def test_archive_rejects_foreign_or_missing_sources(client):
    register_user(client)

    missing = client.post(
        "/archive-look",
        json={"outfit_url": "http://testserver/uploads/outfit_result_temp_av_other_x.png"},
    )
    assert missing.status_code == 404

    foreign_filename = "outfit_result_temp_av_u_foreign_look.png"
    with open(os.path.join(TEST_UPLOAD_DIR, foreign_filename), "wb") as image_file:
        image_file.write(make_png_bytes())

    forbidden = client.post(
        "/archive-look",
        json={"outfit_url": f"http://testserver/uploads/{foreign_filename}"},
    )
    assert forbidden.status_code == 403


def test_generate_avatar_uses_ai_service_and_persists_profile(client, monkeypatch):
    async def fake_generation(face_path, display_name, height, weight, body_type, gender):
        owner_key = current_owner_key(client)
        avatar_filename = f"avatar_{owner_key}_generated.png"
        with open(os.path.join(TEST_UPLOAD_DIR, avatar_filename), "wb") as image_file:
            image_file.write(make_png_bytes())
        return {
            "success": True,
            "avatar_url": f"http://testserver/uploads/{avatar_filename}",
        }

    import services

    register_user(client)
    monkeypatch.setattr(services, "try_gemini_generation", fake_generation)

    response = client.post(
        "/generate-avatar",
        data={
            "display_name": "Seta",
            "height": "170",
            "weight": "60",
            "body_type": "ATHLETIC",
            "gender": "FEMALE",
        },
        files={"face_scan": ("face.png", make_png_bytes(), "image/png")},
    )

    assert response.status_code == 200, response.text
    assert response.json()["data"]["avatar_url"].endswith("_generated.png")
    assert client.get("/profile").json()["display_name"] == "Seta"


def test_try_on_outfit_returns_mocked_ai_result(client, monkeypatch):
    async def fake_outfit_generation(avatar_path, top_path, bottom_path):
        owner_key = current_owner_key(client)
        outfit_filename = f"outfit_result_temp_av_{owner_key}_mock.png"
        with open(os.path.join(TEST_UPLOAD_DIR, outfit_filename), "wb") as image_file:
            image_file.write(make_png_bytes())
        return {
            "success": True,
            "outfit_url": f"http://testserver/uploads/{outfit_filename}",
        }

    import services

    register_user(client)
    monkeypatch.setattr(services, "try_gemini_outfit_generation", fake_outfit_generation)

    response = client.post(
        "/try-on-outfit",
        files={
            "avatar_image": ("avatar.png", make_png_bytes(), "image/png"),
            "top_image": ("top.png", make_png_bytes(), "image/png"),
            "bottom_image": ("bottom.png", make_png_bytes(), "image/png"),
        },
    )

    assert response.status_code == 200
    assert response.json()["outfit_url"].endswith("_mock.png")
