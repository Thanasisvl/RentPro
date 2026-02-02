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

def set_property_status(property_id: int, status_value: str):
    """
    Update property.status directly in DB for test setup.
    status_value: "AVAILABLE" | "RENTED" | "INACTIVE"
    """
    from app.db.session import SessionLocal
    from app.models.property import Property, PropertyStatus

    db = SessionLocal()
    try:
        p = db.query(Property).filter(Property.id == property_id).first()
        assert p is not None
        p.status = PropertyStatus(status_value)
        db.commit()
    finally:
        db.close()

def create_property(client, headers, **overrides):
    payload = {
        "title": "Test Property",
        "description": "A nice place",
        "address": "123 Main St",
        "type": "Apartment",
        "size": 100.0,
        "price": 1200.0,
    }
    payload.update(overrides)
    resp = client.post("/properties/", json=payload, headers=headers)
    assert resp.status_code == 200
    return resp.json()