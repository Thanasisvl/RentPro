from __future__ import annotations

from datetime import date, timedelta


import pytest
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.contract import Contract, ContractStatus
from tests.utils import (
    create_property,
    login_headers,
    make_admin,
    register_and_login,
    set_property_status,
)

client = TestClient(app)


@pytest.fixture
def owner_headers():
    _, headers = register_and_login(
        client,
        "owner_detail",
        "testpassword",
        "owner_detail@example.com",
        is_owner=True,
    )
    return headers


def test_public_detail_available_is_accessible(owner_headers):
    p = create_property(client, owner_headers, address="Athens Center")
    resp = client.get(f"/properties/{p['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == p["id"]


def test_public_detail_rented_hidden_but_owner_can_view(owner_headers):
    p = create_property(client, owner_headers, address="Athens Center")

    # Create tenant via API (so FK exists)
    tenant_resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant Detail",
            "afm": "123456789",
            "phone": "2100000000",
            "email": "tenant_detail@example.com",
        },
        headers=owner_headers,
    )
    assert tenant_resp.status_code == 200, tenant_resp.text
    tenant_id = tenant_resp.json()["id"]

    # Make it truly RENTED: create a running ACTIVE contract (sync-on-access will keep RENTED)
    db = SessionLocal()
    try:
        db.add(
            Contract(
                property_id=p["id"],
                tenant_id=tenant_id,
                start_date=date.today() - timedelta(days=5),
                end_date=date.today() + timedelta(days=5),
                rent_amount=900.0,
                status=ContractStatus.ACTIVE,
            )
        )
        db.commit()
    finally:
        db.close()

    public_resp = client.get(f"/properties/{p['id']}")
    assert public_resp.status_code == 404

    owner_resp = client.get(f"/properties/{p['id']}", headers=owner_headers)
    assert owner_resp.status_code == 200
    assert owner_resp.json()["id"] == p["id"]


def test_admin_can_view_non_available_details(owner_headers):
    p = create_property(client, owner_headers)
    set_property_status(p["id"], "INACTIVE")

    register_and_login(
        client,
        "admin_detail",
        "testpassword",
        "admin_detail@example.com",
        is_owner=False,
    )
    make_admin("admin_detail")
    admin_headers = login_headers(client, "admin_detail", "testpassword")

    resp = client.get(f"/properties/{p['id']}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == p["id"]
