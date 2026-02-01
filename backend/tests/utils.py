def make_admin(username):
    from app.db.session import SessionLocal
    from app.models.user import User, UserRole
    db = SessionLocal()
    db_user = db.query(User).filter_by(username=username).first()
    db_user.role = UserRole.ADMIN
    db.commit()
    db.close()

def login_headers(client, username: str, password: str):
    """
    Login existing user and return Authorization headers.
    Useful when you changed role in DB (e.g. make_admin) and need a fresh token.
    """
    login_resp = client.post("/login", json={"username": username, "password": password})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def register_and_login(client, username, password, email, is_owner=False):
    from app.models.user import UserRole

    role = UserRole.OWNER if is_owner else UserRole.USER

    resp = client.post(
        "/users/register",
        json={
            "username": username,
            "email": email,
            "full_name": username.title(),
            "password": password,
            "role": role.value,
        },
    )
    assert resp.status_code == 200
    user = resp.json()

    # Login user
    login_resp = client.post(
        "/login",
        json={"username": username, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return user, headers