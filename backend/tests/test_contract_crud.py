import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./backend/test_test.db"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine
from datetime import date, timedelta

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

client = TestClient(app)

def register_and_login(username, password, email, role):
    # Register user
    resp = client.post(
        "/users/register",
        json={
            "username": username,
            "email": email,
            "full_name": username.title(),
            "password": password,
            "role": role
        }
    )
    assert resp.status_code == 200
    # Login user
    login_resp = client.post(
        "/login",
        json={"username": username, "password": password}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return resp.json(), headers

@pytest.fixture
def owner_headers():
    _, headers = register_and_login("owner1", "testpassword", "owner1@example.com", "OWNER")
    return headers

@pytest.fixture
def tenant_headers():
    user, headers = register_and_login("tenant1", "testpassword", "tenant1@example.com", "TENANT")
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
    return headers

@pytest.fixture
def property_id(owner_headers):
    resp = client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "type": "Apartment",
            "size": 100.0,
            "price": 1200.0
        },
        headers=owner_headers
    )
    assert resp.status_code == 200
    return resp.json()["id"]

@pytest.fixture
def tenant_id(tenant_headers):
    resp = client.get("/tenants/", headers=tenant_headers)
    assert resp.status_code == 200
    return resp.json()[0]["id"]

@pytest.fixture
def contract_id(owner_headers, property_id, tenant_id):
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))
    resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1200.0,
            "pdf_file": "contract1.pdf"
        },
        headers=owner_headers
    )
    assert resp.status_code == 200
    return resp.json()["id"]

def test_create_contract(owner_headers, property_id, tenant_id):
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))
    resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1200.0,
            "pdf_file": "contract1.pdf"
        },
        headers=owner_headers
    )
    assert resp.status_code == 200
    contract = resp.json()
    assert contract["property_id"] == property_id
    assert contract["tenant_id"] == tenant_id
    assert contract["rent_amount"] == 1200.0
    assert contract["pdf_file"] == "contract1.pdf"

def test_get_contract(owner_headers, contract_id):
    resp = client.get(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 200
    contract = resp.json()
    assert contract["id"] == contract_id

def test_get_contracts(owner_headers, contract_id):
    resp = client.get("/contracts/", headers=owner_headers)
    assert resp.status_code == 200
    contracts = resp.json()
    assert isinstance(contracts, list)
    assert any(c["id"] == contract_id for c in contracts)

def test_update_contract(owner_headers, contract_id, property_id, tenant_id):
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))
    resp = client.put(
        f"/contracts/{contract_id}",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1300.0,
            "pdf_file": "updated_contract.pdf"
        },
        headers=owner_headers
    )
    assert resp.status_code == 200
    contract = resp.json()
    assert contract["rent_amount"] == 1300.0
    assert contract["pdf_file"] == "updated_contract.pdf"

def test_delete_contract(owner_headers, contract_id):
    resp = client.delete(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 200
    # Should not be found after deletion
    resp = client.get(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 404

def test_update_contract_not_found(owner_headers, property_id, tenant_id):
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))
    resp = client.put(
        "/contracts/99999",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1500.0,
            "pdf_file": None
        },
        headers=owner_headers
    )
    assert resp.status_code == 404

def test_delete_contract_not_found(owner_headers):
    resp = client.delete("/contracts/99999", headers=owner_headers)
    assert resp.status_code == 404