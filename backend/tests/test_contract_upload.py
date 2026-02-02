import os
import io
import shutil
import pytest

os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./test_test.db"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"

from dotenv import load_dotenv
load_dotenv()

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine
from tests.utils import register_and_login, seed_locked_criteria_for_tests

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_locked_criteria_for_tests()
    # Clean uploads/contracts folder
    upload_dir = "./uploads/contracts"
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    os.makedirs(upload_dir, exist_ok=True)

client = TestClient(app)

def test_upload_contract_pdf():
    # Register owner and get property
    owner, owner_headers = register_and_login(client, "owner1", "testpassword", "owner1@example.com", is_owner=True)

    # Create property
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
    assert prop_resp.status_code == 200
    property_id = prop_resp.json()["id"]

    # Register tenant and create tenant profile
    tenant, tenant_headers = register_and_login(client, "tenant1", "testpassword", "tenant1@example.com", is_owner=False)
    tenant_profile_resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant One",
            "afm": "123456789",
            "phone": "1234567890",
            "email": "tenant1@example.com",
            "user_id": tenant["id"]
        },
        headers=tenant_headers
    )
    assert tenant_profile_resp.status_code == 200
    tenant_id = tenant_profile_resp.json()["id"]

    # Create contract
    contract_resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": "2025-06-26",
            "end_date": "2026-06-26",
            "rent_amount": 1200.0,
            "pdf_file": ""
        },
        headers=owner_headers
    )
    assert contract_resp.status_code == 200
    contract_id = contract_resp.json()["id"]

    # Upload PDF file
    pdf_content = b"%PDF-1.4 test pdf content"
    files = {"file": ("test_contract.pdf", io.BytesIO(pdf_content), "application/pdf")}
    upload_resp = client.post(
        f"/contracts/{contract_id}/upload",
        files=files,
        headers=owner_headers
    )
    assert upload_resp.status_code == 200
    data = upload_resp.json()
    assert data["filename"].endswith(".pdf")
    assert os.path.exists(f"./uploads/contracts/{data['filename']}")

def test_contract_pdf_upload_edge_cases():
    # Register owner
    owner, owner_headers = register_and_login(
        client, "owner2", "pw", "owner2@example.com", is_owner=True
    )

    # Create property for this owner
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
    assert prop_resp.status_code == 200
    property_id = prop_resp.json()["id"]

    # Register tenant and create tenant profile
    tenant, tenant_headers = register_and_login(
        client, "tenant2", "pw", "tenant2@example.com", is_owner=False
    )
    tenant_profile_resp = client.post(
        "/tenants/",
        json={
            "name": "Tenant Two",
            "afm": "987654321",
            "phone": "0987654321",
            "email": "tenant2@example.com",
            "user_id": tenant["id"],
        },
        headers=tenant_headers,
    )
    assert tenant_profile_resp.status_code == 200
    tenant_id = tenant_profile_resp.json()["id"]

    # Create contract
    contract_resp = client.post(
        "/contracts/",
        json={
            "property_id": property_id,
            "tenant_id": tenant_id,
            "start_date": "2025-06-26",
            "end_date": "2026-06-26",
            "rent_amount": 1200.0,
            "pdf_file": "",
        },
        headers=owner_headers,
    )
    assert contract_resp.status_code == 200
    contract_id = contract_resp.json()["id"]

    # 1. Missing file
    resp_missing = client.post(
        f"/contracts/{contract_id}/upload",
        files={},
        headers=owner_headers,
    )
    assert resp_missing.status_code in (400, 422)

    # 2. Wrong file type
    files_wrong_type = {
        "file": ("test.txt", io.BytesIO(b"not a pdf"), "text/plain")
    }
    resp_wrong_type = client.post(
        f"/contracts/{contract_id}/upload",
        files=files_wrong_type,
        headers=owner_headers,
    )
    assert resp_wrong_type.status_code in (400, 422)

    # 3. Oversized file (assuming 5MB limit, adjust if needed)
    big_content = b"%" + b"A" * (5 * 1024 * 1024 + 1)
    files_big = {
        "file": ("big_contract.pdf", io.BytesIO(big_content), "application/pdf")
    }
    resp_big = client.post(
        f"/contracts/{contract_id}/upload",
        files=files_big,
        headers=owner_headers,
    )
    assert resp_big.status_code in (400, 413, 422)