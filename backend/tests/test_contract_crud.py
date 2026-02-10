from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.utils import (
    login_headers,
    make_admin,
    register_and_login,
)

client = TestClient(app)


@pytest.fixture
def owner_and_property():
    user, headers = register_and_login(
        client, "owner1", "testpassword", "owner1@example.com", is_owner=True
    )

    resp = client.post(
        "/properties/",
        json={
            "title": "Initial Property",
            "description": "Initial property",
            "address": "1 Owner St",
            "area_id": 11,  # ATHENS (seeded)
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
        headers=owner_headers,
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
        headers=owner_headers,
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
        headers=owner_headers,
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


def test_update_contract(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    resp = client.put(
        f"/contracts/{contract_id}",
        json={
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1300.0,
        },
        headers=owner_headers,
    )
    assert resp.status_code == 200, resp.text
    contract = resp.json()
    assert contract["rent_amount"] == 1300.0
    # pdf_file is NOT updatable via PUT (upload endpoint only)
    assert contract.get("pdf_file") in (None, "")


def test_update_contract_rejects_pdf_file(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    resp = client.put(
        f"/contracts/{contract_id}",
        json={
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1300.0,
            "pdf_file": "updated_contract.pdf",
        },
        headers=owner_headers,
    )
    assert resp.status_code == 409, resp.text
    assert "pdf_file" in resp.text


def test_delete_contract(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property

    # terminate first (policy: cannot delete ACTIVE)
    term_resp = client.post(
        f"/contracts/{contract_id}/terminate", headers=owner_headers
    )
    assert term_resp.status_code == 200, term_resp.text

    # now delete
    resp = client.delete(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 200, resp.text

    resp = client.get(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 404


def test_update_contract_not_found(owner_and_property, owner_tenant):
    _, owner_headers, _ = owner_and_property
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    resp = client.put(
        "/contracts/99999",
        json={
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1500.0,
        },
        headers=owner_headers,
    )
    assert resp.status_code == 404, resp.text


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
        headers=owner1_headers,
    )
    assert resp.status_code == 200, resp.text
    contract_id = resp.json()["id"]

    # Owner2 cannot access
    _, owner2_headers = register_and_login(
        client, "owner2", "pw", "owner2@example.com", is_owner=True
    )
    assert client.get(
        f"/contracts/{contract_id}", headers=owner2_headers
    ).status_code in (403, 404)
    assert client.put(
        f"/contracts/{contract_id}",
        json={
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1300.0,
        },
        headers=owner2_headers,
    ).status_code in (403, 404)
    assert client.delete(
        f"/contracts/{contract_id}", headers=owner2_headers
    ).status_code in (403, 404)

    # Admin can access
    register_and_login(client, "admin2", "pw", "admin2@example.com")
    make_admin("admin2")
    admin_headers = login_headers(client, "admin2", "pw")

    assert (
        client.get(f"/contracts/{contract_id}", headers=admin_headers).status_code
        == 200
    )
    assert (
        client.put(
            f"/contracts/{contract_id}",
            json={
                "start_date": today,
                "end_date": end_date,
                "rent_amount": 1400.0,
            },
            headers=admin_headers,
        ).status_code
        == 200
    )

    # Policy: cannot delete ACTIVE; terminate first then delete
    term = client.post(f"/contracts/{contract_id}/terminate", headers=admin_headers)
    assert term.status_code == 200, term.text

    assert (
        client.delete(f"/contracts/{contract_id}", headers=admin_headers).status_code
        == 200
    )


def test_contract_negative_zero_rent(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    resp_zero = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 0.0,
        },
        headers=owner_headers,
    )
    assert resp_zero.status_code in (400, 422)

    resp_negative = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": -100.0,
        },
        headers=owner_headers,
    )
    assert resp_negative.status_code in (400, 422)


def test_contract_invalid_dates(owner_and_property, owner_tenant):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant
    today = str(date.today())
    yesterday = str(date.today() - timedelta(days=1))

    resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": yesterday,
            "rent_amount": 1200.0,
        },
        headers=owner_headers,
    )
    assert resp.status_code in (400, 422)


def test_property_status_becomes_rented_on_contract_creation(
    owner_and_property, owner_tenant
):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant

    prop_before = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_before.status_code == 200
    assert prop_before.json()["status"] == "AVAILABLE"

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
        headers=owner_headers,
    )
    assert resp.status_code == 200, resp.text

    prop_after = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_after.status_code == 200
    assert prop_after.json()["status"] == "RENTED"


