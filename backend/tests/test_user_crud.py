import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./backend/test_test.db"
from dotenv import load_dotenv
load_dotenv()

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine
from app.models.user import UserRole

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

client = TestClient(app)

def register_and_login(
    username="testuser",
    password="testpassword",
    email="test@example.com",
    is_owner=False
    ):
    if is_owner:
        # Register owner with property
        response = client.post(
            "/users/register-owner",
            json={
                "username": username,
                "email": email,
                "full_name": "Test User",
                "password": password,
                "property": {
                    "title": "Test Property",
                    "description": "Test Property Desc",
                    "address": "123 Main St",
                    "type": "Apartment",
                    "size": 100.0,
                    "price": 1000.0
                }
            }
        )
        assert response.status_code == 200
        user = response.json()["user"]
    else:
        # Register regular user (no role in payload)
        response = client.post(
            "/users/register",
            json={
                "username": username,
                "email": email,
                "full_name": "Test User",
                "password": password
            }
        )
        assert response.status_code == 200
        user = response.json()
    # Login user
    login_resp = client.post(
        "/login",
        json={"username": username, "password": password}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers

def test_create_user(is_owner=False):
    user, _ = register_and_login()
    assert user["username"] == "testuser"
    assert user["email"] == "test@example.com"
    assert "id" in user

def test_create_owner():
    user, _ = register_and_login(is_owner=True)
    assert user["username"] == "testuser"
    assert user["email"] == "test@example.com"
    assert "id" in user

def test_get_user(is_owner=False):
    user, headers = register_and_login()
    user_id = user["id"]
    response = client.get(f"/users/{user_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"

def test_get_users():
    # Register admin user (regular registration)
    admin_user, _ = register_and_login(
        username="adminuser",
        password="adminpassword",
        email="admin@example.com",
        is_owner=False
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
        "/login",
        json={"username": "adminuser", "password": "adminpassword"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # Register owner user
    user2, _ = register_and_login(
        username="testuser2",
        password="testpassword2",
        email="test2@example.com",
        is_owner=True
    )
    response = client.get("/users/", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    usernames = [user["username"] for user in data]
    assert "adminuser" in usernames
    assert "testuser2" in usernames

def test_update_user():
    user, headers = register_and_login(is_owner=True)
    user_id = user["id"]
    response = client.put(
        f"/users/{user_id}",
        json={
            "username": "testuser",
            "email": "updated@example.com",
            "full_name": "Updated User",
            "role": UserRole.OWNER.value
        },
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "updated@example.com"
    assert data["full_name"] == "Updated User"

def test_delete_user():
    user, headers = register_and_login(is_owner=True)
    user_id = user["id"]
    response = client.delete(f"/users/{user_id}", headers=headers)
    assert response.status_code == 200
    # Confirm user is deleted
    response = client.get(f"/users/{user_id}", headers=headers)
    assert response.status_code == 404

def test_register_with_existing_username():
    register_and_login(username="duplicateuser", email="unique1@example.com")
    response = client.post(
        "/users/register",
        json={
            "username": "duplicateuser",
            "email": "unique2@example.com",
            "full_name": "Test User",
            "password": "testpassword",
            "role": UserRole.OWNER.value
        }
    )
    assert response.status_code in (400, 409)

def test_register_with_existing_email():
    register_and_login(username="uniqueuser", email="duplicate@example.com")
    response = client.post(
        "/users/register",
        json={
            "username": "anotheruser",
            "email": "duplicate@example.com",
            "full_name": "Test User",
            "password": "testpassword",
            "role": UserRole.OWNER.value
        }
    )
    assert response.status_code in (400, 409)

def test_login_with_wrong_password():
    register_and_login(username="wrongpassuser", password="rightpassword", email="wrongpass@example.com")
    response = client.post(
        "/login",
        json={"username": "wrongpassuser", "password": "wrongpassword"}
    )
    assert response.status_code in (400, 401)

def test_get_user_unauthenticated():
    user, _ = register_and_login(username="unauthuser", email="unauth@example.com")
    user_id = user["id"]
    response = client.get(f"/users/{user_id}")
    assert response.status_code == 401

def test_update_user_unauthenticated():
    user, _ = register_and_login(username="unauthupdate", email="unauthupdate@example.com")
    user_id = user["id"]
    response = client.put(
        f"/users/{user_id}",
        json={
            "username": "unauthupdate",
            "email": "new@example.com",
            "full_name": "New Name",
            "role": UserRole.OWNER.value
        }
    )
    assert response.status_code == 401

def test_delete_user_unauthenticated():
    user, _ = register_and_login(username="unauthdelete", email="unauthdelete@example.com")
    user_id = user["id"]
    response = client.delete(f"/users/{user_id}")
    assert response.status_code == 401

def test_get_nonexistent_user():
    user, headers = register_and_login(username="nonexistent", email="nonexistent@example.com")
    response = client.get("/users/99999", headers=headers)
    assert response.status_code == 404

def test_update_nonexistent_user():
    user, headers = register_and_login(username="nonexistentupdate", email="nonexistentupdate@example.com")
    response = client.put(
        "/users/99999",
        json={
            "username": "doesnotexist",
            "email": "doesnotexist@example.com",
            "full_name": "No User",
            "role": UserRole.OWNER.value
        },
        headers=headers
    )
    assert response.status_code == 404

def test_delete_nonexistent_user():
    user, headers = register_and_login(username="nonexistentdelete", email="nonexistentdelete@example.com")
    response = client.delete("/users/99999", headers=headers)
    assert response.status_code == 404

def test_update_user_invalid_email():
    user, headers = register_and_login(username="invalidemail", email="invalidemail@example.com")
    user_id = user["id"]
    response = client.put(
        f"/users/{user_id}",
        json={
            "username": "invalidemail",
            "email": "not-an-email",
            "full_name": "Invalid Email",
            "role": UserRole.OWNER.value
        },
        headers=headers
    )
    assert response.status_code == 422

def test_delete_user_twice():
    user, headers = register_and_login(username="twicedelete", email="twicedelete@example.com")
    user_id = user["id"]
    response = client.delete(f"/users/{user_id}", headers=headers)
    assert response.status_code == 200
    response = client.delete(f"/users/{user_id}", headers=headers)
    assert response.status_code == 404

def test_update_another_user_forbidden():
    user1, headers1 = register_and_login(username="user1", email="user1@example.com")
    user2, headers2 = register_and_login(username="user2", email="user2@example.com")
    user1_id = user1["id"]
    response = client.put(
        f"/users/{user1_id}",
        json={
            "username": "user1",
            "email": "hacked@example.com",
            "full_name": "Hacker",
            "role": UserRole.OWNER.value
        },
        headers=headers2
    )
    assert response.status_code in (403, 404)

def test_list_users_admin_only():
    # Register regular user
    _, user_headers = register_and_login(username="user1", password="pw", email="user1@example.com")
    # Register owner
    _, owner_headers = register_and_login(username="owner1", password="pw", email="owner1@example.com", is_owner=True)
    # Register admin and patch role
    admin_user, _ = register_and_login(username="admin1", password="pw", email="admin1@example.com")
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