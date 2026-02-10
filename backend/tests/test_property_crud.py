from __future__ import annotations

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from starlette.status import HTTP_422_UNPROCESSABLE_CONTENT

from app.db.session import SessionLocal
from app.main import app
from app.models.contract import Contract, ContractStatus
from tests.utils import (
    make_admin,
    register_and_login,
    set_property_status,
)

# NOTE:
# - Do NOT set os.environ / load_dotenv here.
# - tests/conftest.py is responsible for env setup.


client = TestClient(app)


@pytest.fixture
def owner_headers():
    _, headers = register_and_login(
        client, "owner1", "testpassword", "owner1@example.com", is_owner=True
    )
    return headers


def test_create_property(owner_headers):
    resp = client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 100.0,
            "price": 1200.0,
        },
        headers=owner_headers,
    )
    assert resp.status_code == 200
    prop = resp.json()
    assert prop["type"] == "APARTMENT"
    assert prop["address"] == "123 Main St"
    assert prop["size"] == 100.0
    assert prop["price"] == 1200.0


def test_get_property(owner_headers):
    # Create property first
    resp = client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 100.0,
            "price": 1200.0,
        },
        headers=owner_headers,
    )
    prop = resp.json()
    prop_id = prop["id"]
    response = client.get(f"/properties/{prop_id}", headers=owner_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Property"
    assert data["id"] == prop_id


def test_get_properties(owner_headers):
    # Create two properties
    client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 100.0,
            "price": 1200.0,
        },
        headers=owner_headers,
    )
    client.post(
        "/properties/",
        json={
            "title": "Second Property",
            "description": "Another place",
            "address": "456 Side St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "DETACHED_HOUSE",
            "size": 150.0,
            "price": 2000.0,
        },
        headers=owner_headers,
    )
    response = client.get("/properties/", headers=owner_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    titles = [p["title"] for p in data]
    assert "Test Property" in titles
    assert "Second Property" in titles


def test_update_property(owner_headers):
    # Create property first
    resp = client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 100.0,
            "price": 1200.0,
        },
        headers=owner_headers,
    )
    prop = resp.json()
    prop_id = prop["id"]
    response = client.put(
        f"/properties/{prop_id}",
        json={
            "title": "Updated Property",
            "description": "Updated description",
            "address": "789 New St",
            "type": "STUDIO",
            "size": 80.0,
            "price": 900.0,
        },
        headers=owner_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Property"
    assert data["address"] == "789 New St"
    assert data["type"] == "STUDIO"
    assert data["size"] == 80.0
    assert data["price"] == 900.0


def test_delete_property(owner_headers):
    # Create property first
    resp = client.post(
        "/properties/",
        json={
            "title": "Test Property",
            "description": "A nice place",
            "address": "123 Main St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 100.0,
            "price": 1200.0,
        },
        headers=owner_headers,
    )
    prop = resp.json()
    prop_id = prop["id"]
    response = client.delete(f"/properties/{prop_id}", headers=owner_headers)
    assert response.status_code == 200
    # Confirm property is deleted
    response = client.get(f"/properties/{prop_id}", headers=owner_headers)
    assert response.status_code == 404


def test_create_property_missing_fields(owner_headers):
    resp = client.post(
        "/properties/",
        json={
            "title": "Incomplete Property"
            # Missing description, address, type, size, price
        },
        headers=owner_headers,
    )
    assert resp.status_code == HTTP_422_UNPROCESSABLE_CONTENT


def test_get_properties_unauthenticated():
    resp = client.get("/properties/")
    assert resp.status_code == 401


def test_create_property_unauthenticated():
    resp = client.post(
        "/properties/",
        json={
            "title": "No Auth",
            "description": "No Auth",
            "address": "No Auth",
            "area_id": 11,
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
    )
    assert resp.status_code == 401


def test_update_nonexistent_property(owner_headers):
    resp = client.put(
        "/properties/99999",
        json={
            "title": "Does Not Exist",
            "description": "Nope",
            "address": "Nowhere",
            "type": "DETACHED_HOUSE",
            "size": 100.0,
            "price": 1000.0,
        },
        headers=owner_headers,
    )
    assert resp.status_code == 404


def test_delete_nonexistent_property(owner_headers):
    resp = client.delete("/properties/99999", headers=owner_headers)
    assert resp.status_code == 404


def test_update_property_invalid_data(owner_headers):
    # Create property first
    resp = client.post(
        "/properties/",
        json={
            "title": "To Update",
            "description": "desc",
            "address": "addr",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 100.0,
            "price": 1200.0,
        },
        headers=owner_headers,
    )
    prop_id = resp.json()["id"]
    # Try to update with invalid data
    resp = client.put(
        f"/properties/{prop_id}",
        json={
            "title": "Invalid Update",
            "description": "desc",
            "address": "addr",
            "type": "APARTMENT",
            "size": -10.0,
            "price": -500.0,
        },
        headers=owner_headers,
    )
    assert resp.status_code == HTTP_422_UNPROCESSABLE_CONTENT


def test_update_property_not_owner(owner_headers):
    # Create property as owner1
    resp = client.post(
        "/properties/",
        json={
            "title": "Owner1 Property",
            "description": "desc",
            "address": "addr",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 100.0,
            "price": 1200.0,
        },
        headers=owner_headers,
    )
    prop_id = resp.json()["id"]
    # Register and login as another user
    _, other_headers = register_and_login(
        client,
        username="owner2",
        password="testpassword",
        email="owner2@example.com",
        is_owner=True,
    )
    # Try to update property as owner2
    resp = client.put(
        f"/properties/{prop_id}",
        json={
            "title": "Hacked",
            "description": "desc",
            "address": "addr",
            "type": "APARTMENT",
            "size": 100.0,
            "price": 1200.0,
        },
        headers=other_headers,
    )
    assert resp.status_code in (403, 404)


def test_cross_user_property_access(owner_headers):
    # Owner1 creates property
    resp = client.post(
        "/properties/",
        json={
            "title": "Owner1 Property",
            "description": "desc",
            "address": "addr",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 100.0,
            "price": 1200.0,
        },
        headers=owner_headers,
    )
    assert resp.status_code == 200, resp.text
    prop_id = resp.json()["id"]

    # Create tenant (needed for contract FK)
    tenant_resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant For Rent",
            "afm": "123456789",
            "phone": "2100000000",
            "email": "tenant_rent@example.com",
        },
        headers=owner_headers,
    )
    assert tenant_resp.status_code == 200, tenant_resp.text
    tenant_id = tenant_resp.json()["id"]

    # Make it non-public the correct way: create a running ACTIVE contract.
    # This ensures sync-on-access keeps the property in RENTED state.
    db = SessionLocal()
    try:
        db.add(
            Contract(
                property_id=prop_id,
                tenant_id=tenant_id,
                start_date=date.today() - timedelta(days=10),
                end_date=date.today() + timedelta(days=10),
                rent_amount=1200.0,
                status=ContractStatus.ACTIVE,
            )
        )
        db.commit()
    finally:
        db.close()

    # Optional: keep (doesn't hurt), but contract is what makes it truly non-public now
    set_property_status(prop_id, "RENTED")

    # Register and login as another owner
    _, other_headers = register_and_login(
        client,
        username="owner2",
        password="testpassword",
        email="owner2@example.com",
        is_owner=True,
    )

    # Try to GET/UPDATE/DELETE as owner2
    assert client.get(f"/properties/{prop_id}", headers=other_headers).status_code in (
        403,
        404,
    )
    assert client.put(
        f"/properties/{prop_id}",
        json={
            "title": "Hacked",
            "description": "desc",
            "address": "addr",
            "type": "APARTMENT",
            "size": 100.0,
            "price": 1200.0,
        },
        headers=other_headers,
    ).status_code in (403, 404)
    assert client.delete(
        f"/properties/{prop_id}", headers=other_headers
    ).status_code in (403, 404)

    # Admin can access
    _, _ = register_and_login(
        client, username="admin1", password="testpassword", email="admin1@example.com"
    )
    make_admin("admin1")
    login_resp = client.post(
        "/login", json={"username": "admin1", "password": "testpassword"}
    )
    admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    assert (
        client.get(f"/properties/{prop_id}", headers=admin_headers).status_code == 200
    )
    assert (
        client.put(
            f"/properties/{prop_id}",
            json={
                "title": "Admin Updated",
                "description": "desc",
                "address": "addr",
                "type": "APARTMENT",
                "size": 100.0,
                "price": 1200.0,
            },
            headers=admin_headers,
        ).status_code
        == 200
    )

    # While there is an ACTIVE contract, delete should fail (policy)
    assert client.delete(
        f"/properties/{prop_id}", headers=admin_headers
    ).status_code in (
        400,
        409,
    )

    # Make property deletable:
    # 1) Expire the contract
    # 2) Remove contract row(s) for this property (if API requires no contracts at all)
    db = SessionLocal()
    try:
        contract = db.query(Contract).filter(Contract.property_id == prop_id).first()
        assert contract is not None
        contract.status = ContractStatus.EXPIRED
        contract.end_date = date.today() - timedelta(days=1)
        db.commit()

        db.query(Contract).filter(Contract.property_id == prop_id).delete(
            synchronize_session=False
        )
        db.commit()
    finally:
        db.close()

    set_property_status(prop_id, "AVAILABLE")

    assert (
        client.delete(f"/properties/{prop_id}", headers=admin_headers).status_code
        == 200
    )


