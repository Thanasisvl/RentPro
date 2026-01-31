import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./test_test.db"
from dotenv import load_dotenv
load_dotenv()

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine
from app.models.user import UserRole
from app.core.jwt import create_refresh_token

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_register_user_success():
    resp = client.post(
        "/users/register",
        json={
            "username": "newuser",
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "securepassword"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"

def test_register_user_existing_username():
    client.post(
        "/users/register",
        json={
            "username": "dupeuser",
            "email": "dupeuser1@example.com",
            "full_name": "Dupe User",
            "password": "password"
        }
    )
    resp = client.post(
        "/users/register",
        json={
            "username": "dupeuser",
            "email": "dupeuser2@example.com",
            "full_name": "Dupe User",
            "password": "password"
        }
    )
    assert resp.status_code in (400, 409)

def test_register_user_existing_email():
    client.post(
        "/users/register",
        json={
            "username": "uniqueuser",
            "email": "dupeemail@example.com",
            "full_name": "Dupe Email",
            "password": "password"
        }
    )
    resp = client.post(
        "/users/register",
        json={
            "username": "anotheruser",
            "email": "dupeemail@example.com",
            "full_name": "Dupe Email",
            "password": "password"
        }
    )
    assert resp.status_code in (400, 409)

def test_register_user_missing_fields():
    resp = client.post(
        "/users/register",
        json={
            "username": "incomplete"
            # Missing email, full_name, password
        }
    )
    assert resp.status_code == 422

def test_login_success():
    client.post(
        "/users/register",
        json={
            "username": "loginuser",
            "email": "loginuser@example.com",
            "full_name": "Login User",
            "password": "mypassword"
        }
    )
    resp = client.post(
        "/login",
        json={
            "username": "loginuser",
            "password": "mypassword"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data

def test_login_wrong_password():
    client.post(
        "/users/register",
        json={
            "username": "wrongpass",
            "email": "wrongpass@example.com",
            "full_name": "Wrong Pass",
            "password": "rightpassword"
        }
    )
    resp = client.post(
        "/login",
        json={
            "username": "wrongpass",
            "password": "wrongpassword"
        }
    )
    assert resp.status_code in (400, 401)

def test_login_nonexistent_user():
    resp = client.post(
        "/login",
        json={
            "username": "ghostuser",
            "password": "doesntmatter"
        }
    )
    assert resp.status_code in (400, 401)

def test_login_missing_fields():
    resp = client.post(
        "/login",
        json={
            "username": "nouser"
            # Missing password
        }
    )
    assert resp.status_code == 422

def test_refresh_ok():
    # create a real user first
    user_data = {
        "username": "refreshbasic",
        "password": "testpassword",
        "email": "refreshbasic@example.com",
        "full_name": "Refresh Basic",
    }
    resp_reg = client.post("/users/register", json=user_data)
    assert resp_reg.status_code == 200

    # create a refresh token for that username
    refresh = create_refresh_token("refreshbasic")
    client.cookies.set("refresh_token", refresh)

    r = client.post("/auth/refresh")
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"

def test_refresh_missing_cookie():
    client.cookies.clear()
    r = client.post("/auth/refresh")
    assert r.status_code == 401

def test_refresh_invalid_token():
    client.cookies.clear()
    client.cookies.set("refresh_token", "bad.token.value")
    r = client.post("/auth/refresh")
    assert r.status_code == 401

def test_refresh_access_token_success():
    # register user
    user_data = {
        "username": "refreshuser",
        "password": "testpassword",
        "email": "refresh@example.com",
        "full_name": "Refresh User",
    }
    resp_reg = client.post("/users/register", json=user_data)
    assert resp_reg.status_code == 200

    # login to get access token + refresh cookie
    resp_login = client.post(
        "/login",
        json={"username": "refreshuser", "password": "testpassword"},
    )
    assert resp_login.status_code == 200
    first_token = resp_login.json()["access_token"]
    assert first_token  # not empty

    # call /auth/refresh using same client (cookies preserved)
    resp_refresh = client.post("/auth/refresh")
    assert resp_refresh.status_code == 200
    data = resp_refresh.json()
    assert "access_token" in data
    assert data["access_token"]  # not empty


def test_refresh_access_token_missing_cookie():
    # new client without cookies
    from fastapi.testclient import TestClient
    from app.main import app

    no_cookie_client = TestClient(app)
    resp = no_cookie_client.post("/auth/refresh")
    assert resp.status_code == 401