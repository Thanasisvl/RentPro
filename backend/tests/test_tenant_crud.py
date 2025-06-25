import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./backend/test_test.db"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

client = TestClient(app)

def register_and_login(username="tenant1", password="testpassword", email="tenant1@example.com", role="TENANT"):
    resp = client.post(
        "/users/register",
        json={
            "username": username,
            "email": email,
            "full_name": "Tenant One",
            "password": password,
            "role": role
        }
    )
    assert resp.status_code == 200
    login_resp = client.post(
        "/login",
        json={"username": username, "password": password}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return resp.json(), headers

@pytest.fixture
def tenant_headers():
    user, headers = register_and_login()
    # Create tenant profile
    resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant One",
            "afm": "123456789",
            "phone": "1234567890",
            "email": "tenant1@example.com",
            "user_id": user["id"]
        },
        headers=headers
    )
    assert resp.status_code == 200
    tenant_id = resp.json()["id"]
    return headers, tenant_id

def test_create_tenant_authenticated():
    user, headers = register_and_login(username="tenant2", email="tenant2@example.com")
    resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant Two",
            "afm": "987654321",
            "phone": "0987654321",
            "email": "tenant2@example.com",
            "user_id": user["id"]
        },
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Tenant Two"
    assert data["afm"] == "987654321"

def test_get_tenant_authenticated(tenant_headers):
    headers, tenant_id = tenant_headers
    resp = client.get(f"/tenants/{tenant_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == tenant_id

def test_get_tenants_authenticated(tenant_headers):
    headers, _ = tenant_headers
    resp = client.get("/tenants/", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

def test_update_tenant_authenticated(tenant_headers):
    headers, tenant_id = tenant_headers
    resp = client.put(
        f"/tenants/{tenant_id}",
        json={
            "name": "Updated Tenant",
            "afm": "123456789",
            "phone": "1112223333",
            "email": "updated@example.com"
        },
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated Tenant"
    assert data["phone"] == "1112223333"
    assert data["email"] == "updated@example.com"

def test_delete_tenant_authenticated(tenant_headers):
    headers, tenant_id = tenant_headers
    resp = client.delete(f"/tenants/{tenant_id}", headers=headers)
    assert resp.status_code == 200
    # Confirm tenant is deleted
    resp = client.get(f"/tenants/{tenant_id}", headers=headers)
    assert resp.status_code == 403 or resp.status_code == 404

def test_create_tenant_unauthenticated():
    resp = client.post(
        "/tenants/",
        json={
            "name": "No Auth",
            "afm": "000000000",
            "phone": "0000000000",
            "email": "noauth@example.com",
            "user_id": 1
        }
    )
    assert resp.status_code == 401

def test_create_tenant_missing_fields(tenant_headers):
    headers, _ = tenant_headers
    resp = client.post(
        "/tenants/",
        json={
            "name": "No AFM"
            # Missing afm, phone, email
        },
        headers=headers
    )
    assert resp.status_code == 422

def test_create_tenant_invalid_afm(tenant_headers):
    headers, _ = tenant_headers
    resp = client.post(
        "/tenants/",
        json={
            "name": "Invalid AFM",
            "afm": "abc",
            "phone": "1234567890",
            "email": "invalidafm@example.com"
        },
        headers=headers
    )
    assert resp.status_code == 422

def test_get_tenants_unauthenticated():
    resp = client.get("/tenants/")
    assert resp.status_code == 401

def test_update_tenant_unauthenticated(tenant_headers):
    _, tenant_id = tenant_headers
    resp = client.put(
        f"/tenants/{tenant_id}",
        json={
            "name": "No Auth",
            "afm": "123456789",
            "phone": "1234567890",
            "email": "noauth@example.com"
        }
    )
    assert resp.status_code == 401

def test_update_nonexistent_tenant(tenant_headers):
    headers, _ = tenant_headers
    resp = client.put(
        "/tenants/99999",
        json={
            "name": "Ghost",
            "afm": "123456789",
            "phone": "1234567890",
            "email": "ghost@example.com"
        },
        headers=headers
    )
    assert resp.status_code == 404

def test_delete_nonexistent_tenant(tenant_headers):
    headers, _ = tenant_headers
    resp = client.delete("/tenants/99999", headers=headers)
    assert resp.status_code == 404