def test_property_status_becomes_available_on_contract_deletion(
    owner_and_property, owner_tenant
):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant

    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    create_resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1200.0,
        },
        headers=owner_headers,
    )
    assert create_resp.status_code == 200, create_resp.text
    cid = create_resp.json()["id"]

    # terminate then delete (policy)
    term_resp = client.post(f"/contracts/{cid}/terminate", headers=owner_headers)
    assert term_resp.status_code == 200, term_resp.text

    del_resp = client.delete(f"/contracts/{cid}", headers=owner_headers)
    assert del_resp.status_code == 200, del_resp.text

    prop_available = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_available.status_code == 200
    assert prop_available.json()["status"] == "AVAILABLE"


def test_cannot_create_contract_when_property_already_rented(
    owner_and_property, owner_tenant
):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant

    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    resp1 = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1200.0,
        },
        headers=owner_headers,
    )
    assert resp1.status_code == 200

    resp2 = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1300.0,
        },
        headers=owner_headers,
    )
    assert resp2.status_code == 409


def test_admin_can_list_all_properties_from_properties_endpoint():
    # Owner1 creates property
    _, owner1_headers = register_and_login(
        client, "owner_admin_list_1", "testpassword", "oal1@example.com", is_owner=True
    )
    resp1 = client.post(
        "/properties/",
        json={
            "title": "Owner1 Property",
            "description": "desc",
            "address": "addr1",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=owner1_headers,
    )
    assert resp1.status_code == 200

    # Owner2 creates property
    _, owner2_headers = register_and_login(
        client, "owner_admin_list_2", "testpassword", "oal2@example.com", is_owner=True
    )
    resp2 = client.post(
        "/properties/",
        json={
            "title": "Owner2 Property",
            "description": "desc",
            "address": "addr2",
            "area_id": 11,  # ATHENS (seeded)
            "type": "DETACHED_HOUSE",
            "size": 60.0,
            "price": 1100.0,
        },
        headers=owner2_headers,
    )
    assert resp2.status_code == 200

    # Admin lists all via /properties
    register_and_login(
        client, "admin_list", "testpassword", "admin_list@example.com", is_owner=False
    )
    make_admin("admin_list")
    admin_headers = login_headers(client, "admin_list", "testpassword")

    resp = client.get("/properties/", headers=admin_headers)
    assert resp.status_code == 200
    titles = [p["title"] for p in resp.json()]
    assert "Owner1 Property" in titles
    assert "Owner2 Property" in titles


def test_terminate_contract_sets_property_available_and_contract_terminated(
    owner_and_property, owner_tenant
):
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant

    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))

    create_resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1200.0,
        },
        headers=owner_headers,
    )
    assert create_resp.status_code == 200, create_resp.text
    contract_id = create_resp.json()["id"]

    prop_rented = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_rented.status_code == 200
    assert prop_rented.json()["status"] == "RENTED"

    term_resp = client.post(
        f"/contracts/{contract_id}/terminate", headers=owner_headers
    )
    assert term_resp.status_code == 200, term_resp.text
    assert term_resp.json()["status"] == "TERMINATED"

    prop_available = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop_available.status_code == 200
    assert prop_available.json()["status"] == "AVAILABLE"


