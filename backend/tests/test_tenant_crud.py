import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./test_test.db"
from dotenv import load_dotenv
load_dotenv()

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine
from tests.utils import make_admin, register_and_login, seed_locked_criteria_for_tests, login_headers

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_locked_criteria_for_tests()

client = TestClient(app)

@pytest.fixture
def owner_headers_and_tenant_id():
    owner, headers = register_and_login(
        client, username="owner_tenant_1", password="testpassword", email="owner_tenant_1@example.com", is_owner=True
    )
    resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant One",
            "afm": "123456789",
            "phone": "1234567890",
            "email": "tenant1@example.com",
        },
        headers=headers
    )
    assert resp.status_code == 200, resp.text
    tenant_id = resp.json()["id"]
    return headers, tenant_id

def test_create_tenant_authenticated():
    _, headers = register_and_login(
        client, username="owner_tenant_2", password="testpassword", email="owner_tenant_2@example.com", is_owner=True
    )
    resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant Two",
            "afm": "987654321",
            "phone": "0987654321",
            "email": "tenant2@example.com",
        },
        headers=headers
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["name"] == "Tenant Two"
    assert data["afm"] == "987654321"

def test_get_tenant_authenticated(owner_headers_and_tenant_id):
    headers, tenant_id = owner_headers_and_tenant_id
    resp = client.get(f"/tenants/{tenant_id}", headers=headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == tenant_id

def test_get_tenants_authenticated(owner_headers_and_tenant_id):
    headers, _ = owner_headers_and_tenant_id
    resp = client.get("/tenants/", headers=headers)
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)

def test_update_tenant_authenticated(owner_headers_and_tenant_id):
    headers, tenant_id = owner_headers_and_tenant_id
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
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["name"] == "Updated Tenant"
    assert data["phone"] == "1112223333"
    assert data["email"] == "updated@example.com"

def test_delete_tenant_authenticated(owner_headers_and_tenant_id):
    headers, tenant_id = owner_headers_and_tenant_id
    resp = client.delete(f"/tenants/{tenant_id}", headers=headers)
    assert resp.status_code == 200, resp.text

    resp = client.get(f"/tenants/{tenant_id}", headers=headers)
    assert resp.status_code == 404

def test_create_tenant_unauthenticated():
    resp = client.post(
        "/tenants/",
        json={
            "name": "No Auth",
            "afm": "000000000",
            "phone": "0000000000",
            "email": "noauth@example.com",
        }
    )
    assert resp.status_code == 401

def test_create_tenant_missing_fields(owner_headers_and_tenant_id):
    headers, _ = owner_headers_and_tenant_id
    resp = client.post(
        "/tenants/",
        json={"name": "No AFM"},
        headers=headers
    )
    assert resp.status_code == 422

def test_create_tenant_invalid_afm():
    _, headers = register_and_login(
        client, username="owner_invalid_afm", password="testpassword", email="owner_invalid_afm@example.com", is_owner=True
    )
    resp = client.post(
        "/tenants/",
        json={
            "name": "Invalid AFM",
            "afm": "abc",
            "phone": "1234567890",
            "email": "invalidafm@example.com",
        },
        headers=headers
    )
    assert resp.status_code == 422

def test_get_tenants_unauthenticated():
    resp = client.get("/tenants/")
    assert resp.status_code == 401

def test_update_tenant_unauthenticated(owner_headers_and_tenant_id):
    _, tenant_id = owner_headers_and_tenant_id
    resp = client.put(
        f"/tenants/{tenant_id}",
        json={"name": "No Auth"},
    )
    assert resp.status_code == 401

def test_update_nonexistent_tenant(owner_headers_and_tenant_id):
    headers, _ = owner_headers_and_tenant_id
    resp = client.put("/tenants/99999", json={"name": "Ghost"}, headers=headers)
    assert resp.status_code == 404

def test_delete_nonexistent_tenant(owner_headers_and_tenant_id):
    headers, _ = owner_headers_and_tenant_id
    resp = client.delete("/tenants/99999", headers=headers)
    assert resp.status_code == 404

def test_cross_owner_tenant_access_and_admin_access():
    # Owner1 creates tenant
    _, owner1_headers = register_and_login(client, "owner_x1", "testpassword", "owner_x1@example.com", is_owner=True)
    t_resp = client.post(
        "/tenants/",
        json={"name": "Tenant X", "afm": "111222333", "phone": "123", "email": "x@example.com"},
        headers=owner1_headers
    )
    assert t_resp.status_code == 200, t_resp.text
    tenant_id = t_resp.json()["id"]

    # Owner2 cannot access
    _, owner2_headers = register_and_login(client, "owner_x2", "testpassword", "owner_x2@example.com", is_owner=True)
    assert client.get(f"/tenants/{tenant_id}", headers=owner2_headers).status_code in (403, 404)
    assert client.put(f"/tenants/{tenant_id}", json={"name": "Hacked"}, headers=owner2_headers).status_code in (403, 404)
    assert client.delete(f"/tenants/{tenant_id}", headers=owner2_headers).status_code in (403, 404)

    # Admin can access
    register_and_login(client, username="admin1", password="testpassword", email="admin1@example.com")
    make_admin("admin1")
    admin_headers = login_headers(client, "admin1", "testpassword")

    assert client.get(f"/tenants/{tenant_id}", headers=admin_headers).status_code == 200
    assert client.put(f"/tenants/{tenant_id}", json={"name": "Admin Updated"}, headers=admin_headers).status_code == 200
    assert client.delete(f"/tenants/{tenant_id}", headers=admin_headers).status_code == 200