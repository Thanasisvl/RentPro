import os
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./test_test.db"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"

from dotenv import load_dotenv
load_dotenv()

import pytest
from datetime import date, timedelta
from io import BytesIO

from fastapi.testclient import TestClient

from app.main import app
from app.db.session import Base, engine, SessionLocal
from app.models.tenant import Tenant
from app.models.property import Property, PropertyStatus
from app.models.contract import Contract

from tests.utils import (
    seed_locked_criteria_for_tests,
    register_and_login,
    login_headers,
    make_admin,
    create_property,
)

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_locked_criteria_for_tests()

def _create_tenant_db(owner_id: int, afm: str = "123456789") -> int:
    db = SessionLocal()
    try:
        t = Tenant(
            owner_id=owner_id,
            name="Test Tenant",
            afm=afm,
            phone="2100000000",
            email="tenant@example.com",
        )
        db.add(t)
        db.commit()
        db.refresh(t)
        return t.id
    finally:
        db.close()

def _get_property_status_db(property_id: int) -> str:
    db = SessionLocal()
    try:
        p = db.query(Property).filter(Property.id == property_id).first()
        assert p is not None
        return p.status.value if hasattr(p.status, "value") else str(p.status)
    finally:
        db.close()

def _get_contract_db(contract_id: int) -> Contract:
    db = SessionLocal()
    try:
        c = db.query(Contract).filter(Contract.id == contract_id).first()
        assert c is not None
        return c
    finally:
        db.close()

def test_uc05_create_contract_sets_property_rented():
    owner, owner_headers = register_and_login(client, "uc05_owner_a", "pw", "uc05_owner_a@example.com", is_owner=True)
    prop = create_property(client, owner_headers, title="UC05 P1")
    tenant_id = _create_tenant_db(owner_id=owner["id"], afm="111111111")

    r = client.post(
        "/contracts/",
        json={
            "property_id": prop["id"],
            "tenant_id": tenant_id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "rent_amount": 1200.0,
        },
        headers=owner_headers,
    )
    assert r.status_code == 200, r.text

    assert _get_property_status_db(prop["id"]) == PropertyStatus.RENTED.value

def test_uc05_already_rented_conflict_409():
    owner, owner_headers = register_and_login(client, "uc05_owner_b", "pw", "uc05_owner_b@example.com", is_owner=True)
    prop = create_property(client, owner_headers, title="UC05 P2")
    tenant_id = _create_tenant_db(owner_id=owner["id"], afm="222222222")

    payload = {
        "property_id": prop["id"],
        "tenant_id": tenant_id,
        "start_date": str(date.today()),
        "end_date": str(date.today() + timedelta(days=30)),
        "rent_amount": 900.0,
    }

    r1 = client.post("/contracts/", json=payload, headers=owner_headers)
    assert r1.status_code == 200, r1.text

    r2 = client.post("/contracts/", json=payload, headers=owner_headers)
    assert r2.status_code == 409, r2.text

def test_uc05_owner_scoped_tenant_enforced_403():
    owner1, owner1_headers = register_and_login(client, "uc05_owner_c1", "pw", "uc05_owner_c1@example.com", is_owner=True)
    owner2, owner2_headers = register_and_login(client, "uc05_owner_c2", "pw", "uc05_owner_c2@example.com", is_owner=True)

    prop1 = create_property(client, owner1_headers, title="UC05 P3")
    tenant2_id = _create_tenant_db(owner_id=owner2["id"], afm="333333333")

    r = client.post(
        "/contracts/",
        json={
            "property_id": prop1["id"],
            "tenant_id": tenant2_id,  # belongs to other owner
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "rent_amount": 1000.0,
        },
        headers=owner1_headers,
    )
    assert r.status_code == 403, r.text

def test_uc05_admin_can_list_all_contracts_gap2():
    o1, h1 = register_and_login(client, "uc05_owner_d1", "pw", "uc05_owner_d1@example.com", is_owner=True)
    o2, h2 = register_and_login(client, "uc05_owner_d2", "pw", "uc05_owner_d2@example.com", is_owner=True)

    p1 = create_property(client, h1, title="UC05 P4a")
    p2 = create_property(client, h2, title="UC05 P4b")

    t1 = _create_tenant_db(owner_id=o1["id"], afm="444444444")
    t2 = _create_tenant_db(owner_id=o2["id"], afm="555555555")

    c1 = client.post(
        "/contracts/",
        json={"property_id": p1["id"], "tenant_id": t1, "start_date": str(date.today()), "end_date": str(date.today() + timedelta(days=30)), "rent_amount": 1000.0},
        headers=h1,
    )
    assert c1.status_code == 200

    c2 = client.post(
        "/contracts/",
        json={"property_id": p2["id"], "tenant_id": t2, "start_date": str(date.today()), "end_date": str(date.today() + timedelta(days=30)), "rent_amount": 1100.0},
        headers=h2,
    )
    assert c2.status_code == 200

    # make an admin user (promote after register)
    register_and_login(client, "uc05_admin", "pw", "uc05_admin@example.com", is_owner=False)
    make_admin("uc05_admin")
    admin_headers = login_headers(client, "uc05_admin", "pw")

    lst = client.get("/contracts/", headers=admin_headers)
    assert lst.status_code == 200, lst.text
    ids = {x["id"] for x in lst.json()}
    assert c1.json()["id"] in ids
    assert c2.json()["id"] in ids

