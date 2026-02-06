from fastapi.testclient import TestClient

from app.main import app
from app.models.user import UserRole
from tests.utils import register_and_login


client = TestClient(app)


def test_create_user():
    user, headers = register_and_login(
        client, username="testuser", password="testpassword", email="test@example.com"
    )
    assert user["username"] == "testuser"
    assert user["email"] == "test@example.com"
    assert "id" in user


def test_create_owner():
    user, headers = register_and_login(
        client,
        username="testuser",
        password="testpassword",
        email="test@example.com",
        is_owner=True,
    )
    assert user["username"] == "testuser"
    assert user["email"] == "test@example.com"
    assert "id" in user


def test_get_user():
    user, headers = register_and_login(
        client, username="testuser", password="testpassword", email="test@example.com"
    )
    user_id = user["id"]
    response = client.get(f"/users/{user_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"


def test_get_users():
    # Register admin user (regular registration)
    admin_user, admin_headers = register_and_login(
        client,
        username="adminuser",
        password="adminpassword",
        email="admin@example.com",
        is_owner=False,
    )
    # Patch admin role directly in DB for testing
    from app.db.session import SessionLocal
    from app.models.user import User

    db = SessionLocal()
    db_user = db.query(User).filter_by(username="adminuser").first()
    db_user.role = UserRole.ADMIN
    db.commit()
    db.close()

    # Log in again to get a new token with ADMIN role
    login_resp = client.post(
        "/login", json={"username": "adminuser", "password": "adminpassword"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # Register owner user
    user2, _ = register_and_login(
        client,
        username="testuser2",
        password="testpassword2",
        email="test2@example.com",
        is_owner=True,
    )
    response = client.get("/users/", headers=admin_headers)
    print("GET /users status:", response.status_code, "body:", response.json())
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    usernames = [user["username"] for user in data]
    assert "adminuser" in usernames
    assert "testuser2" in usernames


def test_update_user():
    user, headers = register_and_login(
        client,
        username="testuser",
        password="testpassword",
        email="test@example.com",
        is_owner=True,
    )
    user_id = user["id"]
    response = client.put(
        f"/users/{user_id}",
        json={
            "email": "updated@example.com",
            "full_name": "Updated User",
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "updated@example.com"
    assert data["full_name"] == "Updated User"


def test_delete_user():
    user, headers = register_and_login(
        client,
        username="testuser",
        password="testpassword",
        email="test@example.com",
        is_owner=True,
    )
    user_id = user["id"]
    response = client.delete(f"/users/{user_id}", headers=headers)
    assert response.status_code == 200

    # Token belongs to a user that no longer exists -> guarded as 401
    response = client.get(f"/users/{user_id}", headers=headers)
    assert response.status_code == 401


def test_register_with_existing_username():
    register_and_login(
        client,
        username="duplicateuser",
        password="testpassword",
        email="unique1@example.com",
    )
    response = client.post(
        "/users/register",
        json={
            "username": "duplicateuser",
            "email": "unique2@example.com",
            "full_name": "Test User",
            "password": "testpassword",
        },
    )
    assert response.status_code in (400, 409)


def test_register_with_existing_email():
    register_and_login(
        client,
        username="uniqueuser",
        password="testpassword",
        email="duplicate@example.com",
    )
    response = client.post(
        "/users/register",
        json={
            "username": "anotheruser",
            "email": "duplicate@example.com",
            "full_name": "Test User",
            "password": "testpassword",
        },
    )
    assert response.status_code in (400, 409)


def test_login_with_wrong_password():
    register_and_login(
        client,
        username="wrongpassuser",
        password="rightpassword",
        email="wrongpass@example.com",
    )
    response = client.post(
        "/login", json={"username": "wrongpassuser", "password": "wrongpassword"}
    )
    assert response.status_code in (400, 401)


def test_get_user_unauthenticated():
    user, headers = register_and_login(
        client,
        username="unauthuser",
        password="testpassword",
        email="unauth@example.com",
    )
    user_id = user["id"]
    response = client.get(f"/users/{user_id}")
    assert response.status_code == 401


def test_update_user_unauthenticated():
    user, headers = register_and_login(
        client,
        username="unauthupdate",
        password="testpassword",
        email="unauthupdate@example.com",
    )
    user_id = user["id"]
    response = client.put(
        f"/users/{user_id}",
        json={
            "username": "unauthupdate",
            "email": "new@example.com",
            "full_name": "New Name",
        },
    )
    assert response.status_code == 401


def test_delete_user_unauthenticated():
    user, headers = register_and_login(
        client,
        username="unauthdelete",
        password="testpassword",
        email="unauthdelete@example.com",
    )
    user_id = user["id"]
    response = client.delete(f"/users/{user_id}")
    assert response.status_code == 401


def test_get_nonexistent_user():
    user, headers = register_and_login(
        client,
        username="nonexistent",
        password="testpassword",
        email="nonexistent@example.com",
    )
    response = client.get("/users/99999", headers=headers)
    assert response.status_code == 404


def test_update_nonexistent_user():
    user, headers = register_and_login(
        client,
        username="nonexistentupdate",
        password="testpassword",
        email="nonexistentupdate@example.com",
    )
    response = client.put(
        "/users/99999",
        json={
            "username": "doesnotexist",
            "email": "doesnotexist@example.com",
            "full_name": "No User",
        },
        headers=headers,
    )
    assert response.status_code == 404


def test_delete_nonexistent_user():
    user, headers = register_and_login(
        client,
        username="nonexistentdelete",
        password="testpassword",
        email="nonexistentdelete@example.com",
    )
    response = client.delete("/users/99999", headers=headers)
    assert response.status_code == 404


def test_update_user_invalid_email():
    user, headers = register_and_login(
        client,
        username="invalidemail",
        password="testpassword",
        email="invalidemail@example.com",
    )
    user_id = user["id"]
    response = client.put(
        f"/users/{user_id}",
        json={
            "email": "not-an-email",
            "full_name": "Invalid Email",
        },
        headers=headers,
    )
    assert response.status_code == 422


def test_delete_user_twice():
    user, headers = register_and_login(
        client,
        username="twicedelete",
        password="testpassword",
        email="twicedelete@example.com",
    )
    user_id = user["id"]
    response = client.delete(f"/users/{user_id}", headers=headers)
    assert response.status_code == 200

    # Token belongs to a user that no longer exists -> guarded as 401
    response = client.delete(f"/users/{user_id}", headers=headers)
    assert response.status_code == 401


def test_update_another_user_forbidden():
    user1, headers1 = register_and_login(
        client, username="user1", password="testpassword", email="user1@example.com"
    )
    user2, headers2 = register_and_login(
        client, username="user2", password="testpassword", email="user2@example.com"
    )
    user1_id = user1["id"]
    response = client.put(
        f"/users/{user1_id}",
        json={
            "username": "user1",
            "email": "hacked@example.com",
            "full_name": "Hacker",
        },
        headers=headers2,
    )
    assert response.status_code in (403, 404)


def test_list_users_admin_only():
    # Register regular user
    _, user_headers = register_and_login(
        client, username="user1", password="pw", email="user1@example.com"
    )
    # Register owner
    _, owner_headers = register_and_login(
        client,
        username="owner1",
        password="pw",
        email="owner1@example.com",
        is_owner=True,
    )
    # Register admin and patch role
    admin_user, _ = register_and_login(
        client, username="admin1", password="pw", email="admin1@example.com"
    )
    from app.db.session import SessionLocal
    from app.models.user import User, UserRole

    db = SessionLocal()
    db_user = db.query(User).filter_by(username="admin1").first()
    db_user.role = UserRole.ADMIN
    db.commit()
    db.close()
    # Login as admin to get token
    login_resp = client.post("/login", json={"username": "admin1", "password": "pw"})
    admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Regular user forbidden
    resp = client.get("/users/", headers=user_headers)
    assert resp.status_code == 403

    # Owner forbidden
    resp = client.get("/users/", headers=owner_headers)
    assert resp.status_code == 403

    # Admin allowed
    resp = client.get("/users/", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_list_users_supports_pagination_and_filters():
    # Create admin and patch role
    register_and_login(
        client, username="admin_filter", password="pw", email="admin_filter@example.com"
    )
    from app.db.session import SessionLocal
    from app.models.user import User, UserRole

    db = SessionLocal()
    db_user = db.query(User).filter_by(username="admin_filter").first()
    db_user.role = UserRole.ADMIN
    db.commit()
    db.close()

    login_resp = client.post(
        "/login", json={"username": "admin_filter", "password": "pw"}
    )
    admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Seed a few users
    register_and_login(
        client, username="alpha_user", password="pw", email="alpha_user@example.com"
    )
    register_and_login(
        client,
        username="beta_owner",
        password="pw",
        email="beta_owner@example.com",
        is_owner=True,
    )
    register_and_login(
        client, username="gamma_user", password="pw", email="gamma_user@example.com"
    )

    # role filter
    r_role = client.get("/users/?role=OWNER", headers=admin_headers)
    assert r_role.status_code == 200
    assert r_role.headers.get("x-total-count") is not None
    assert all(u["role"] == "OWNER" for u in r_role.json())

    # q filter
    r_q = client.get("/users/?q=gamma", headers=admin_headers)
    assert r_q.status_code == 200
    data = r_q.json()
    assert any("gamma_user" == u["username"] for u in data)

    # pagination: limit=1 should return one row, with total >= 1
    r_page = client.get("/users/?skip=0&limit=1", headers=admin_headers)
    assert r_page.status_code == 200
    assert isinstance(r_page.json(), list)
    assert len(r_page.json()) == 1
    total = int(r_page.headers.get("x-total-count") or "0")
    assert total >= 1


def test_get_me():
    user, headers = register_and_login(
        client, username="meuser", password="testpassword", email="me@example.com"
    )

    resp = client.get("/users/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["id"] == user["id"]
    assert data["username"] == user["username"]
    assert data["email"] == user["email"]
    assert "full_name" in data
    assert "role" in data


def test_update_me():
    user, headers = register_and_login(
        client, username="meupdate", password="testpassword", email="old@example.com"
    )

    resp = client.put(
        "/users/me",
        json={"email": "new@example.com", "full_name": "New Name"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "new@example.com"
    assert data["full_name"] == "New Name"

    # Optional: confirm via GET
    resp2 = client.get("/users/me", headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["email"] == "new@example.com"


def test_update_me_rejects_role_and_username():
    _, headers = register_and_login(
        client,
        username="meimmut",
        password="testpassword",
        email="immut@example.com",
        is_owner=False,
    )

    resp = client.put(
        "/users/me",
        json={
            "email": "immut2@example.com",
            "full_name": "Updated",
            "username": "hackedname",
            "role": "OWNER",
        },
        headers=headers,
    )

    assert resp.status_code == 400
    assert resp.json()["detail"] == "username and role cannot be updated"


def test_update_user_rejects_role_and_username():
    user, headers = register_and_login(
        client,
        username="uimmut",
        password="testpassword",
        email="uimmut@example.com",
        is_owner=True,  # initial role=OWNER
    )
    user_id = user["id"]

    resp = client.put(
        f"/users/{user_id}",
        json={
            "email": "changed@example.com",
            "full_name": "Changed Name",
            "username": "newusername_should_fail",
            "role": "USER",
        },
        headers=headers,
    )

    assert resp.status_code == 400
    assert resp.json()["detail"] == "username and role cannot be updated"
