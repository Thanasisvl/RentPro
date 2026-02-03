from __future__ import annotations

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.db.session import Base, SessionLocal, engine
from app.main import app
from app.models.contract import Contract, ContractStatus
from app.models.property import Property, PropertyStatus
from tests.utils import register_and_login

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_get_property_syncs_overdue_contract_and_makes_property_available() -> None:
    # Owner + property via API (matches your PropertyCreate schema)
    _, owner_headers = register_and_login(
        client,
        "owner_sync",
        "testpassword",
        "owner_sync@example.com",
        is_owner=True,
    )

    prop_resp = client.post(
        "/properties/",
        json={
            "title": "Sync Test Property",
            "description": "desc",
            "address": "addr",
            "type": "APARTMENT",
            "size": 80.0,
            "price": 900.0,
        },
        headers=owner_headers,
    )
    assert prop_resp.status_code == 200, prop_resp.text
    property_id = prop_resp.json()["id"]

    # Tenant via API (keep minimal fields commonly required)
    tenant_resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant Sync",
            "afm": "123456789",
            "phone": "2100000000",
            "email": "tenant_sync@example.com",
        },
        headers=owner_headers,
    )
    assert tenant_resp.status_code == 200, tenant_resp.text
    tenant_id = tenant_resp.json()["id"]

    # Contract via DB (so we don't depend on contract router requirements)
    db = SessionLocal()
    try:
        c = Contract(
            property_id=property_id,
            tenant_id=tenant_id,
            start_date=date.today() - timedelta(days=60),
            end_date=date.today() + timedelta(days=30),
            rent_amount=1000.0,
            status=ContractStatus.ACTIVE,
        )
        db.add(c)

        p = db.query(Property).filter(Property.id == property_id).first()
        assert p is not None
        p.status = PropertyStatus.RENTED  # simulate stale status

        db.commit()
        db.refresh(c)

        # Now simulate "time passed": overdue but still ACTIVE (stale contract state)
        c.end_date = date.today() - timedelta(days=1)
        c.status = ContractStatus.ACTIVE
        p.status = PropertyStatus.RENTED
        db.commit()
    finally:
        db.close()

    # Anonymous GET should trigger sync on access and return AVAILABLE (public)
    get_resp = client.get(f"/properties/{property_id}")
    assert get_resp.status_code == 200, get_resp.text
    body = get_resp.json()
    assert body["id"] == property_id
    assert body["status"] == PropertyStatus.AVAILABLE.value

    # Optional: verify DB side-effect (contract is no longer ACTIVE)
    db2 = SessionLocal()
    try:
        c2 = db2.query(Contract).filter(Contract.property_id == property_id).first()
        assert c2 is not None
        assert c2.status != ContractStatus.ACTIVE

        p2 = db2.query(Property).filter(Property.id == property_id).first()
        assert p2 is not None
        assert p2.status == PropertyStatus.AVAILABLE
    finally:
        db2.close()
