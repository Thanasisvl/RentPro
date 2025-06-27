def make_admin(username):
    from app.db.session import SessionLocal
    from app.models.user import User, UserRole
    db = SessionLocal()
    db_user = db.query(User).filter_by(username=username).first()
    db_user.role = UserRole.ADMIN
    db.commit()
    db.close()

def register_and_login(client, username, password, email, is_owner=False):
    if is_owner:
        resp = client.post(
            "/users/register-owner",
            json={
                "username": username,
                "email": email,
                "full_name": username.title(),
                "password": password,
                "property": {
                    "title": "Initial Property",
                    "description": "Initial property for owner registration",
                    "address": "1 Owner St",
                    "type": "Apartment",
                    "size": 50.0,
                    "price": 1000.0
                }
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        user = data["user"]
        property_id = data["property"]["id"]
    else:
        resp = client.post(
            "/users/register",
            json={
                "username": username,
                "email": email,
                "full_name": username.title(),
                "password": password
            }
        )
        assert resp.status_code == 200
        user = resp.json()
        property_id = None
    # Login user
    login_resp = client.post(
        "/login",
        json={"username": username, "password": password}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers, property_id