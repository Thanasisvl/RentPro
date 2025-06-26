import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./backend/test_test.db"
from dotenv import load_dotenv
load_dotenv()

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine

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
            "password": "securepassword",
            "role": "TENANT"
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
            "password": "password",
            "role": "TENANT"
        }
    )
    resp = client.post(
        "/users/register",
        json={
            "username": "dupeuser",
            "email": "dupeuser2@example.com",
            "full_name": "Dupe User",
            "password": "password",
            "role": "TENANT"
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
            "password": "password",
            "role": "TENANT"
        }
    )
    resp = client.post(
        "/users/register",
        json={
            "username": "anotheruser",
            "email": "dupeemail@example.com",
            "full_name": "Dupe Email",
            "password": "password",
            "role": "TENANT"
        }
    )
    assert resp.status_code in (400, 409)

def test_register_user_missing_fields():
    resp = client.post(
        "/users/register",
        json={
            "username": "incomplete"
            # Missing email, full_name, password, role
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
            "password": "mypassword",
            "role": "TENANT"
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
            "password": "rightpassword",
            "role": "TENANT"
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