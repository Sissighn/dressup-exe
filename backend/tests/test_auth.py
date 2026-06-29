def test_register_sets_httponly_cookie_and_me_returns_user(client):
    response = client.post(
        "/auth/register",
        json={"email": "User@Example.com", "password": "StrongPass123!"},
    )

    assert response.status_code == 200
    assert response.json()["user"] == {"email": "user@example.com", "role": "user"}
    set_cookie = response.headers["set-cookie"]
    assert "dressup_access_token=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "SameSite=lax" in set_cookie

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json() == {"email": "user@example.com", "role": "user"}


def test_register_rejects_weak_password(client):
    response = client.post(
        "/auth/register",
        json={"email": "weak@example.com", "password": "short"},
    )

    assert response.status_code == 400
    assert "at least 12 characters" in response.json()["detail"]


def test_login_rejects_wrong_password_and_accepts_correct_password(client):
    client.post(
        "/auth/register",
        json={"email": "login@example.com", "password": "StrongPass123!"},
    )

    bad_login = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "WrongPass123!"},
    )
    assert bad_login.status_code == 401

    good_login = client.post(
        "/auth/login",
        json={"email": "login@example.com", "password": "StrongPass123!"},
    )
    assert good_login.status_code == 200
    assert good_login.json()["user"]["email"] == "login@example.com"


def test_logout_clears_session_cookie(client):
    client.post("/auth/guest")
    assert client.get("/auth/me").status_code == 200

    logout = client.post("/auth/logout")
    assert logout.status_code == 200
    assert client.get("/auth/me").status_code == 401