def test_uc05_terminate_sets_property_available():
    owner, owner_headers = register_and_login(client, "uc05_owner_e", "pw", "uc05_owner_e@example.com", is_owner=True)
    prop = create_property(client, owner_headers, title="UC05 P5")
    tenant_id = _create_tenant_db(owner_id=owner["id"], afm="666666666")

    c = client.post(
        "/contracts/",
        json={
            "property_id": prop["id"],
            "tenant_id": tenant_id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "rent_amount": 950.0,
        },
        headers=owner_headers,
    )
    assert c.status_code == 200, c.text
    contract_id = c.json()["id"]
    assert _get_property_status_db(prop["id"]) == "RENTED"

    term = client.post(f"/contracts/{contract_id}/terminate", headers=owner_headers)
    assert term.status_code == 200, term.text
    assert term.json()["status"] == "TERMINATED"
    assert _get_property_status_db(prop["id"]) == "AVAILABLE"

def test_uc05_delete_sets_property_available():
    owner, owner_headers = register_and_login(client, "uc05_owner_f", "pw", "uc05_owner_f@example.com", is_owner=True)
    prop = create_property(client, owner_headers, title="UC05 P6")
    tenant_id = _create_tenant_db(owner_id=owner["id"], afm="777777777")

    c = client.post(
        "/contracts/",
        json={
            "property_id": prop["id"],
            "tenant_id": tenant_id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "rent_amount": 800.0,
        },
        headers=owner_headers,
    )
    assert c.status_code == 200, c.text
    contract_id = c.json()["id"]
    assert _get_property_status_db(prop["id"]) == "RENTED"

    # Policy: cannot delete ACTIVE; terminate first then delete
    term = client.post(f"/contracts/{contract_id}/terminate", headers=owner_headers)
    assert term.status_code == 200, term.text

    d = client.delete(f"/contracts/{contract_id}", headers=owner_headers)
    assert d.status_code == 200, d.text
    assert _get_property_status_db(prop["id"]) == "AVAILABLE"

def test_uc05_upload_pdf_only_and_size_limit():
    owner, owner_headers = register_and_login(client, "uc05_owner_g", "pw", "uc05_owner_g@example.com", is_owner=True)
    prop = create_property(client, owner_headers, title="UC05 P7")
    tenant_id = _create_tenant_db(owner_id=owner["id"], afm="888888888")

    c = client.post(
        "/contracts/",
        json={
            "property_id": prop["id"],
            "tenant_id": tenant_id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=30)),
            "rent_amount": 1000.0,
        },
        headers=owner_headers,
    )
    assert c.status_code == 200, c.text
    contract_id = c.json()["id"]

    # not a pdf -> 415
    bad = client.post(
        f"/contracts/{contract_id}/upload",
        headers=owner_headers,
        files={"file": ("x.txt", BytesIO(b"hello"), "text/plain")},
    )
    assert bad.status_code == 415, bad.text

    # too large pdf -> 413
    big = BytesIO(b"a" * (5 * 1024 * 1024 + 1))
    too_big = client.post(
        f"/contracts/{contract_id}/upload",
        headers=owner_headers,
        files={"file": ("big.pdf", big, "application/pdf")},
    )
    assert too_big.status_code == 413

def test_gap3_auto_expire_on_list_sets_expired_and_frees_property():
    owner, owner_headers = register_and_login(client, "uc05_owner_h", "pw", "uc05_owner_h@example.com", is_owner=True)
    prop = create_property(client, owner_headers, title="UC05 P8")
    tenant_id = _create_tenant_db(owner_id=owner["id"], afm="999999999")

    # overdue contract (end_date < today) -> NOT "running" today, so property should be AVAILABLE per A3
    c = client.post(
        "/contracts/",
        json={
            "property_id": prop["id"],
            "tenant_id": tenant_id,
            "start_date": str(date.today() - timedelta(days=20)),
            "end_date": str(date.today() - timedelta(days=1)),
            "rent_amount": 700.0,
        },
        headers=owner_headers,
    )
    assert c.status_code == 200, c.text
    contract_id = c.json()["id"]

    # Under A3, an overdue contract should not keep the property RENTED
    assert _get_property_status_db(prop["id"]) == "AVAILABLE"

    # trigger list (may auto-expire if not already expired)
    lst = client.get("/contracts/", headers=owner_headers)
    assert lst.status_code == 200, lst.text

    row = next(x for x in lst.json() if x["id"] == contract_id)
    assert row["status"] == "EXPIRED"
    assert _get_property_status_db(prop["id"]) == "AVAILABLE"