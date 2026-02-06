import io
import os
import shutil

import pytest

from fastapi.testclient import TestClient

from app.main import app
from app.core.uploads import get_upload_root
from tests.utils import register_and_login


client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_uploads_dir():
    upload_dir = str(get_upload_root() / "contracts")
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    os.makedirs(upload_dir, exist_ok=True)


def _create_tenant_for_owner(owner_headers):
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
    return resp.json()["id"]


def test_upload_contract_pdf():
    owner, owner_headers = register_and_login(
        client, "owner1", "testpassword", "owner1@example.com", is_owner=True
    )

    prop_resp = client.post(
        "/properties/",
        json={
            "title": "Initial Property",
            "description": "Initial property",
            "address": "1 Owner St",
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=owner_headers,
    )
    assert prop_resp.status_code == 200, prop_resp.text
    property_id = prop_resp.json()["id"]

    tenant_id = _create_tenant_for_owner(owner_headers)

    contract_resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": "2025-06-26",
            "end_date": "2026-06-26",
            "rent_amount": 1200.0,
            # pdf_file omitted (upload endpoint)
        },
        headers=owner_headers,
    )
    assert contract_resp.status_code == 200, contract_resp.text
    contract_id = contract_resp.json()["id"]

    pdf_content = b"%PDF-1.4 test pdf content"
    files = {"file": ("test_contract.pdf", io.BytesIO(pdf_content), "application/pdf")}
    upload_resp = client.post(
        f"/contracts/{contract_id}/upload", files=files, headers=owner_headers
    )
    assert upload_resp.status_code == 200, upload_resp.text
    data = upload_resp.json()
    assert data["pdf_file"] is not None
    assert data["pdf_file"].endswith(".pdf")
    # optional: ensure it is stored under contracts/ folder (relative path)
    assert "contracts/" in data["pdf_file"].replace("\\", "/")

    # PDF retrieval is served inline via FileResponse (no redirect)
    pdf_resp = client.get(f"/contracts/{contract_id}/pdf", headers=owner_headers)
    assert pdf_resp.status_code == 200, pdf_resp.text
    assert "application/pdf" in (pdf_resp.headers.get("content-type") or "")
    assert pdf_resp.content.startswith(b"%PDF-")


def test_contract_pdf_upload_edge_cases():
    owner, owner_headers = register_and_login(
        client, "owner2", "pw", "owner2@example.com", is_owner=True
    )

    prop_resp = client.post(
        "/properties/",
        json={
            "title": "Initial Property",
            "description": "Initial property",
            "address": "1 Owner St",
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=owner_headers,
    )
    assert prop_resp.status_code == 200, prop_resp.text
    property_id = prop_resp.json()["id"]

    tenant_id = _create_tenant_for_owner(owner_headers)

    contract_resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": "2025-06-26",
            "end_date": "2026-06-26",
            "rent_amount": 1200.0,
        },
        headers=owner_headers,
    )
    assert contract_resp.status_code == 200, contract_resp.text
    contract_id = contract_resp.json()["id"]

    # 1. Missing file
    resp_missing = client.post(
        f"/contracts/{contract_id}/upload",
        files={},
        headers=owner_headers,
    )
    assert resp_missing.status_code in (400, 422), resp_missing.text

    # 2. Wrong file type -> 415 (unsupported media type)
    files_wrong_type = {"file": ("test.txt", io.BytesIO(b"not a pdf"), "text/plain")}
    resp_wrong_type = client.post(
        f"/contracts/{contract_id}/upload",
        files=files_wrong_type,
        headers=owner_headers,
    )
    assert resp_wrong_type.status_code == 415, resp_wrong_type.text

    # 3. Oversized file (~5MB) -> 413
    big_content = b"%" + b"A" * (5 * 1024 * 1024 + 1)
    files_big = {
        "file": ("big_contract.pdf", io.BytesIO(big_content), "application/pdf")
    }
    resp_big = client.post(
        f"/contracts/{contract_id}/upload",
        files=files_big,
        headers=owner_headers,
    )
    assert resp_big.status_code == 413, resp_big.text


def test_get_contract_pdf_404_when_missing():
    _, owner_headers = register_and_login(
        client, "owner_missingpdf", "pw", "owner_missingpdf@example.com", is_owner=True
    )

    prop_resp = client.post(
        "/properties/",
        json={
            "title": "Initial Property",
            "description": "Initial property",
            "address": "1 Owner St",
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=owner_headers,
    )
    assert prop_resp.status_code == 200, prop_resp.text
    property_id = prop_resp.json()["id"]

    tenant_id = _create_tenant_for_owner(owner_headers)
    contract_resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": "2025-06-26",
            "end_date": "2026-06-26",
            "rent_amount": 1200.0,
        },
        headers=owner_headers,
    )
    assert contract_resp.status_code == 200, contract_resp.text
    contract_id = contract_resp.json()["id"]

    pdf_resp = client.get(f"/contracts/{contract_id}/pdf", headers=owner_headers)
    assert pdf_resp.status_code == 404


def test_get_contract_pdf_forbidden_for_other_owner():
    # Owner A creates contract + uploads PDF
    _, owner_a_headers = register_and_login(
        client, "owner_pdf_a", "pw", "owner_pdf_a@example.com", is_owner=True
    )
    prop_resp = client.post(
        "/properties/",
        json={
            "title": "Initial Property",
            "description": "Initial property",
            "address": "1 Owner St",
            "type": "APARTMENT",
            "size": 50.0,
            "price": 1000.0,
        },
        headers=owner_a_headers,
    )
    assert prop_resp.status_code == 200, prop_resp.text
    property_id = prop_resp.json()["id"]

    tenant_id = _create_tenant_for_owner(owner_a_headers)
    contract_resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": "2025-06-26",
            "end_date": "2026-06-26",
            "rent_amount": 1200.0,
        },
        headers=owner_a_headers,
    )
    assert contract_resp.status_code == 200, contract_resp.text
    contract_id = contract_resp.json()["id"]

    pdf_content = b"%PDF-1.4 test pdf content"
    files = {"file": ("test_contract.pdf", io.BytesIO(pdf_content), "application/pdf")}
    upload_resp = client.post(
        f"/contracts/{contract_id}/upload", files=files, headers=owner_a_headers
    )
    assert upload_resp.status_code == 200, upload_resp.text

    # Owner B tries to access PDF -> 403
    _, owner_b_headers = register_and_login(
        client, "owner_pdf_b", "pw", "owner_pdf_b@example.com", is_owner=True
    )
    pdf_resp = client.get(f"/contracts/{contract_id}/pdf", headers=owner_b_headers)
    assert pdf_resp.status_code == 403
