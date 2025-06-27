import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./backend/test_test.db"
from dotenv import load_dotenv
load_dotenv()

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine
from datetime import date, timedelta
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from tests.utils import make_admin

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

client = TestClient(app)

def register_and_login(username, password, email, is_owner=False):
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

@pytest.fixture
def owner_and_property():
    user, headers, property_id = register_and_login("owner1", "testpassword", "owner1@example.com", is_owner=True)
    return user, headers, property_id

@pytest.fixture
def tenant_and_profile():
    user, headers, _ = register_and_login("tenant1", "testpassword", "tenant1@example.com", is_owner=False)
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
    return user, headers, tenant_id

@pytest.fixture
def contract_id(owner_and_property, tenant_and_profile):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = tenant_and_profile
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

def test_create_contract(owner_and_property, tenant_and_profile):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = tenant_and_profile
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

def test_get_contract(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property
    resp = client.get(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 200
    contract = resp.json()
    assert contract["id"] == contract_id

def test_get_contracts(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property
    resp = client.get("/contracts/", headers=owner_headers)
    assert resp.status_code == 200
    contracts = resp.json()
    assert isinstance(contracts, list)
    assert any(c["id"] == contract_id for c in contracts)

def test_update_contract(owner_and_property, contract_id, tenant_and_profile):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = tenant_and_profile
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

def test_delete_contract(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property
    resp = client.delete(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 200
    # Should not be found after deletion
    resp = client.get(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 404

def test_update_contract_not_found(owner_and_property, tenant_and_profile):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = tenant_and_profile
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

def test_delete_contract_not_found(owner_and_property):
    _, owner_headers, _ = owner_and_property
    resp = client.delete("/contracts/99999", headers=owner_headers)
    assert resp.status_code == 404

def test_cross_user_contract_access(owner_and_property, tenant_and_profile):
    # Owner1 creates contract
    _, owner1_headers, property_id = owner_and_property
    _, _, tenant_id = tenant_and_profile
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
        headers=owner1_headers
    )
    contract_id = resp.json()["id"]

    # Owner2 tries to access
    _, owner2_headers, _ = register_and_login("owner2", "pw", "owner2@example.com", is_owner=True)
    assert client.get(f"/contracts/{contract_id}", headers=owner2_headers).status_code in (403, 404)
    assert client.put(f"/contracts/{contract_id}", json={
        "property_id": property_id,
        "tenant_id": tenant_id,
        "start_date": today,
        "end_date": end_date,
        "rent_amount": 1300.0,
        "pdf_file": "updated_contract.pdf"
    }, headers=owner2_headers).status_code in (403, 404)
    assert client.delete(f"/contracts/{contract_id}", headers=owner2_headers).status_code in (403, 404)

    # Admin can access
    _, admin_headers, _ = register_and_login("admin2", "pw", "admin2@example.com")
    make_admin("admin2")
    login_resp = client.post("/login", json={"username": "admin2", "password": "pw"})
    admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    assert client.get(f"/contracts/{contract_id}", headers=admin_headers).status_code == 200
    assert client.put(f"/contracts/{contract_id}", json={
        "property_id": property_id,
        "tenant_id": tenant_id,
        "start_date": today,
        "end_date": end_date,
        "rent_amount": 1400.0,
        "pdf_file": "admin_updated_contract.pdf"
    }, headers=admin_headers).status_code == 200
    assert client.delete(f"/contracts/{contract_id}", headers=admin_headers).status_code == 200