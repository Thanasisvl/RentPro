import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./test_test.db"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
from dotenv import load_dotenv
load_dotenv()

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine
from datetime import date, timedelta
from tests.utils import make_admin, register_and_login, login_headers, seed_locked_criteria_for_tests

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_locked_criteria_for_tests()

client = TestClient(app)

@pytest.fixture
def owner_and_property():
    user, headers = register_and_login(client, "owner1", "testpassword", "owner1@example.com", is_owner=True)

    resp = client.post(
        "/properties/",
        json={
            "title": "Initial Property",
            "description": "Initial property",
            "address": "1 Owner St",
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    property_id = resp.json()["id"]

    return user, headers, property_id

@pytest.fixture
def owner_tenant(owner_and_property):
    owner, owner_headers, _ = owner_and_property
    resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant One",
            "afm": "123456789",
            "phone": "1234567890",
            "email": "tenant1@example.com",
        },
        headers=owner_headers
    )
    assert resp.status_code == 200, resp.text
    return owner, owner_headers, resp.json()["id"]

@pytest.fixture
def contract_id(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant
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
            # pdf_file optional
        },
        headers=owner_headers
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]

def test_create_contract(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant
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
        },
        headers=owner_headers
    )
    assert resp.status_code == 200, resp.text
    contract = resp.json()
    assert contract["property_id"] == property_id
    assert contract["tenant_id"] == tenant_id
    assert contract["rent_amount"] == 1200.0

def test_get_contract(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property
    resp = client.get(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["id"] == contract_id

def test_get_contracts(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property
    resp = client.get("/contracts/", headers=owner_headers)
    assert resp.status_code == 200, resp.text
    assert any(c["id"] == contract_id for c in resp.json())

def test_update_contract(owner_and_property, contract_id, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant
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
    assert resp.status_code == 200, resp.text
    contract = resp.json()
    assert contract["rent_amount"] == 1300.0
    assert contract["pdf_file"] == "updated_contract.pdf"

def test_delete_contract(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property
    resp = client.delete(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 200, resp.text
    resp = client.get(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 404

def test_update_contract_not_found(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant
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

def test_cross_user_contract_access(owner_and_property, owner_tenant):
    # Owner1 creates contract
    _, owner1_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant
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
        },
        headers=owner1_headers
    )
    assert resp.status_code == 200, resp.text
    contract_id = resp.json()["id"]

    # Owner2 cannot access
    _, owner2_headers = register_and_login(client, "owner2", "pw", "owner2@example.com", is_owner=True)
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
    register_and_login(client, "admin2", "pw", "admin2@example.com")
    make_admin("admin2")
    admin_headers = login_headers(client, "admin2", "pw")

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

def test_contract_negative_zero_rent(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    resp_zero = client.post(
        "/contracts/",
        json={"property_id": property_id, "tenant_id": tenant_id, "start_date": today, "end_date": end_date, "rent_amount": 0.0},
        headers=owner_headers
    )
    assert resp_zero.status_code in (400, 422)

    resp_negative = client.post(
        "/contracts/",
        json={"property_id": property_id, "tenant_id": tenant_id, "start_date": today, "end_date": end_date, "rent_amount": -100.0},
        headers=owner_headers
    )
    assert resp_negative.status_code in (400, 422)

def test_contract_invalid_dates(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant
    today = str(date.today())
    yesterday = str(date.today() - timedelta(days=1))

    resp = client.post(
        "/contracts/",
        json={"property_id": property_id, "tenant_id": tenant_id, "start_date": today, "end_date": yesterday, "rent_amount": 1200.0},
        headers=owner_headers
    )
    assert resp.status_code in (400, 422)

def test_property_status_becomes_rented_on_contract_creation(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant

    prop_before = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_before.status_code == 200
    assert prop_before.json()["status"] == "AVAILABLE"

    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    resp = client.post(
        "/contracts/",
        json={"property_id": property_id, "tenant_id": tenant_id, "start_date": today, "end_date": end_date, "rent_amount": 1200.0},
        headers=owner_headers,
    )
    assert resp.status_code == 200, resp.text

    prop_after = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_after.status_code == 200
    assert prop_after.json()["status"] == "RENTED"

def test_property_status_becomes_available_on_contract_deletion(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant

    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    create_resp = client.post(
        "/contracts/",
        json={"property_id": property_id, "tenant_id": tenant_id, "start_date": today, "end_date": end_date, "rent_amount": 1200.0},
        headers=owner_headers,
    )
    assert create_resp.status_code == 200, create_resp.text
    contract_id = create_resp.json()["id"]

    prop_rented = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_rented.status_code == 200
    assert prop_rented.json()["status"] == "RENTED"

    del_resp = client.delete(f"/contracts/{contract_id}", headers=owner_headers)
    assert del_resp.status_code == 200, del_resp.text

    prop_available = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_available.status_code == 200
    assert prop_available.json()["status"] == "AVAILABLE"

def test_cannot_create_contract_when_property_already_rented(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant

    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    resp1 = client.post(
        "/contracts/",
        json={"property_id": property_id, "tenant_id": tenant_id, "start_date": today, "end_date": end_date, "rent_amount": 1200.0},
        headers=owner_headers,
    )
    assert resp1.status_code == 200

    resp2 = client.post(
        "/contracts/",
        json={"property_id": property_id, "tenant_id": tenant_id, "start_date": today, "end_date": end_date, "rent_amount": 1300.0},
        headers=owner_headers,
    )
    assert resp2.status_code == 409

def test_admin_can_list_all_properties_from_properties_endpoint():
    # Owner1 creates property
    _, owner1_headers = register_and_login(client, "owner_admin_list_1", "testpassword", "oal1@example.com", is_owner=True)
    resp1 = client.post(
        "/properties/",
        json={
            "title": "Owner1 Property",
            "description": "desc",
            "address": "addr1",
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=owner1_headers,
    )
    assert resp1.status_code == 200

    # Owner2 creates property
    _, owner2_headers = register_and_login(client, "owner_admin_list_2", "testpassword", "oal2@example.com", is_owner=True)
    resp2 = client.post(
        "/properties/",
        json={
            "title": "Owner2 Property",
            "description": "desc",
            "address": "addr2",
            "type": "DETACHED_HOUSE",
            "size": 60.0,
            "price": 1100.0,
        },
        headers=owner2_headers,
    )
    assert resp2.status_code == 200

    # Admin lists all via /properties
    register_and_login(client, "admin_list", "testpassword", "admin_list@example.com", is_owner=False)
    make_admin("admin_list")
    admin_headers = login_headers(client, "admin_list", "testpassword")

    resp = client.get("/properties/", headers=admin_headers)
    assert resp.status_code == 200
    titles = [p["title"] for p in resp.json()]
    assert "Owner1 Property" in titles
    assert "Owner2 Property" in titles

def test_terminate_contract_sets_property_available_and_contract_terminated(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant

    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    create_resp = client.post(
        "/contracts/",
        json={"property_id": property_id, "tenant_id": tenant_id, "start_date": today, "end_date": end_date, "rent_amount": 1200.0},
        headers=owner_headers,
    )
    assert create_resp.status_code == 200, create_resp.text
    contract_id = create_resp.json()["id"]

    prop_rented = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_rented.status_code == 200
    assert prop_rented.json()["status"] == "RENTED"

    term_resp = client.post(f"/contracts/{contract_id}/terminate", headers=owner_headers)
    assert term_resp.status_code == 200, term_resp.text
    assert term_resp.json()["status"] == "TERMINATED"

    prop_available = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_available.status_code == 200
    assert prop_available.json()["status"] == "AVAILABLE"