def test_admin_create_property_for_owner_success():
    # Create target OWNER
    owner, _ = register_and_login(
        client,
        "owner_target",
        "testpassword",
        "owner_target@example.com",
        is_owner=True,
    )

    # Create ADMIN
    _, _ = register_and_login(
        client,
        "admin_creator",
        "testpassword",
        "admin_creator@example.com",
        is_owner=False,
    )
    make_admin("admin_creator")

    login_resp = client.post(
        "/login", json={"username": "admin_creator", "password": "testpassword"}
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post(
        "/properties/",
        json={
            "title": "Admin Created Property",
            "description": "Created on behalf of owner",
            "address": "999 Admin St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 55.0,
            "price": 1500.0,
            "owner_id": owner["id"],
        },
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["owner_id"] == owner["id"]
    assert data["title"] == "Admin Created Property"


def test_admin_create_property_missing_owner_id_returns_422():
    _, _ = register_and_login(
        client,
        "admin_missing_owner",
        "testpassword",
        "admin_missing_owner@example.com",
        is_owner=False,
    )
    make_admin("admin_missing_owner")

    login_resp = client.post(
        "/login", json={"username": "admin_missing_owner", "password": "testpassword"}
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post(
        "/properties/",
        json={
            "title": "Missing owner_id",
            "description": "Admin must provide owner_id",
            "address": "1 Missing St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=admin_headers,
    )
    assert resp.status_code == HTTP_422_UNPROCESSABLE_CONTENT


def test_admin_create_property_owner_not_found_returns_404():
    _, _ = register_and_login(
        client,
        "admin_owner_not_found",
        "testpassword",
        "admin_owner_not_found@example.com",
        is_owner=False,
    )
    make_admin("admin_owner_not_found")

    login_resp = client.post(
        "/login", json={"username": "admin_owner_not_found", "password": "testpassword"}
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post(
        "/properties/",
        json={
            "title": "Bad owner_id",
            "description": "Should fail",
            "address": "404 St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "DETACHED_HOUSE",
            "size": 70.0,
            "price": 1100.0,
            "owner_id": 999999,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 404


def test_admin_create_property_owner_id_must_point_to_owner_returns_422():
    # Create a plain USER (not OWNER)
    non_owner, _ = register_and_login(
        client, "plain_user1", "testpassword", "plain_user1@example.com", is_owner=False
    )

    # Create ADMIN
    _, _ = register_and_login(
        client,
        "admin_wrong_owner_role",
        "testpassword",
        "admin_wrong_owner_role@example.com",
        is_owner=False,
    )
    make_admin("admin_wrong_owner_role")

    login_resp = client.post(
        "/login",
        json={"username": "admin_wrong_owner_role", "password": "testpassword"},
    )
    assert login_resp.status_code == 200
    admin_token = login_resp.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    resp = client.post(
        "/properties/",
        json={
            "title": "Wrong owner role",
            "description": "owner_id points to a non-owner",
            "address": "422 St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 60.0,
            "price": 1300.0,
            "owner_id": non_owner["id"],
        },
        headers=admin_headers,
    )
    assert resp.status_code == HTTP_422_UNPROCESSABLE_CONTENT


def test_owner_cannot_create_property_for_other_owner():
    owner1, owner1_headers = register_and_login(
        client, "owner_a", "testpassword", "owner_a@example.com", is_owner=True
    )
    owner2, _ = register_and_login(
        client, "owner_b", "testpassword", "owner_b@example.com", is_owner=True
    )

    resp = client.post(
        "/properties/",
        json={
            "title": "Should Fail",
            "description": "Owner cannot create for other owner",
            "address": "Forbidden St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 45.0,
            "price": 900.0,
            "owner_id": owner2["id"],
        },
        headers=owner1_headers,
    )
    assert resp.status_code == 403


def test_owner_create_property_with_owner_id_self_is_allowed():
    owner, owner_headers = register_and_login(
        client, "owner_self", "testpassword", "owner_self@example.com", is_owner=True
    )

    resp = client.post(
        "/properties/",
        json={
            "title": "Self owner_id",
            "description": "Owner sends owner_id=self",
            "address": "Self St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 40.0,
            "price": 800.0,
            "owner_id": owner["id"],
        },
        headers=owner_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["owner_id"] == owner["id"]
    assert data["title"] == "Self owner_id"


def test_create_property_invalid_data(owner_headers):
    resp = client.post(
        "/properties/",
        json={
            "title": "Invalid Property",
            "description": "Negative size",
            "address": "123 Main St",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": -50.0,
            "price": -100.0,
        },
        headers=owner_headers,
    )
    assert resp.status_code == HTTP_422_UNPROCESSABLE_CONTENT


def test_create_property_rejects_blank_strings_after_strip(owner_headers):
    # title/address/type are required and must not be blank after stripping whitespace
    resp = client.post(
        "/properties/",
        json={
            "title": "   ",
            "description": "desc",
            "address": "  ",
            "area_id": 11,  # ATHENS (seeded)
            "type": "\t",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=owner_headers,
    )
    assert resp.status_code == HTTP_422_UNPROCESSABLE_CONTENT