def test_update_contract_invalid_dates_returns_422(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property
    today = str(date.today())
    yesterday = str(date.today() - timedelta(days=1))

    resp = client.put(
        f"/contracts/{contract_id}",
        json={"start_date": today, "end_date": yesterday},
        headers=owner_headers,
    )
    assert resp.status_code == 422, resp.text


def test_update_contract_end_before_existing_start_returns_422(
    owner_and_property, contract_id
):
    # καλύπτει partial update: δίνω μόνο end_date και πρέπει να συγκριθεί με το υπάρχον start_date
    _, owner_headers, _ = owner_and_property
    very_old = str(date.today() - timedelta(days=3650))

    resp = client.put(
        f"/contracts/{contract_id}",
        json={"end_date": very_old},
        headers=owner_headers,
    )
    assert resp.status_code == 422, resp.text


def test_update_contract_zero_rent_returns_422(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property

    resp = client.put(
        f"/contracts/{contract_id}",
        json={"rent_amount": 0.0},
        headers=owner_headers,
    )
    assert resp.status_code == 422, resp.text


def test_owner_cannot_update_contract_to_other_owners_tenant():
    """
    Owner-scoped tenants: owner1 cannot update a contract to use a tenant owned by owner2.
    Admin bypass is allowed (covered elsewhere).
    """
    # Owner1
    _, owner1_headers = register_and_login(
        client, "owner_a", "pw", "owner_a@example.com", is_owner=True
    )
    # Tenant owned by owner1
    t1 = client.post(
        "/tenants/",
        json={
            "name": "T1",
            "afm": "111111111",
            "phone": "6900000001",
            "email": "t1@example.com",
        },
        headers=owner1_headers,
    )
    assert t1.status_code == 200, t1.text
    tenant1_id = t1.json()["id"]

    # Create property owned by owner1
    p = client.post(
        "/properties/",
        json={
            "title": "P1",
            "description": "desc",
            "address": "addr",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=owner1_headers,
    )
    assert p.status_code == 200, p.text
    property_id = p.json()["id"]

    # Create ACTIVE contract under owner1
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))
    c = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant1_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1200.0,
        },
        headers=owner1_headers,
    )
    assert c.status_code == 200, c.text
    contract_id = c.json()["id"]

    # Owner2 + tenant owned by owner2
    _, owner2_headers = register_and_login(
        client, "owner_b", "pw", "owner_b@example.com", is_owner=True
    )
    t2 = client.post(
        "/tenants/",
        json={
            "name": "T2",
            "afm": "222222222",
            "phone": "6900000002",
            "email": "t2@example.com",
        },
        headers=owner2_headers,
    )
    assert t2.status_code == 200, t2.text
    tenant2_id = t2.json()["id"]

    # Owner1 tries to update contract to tenant2 (should be forbidden)
    resp = client.put(
        f"/contracts/{contract_id}",
        json={"tenant_id": tenant2_id},
        headers=owner1_headers,
    )
    assert resp.status_code == 403, resp.text
    assert "Tenant does not belong" in resp.text


def test_cannot_delete_active_contract(owner_and_property, contract_id):
    _, owner_headers, _ = owner_and_property
    resp = client.delete(f"/contracts/{contract_id}", headers=owner_headers)
    assert resp.status_code == 409, resp.text


def test_property_status_follows_running_active_contract_rule(
    owner_and_property, owner_tenant
):
    """
    A3 policy:
      Property = RENTED  <=> exists ACTIVE contract with start_date <= today <= end_date
      Property = AVAILABLE otherwise

    This test covers the "start date in the future" case + sync on update.
    """
    _, owner_headers, property_id = owner_and_property
    _, _, tenant_id = owner_tenant

    tomorrow = str(date.today() + timedelta(days=1))
    end_date = str(date.today() + timedelta(days=366))

    # Create an ACTIVE contract that has NOT started yet -> property should remain AVAILABLE
    resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": tomorrow,
            "end_date": end_date,
            "rent_amount": 1200.0,
        },
        headers=owner_headers,
    )
    assert resp.status_code == 200, resp.text
    contract_id = resp.json()["id"]

    prop = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop.status_code == 200, prop.text
    assert prop.json()["status"] == "AVAILABLE"

    # Update start_date to today -> now it is "running" -> property should become RENTED
    today = str(date.today())
    upd = client.put(
        f"/contracts/{contract_id}",
        json={"start_date": today},
        headers=owner_headers,
    )
    assert upd.status_code == 200, upd.text

    prop2 = client.get(f"/properties/{property_id}", headers=owner_headers)
    assert prop2.status_code == 200, prop2.text
    assert prop2.json()["status"] == "RENTED"


