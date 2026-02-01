import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./test_test.db"
from dotenv import load_dotenv
load_dotenv()

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine
from tests.utils import make_admin, register_and_login

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

client = TestClient(app)

@pytest.fixture
def tenant_headers():
    user, headers = register_and_login(
        client, username="tenant1", password="testpassword", email="tenant1@example.com"
    )
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
    user, headers = register_and_login(client, username="tenant2", password="testpassword", email="tenant2@example.com")
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

def test_create_tenant_invalid_afm():
    # fresh user WITHOUT existing tenant profile
    user, headers = register_and_login(
        client, username="tenant_invalid_afm", password="testpassword", email="tenant_invalid_afm@example.com"
    )

    resp = client.post(
        "/tenants/",
        json={
            "name": "Invalid AFM",
            "afm": "abc",  # invalid: should be 9 digits
            "phone": "1234567890",
            "email": "invalidafm@example.com",
            # no user_id: server derives it from token
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

def test_cross_user_tenant_access():
    # Tenant1 creates profile
    user1, headers1 = register_and_login(client, username="tenant1", password="testpassword", email="tenant1@example.com")
    resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant One",
            "afm": "123456789",
            "phone": "1234567890",
            "email": "tenant1@example.com",
            "user_id": user1["id"]
        },
        headers=headers1
    )
    tenant_id = resp.json()["id"]

    # Tenant2 tries to access
    user2, headers2 = register_and_login(client, username="tenant2", password="testpassword", email="tenant2@example.com")
    assert client.get(f"/tenants/{tenant_id}", headers=headers2).status_code in (403, 404)
    assert client.put(f"/tenants/{tenant_id}", json={
        "name": "Hacked",
        "afm": "123456789",
        "phone": "1234567890",
        "email": "tenant1@example.com"
    }, headers=headers2).status_code in (403, 404)
    assert client.delete(f"/tenants/{tenant_id}", headers=headers2).status_code in (403, 404)

    # Admin can access
    _, admin_headers = register_and_login(client, username="admin1", password="testpassword", email="admin1@example.com")
    make_admin("admin1")
    login_resp = client.post("/login", json={"username": "admin1", "password": "testpassword"})
    admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    assert client.get(f"/tenants/{tenant_id}", headers=admin_headers).status_code == 200
    assert client.put(f"/tenants/{tenant_id}", json={
        "name": "Admin Updated",
        "afm": "123456789",
        "phone": "1234567890",
        "email": "tenant1@example.com"
    }, headers=admin_headers).status_code == 200
    assert client.delete(f"/tenants/{tenant_id}", headers=admin_headers).status_code == 200