def test_admin_can_list_all_contracts_and_filter_by_owner():
    # Owner1 -> property + tenant + contract
    owner1, owner1_headers = register_and_login(
        client, "a4_owner1", "pw", "a4_owner1@example.com", is_owner=True
    )
    p1 = client.post(
        "/properties/",
        json={
            "title": "P1",
            "description": "d",
            "address": "a",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=owner1_headers,
    )
    assert p1.status_code == 200, p1.text
    prop1_id = p1.json()["id"]

    t1 = client.post(
        "/tenants/",
        json={
            "name": "T1",
            "afm": "333333333",
            "phone": "6900000003",
            "email": "t1_a4@example.com",
        },
        headers=owner1_headers,
    )
    assert t1.status_code == 200, t1.text
    tenant1_id = t1.json()["id"]

    c1 = client.post(
        "/contracts/",
        json={
            "property_id": prop1_id,
            "tenant_id": tenant1_id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "rent_amount": 900.0,
        },
        headers=owner1_headers,
    )
    assert c1.status_code == 200, c1.text

    # Owner2 -> property + tenant + contract
    owner2, owner2_headers = register_and_login(
        client, "a4_owner2", "pw", "a4_owner2@example.com", is_owner=True
    )
    p2 = client.post(
        "/properties/",
        json={
            "title": "P2",
            "description": "d",
            "address": "a2",
            "area_id": 11,  # ATHENS (seeded)
            "type": "APARTMENT",
            "size": 60.0,
            "price": 1100.0,
        },
        headers=owner2_headers,
    )
    assert p2.status_code == 200, p2.text
    prop2_id = p2.json()["id"]

    t2 = client.post(
        "/tenants/",
        json={
            "name": "T2",
            "afm": "444444444",
            "phone": "6900000004",
            "email": "t2_a4@example.com",
        },
        headers=owner2_headers,
    )
    assert t2.status_code == 200, t2.text
    tenant2_id = t2.json()["id"]

    c2 = client.post(
        "/contracts/",
        json={
            "property_id": prop2_id,
            "tenant_id": tenant2_id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "rent_amount": 950.0,
        },
        headers=owner2_headers,
    )
    assert c2.status_code == 200, c2.text

    # Admin lists all
    register_and_login(client, "a4_admin", "pw", "a4_admin@example.com")
    make_admin("a4_admin")
    admin_headers = login_headers(client, "a4_admin", "pw")

    all_resp = client.get("/contracts/", headers=admin_headers)
    assert all_resp.status_code == 200, all_resp.text
    assert len(all_resp.json()) >= 2

    # Admin filters by owner_id (should only include owner1's contract(s))
    filt_resp = client.get(
        f"/contracts/?owner_id={owner1['id']}", headers=admin_headers
    )
    assert filt_resp.status_code == 200, filt_resp.text
    for row in filt_resp.json():
        # contract belongs to owner1 via property.owner_id (implicit)
        assert row["property_id"] == prop1_id


def test_owner_cannot_create_contract_with_other_owners_tenant(owner_and_property):
    """
    Owner-scoped tenants on CREATE:
    owner1 cannot create a contract using a tenant owned by owner2.
    API may return 403 (forbidden) or 404 (not found) depending on policy.
    """
    # Owner1 + property
    _, owner1_headers, property_id = owner_and_property

    # Owner2 + tenant
    _, owner2_headers = register_and_login(
        client, "owner_c_create", "pw", "owner_c_create@example.com", is_owner=True
    )
    t2 = client.post(
        "/tenants/",
        json={
            "name": "T_other",
            "afm": "555555555",
            "phone": "6900000005",
            "email": "t_other@example.com",
        },
        headers=owner2_headers,
    )
    assert t2.status_code == 200, t2.text
    tenant2_id = t2.json()["id"]

    # Owner1 tries to create contract with owner2's tenant
    today = str(date.today())
    end_date = str(date.today() + timedelta(days=365))
    resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant2_id,
            "start_date": today,
            "end_date": end_date,
            "rent_amount": 1200.0,
        },
        headers=owner1_headers,
    )
    assert resp.status_code in (403, 404), resp.text
