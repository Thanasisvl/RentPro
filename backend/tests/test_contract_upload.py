import os
import io
import shutil
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine
from app.models.user import UserRole

@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Clean uploads/contracts folder
    upload_dir = "./uploads/contracts"
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    os.makedirs(upload_dir, exist_ok=True)

client = TestClient(app)

def register_and_login(username="owner1", password="testpassword", email="owner1@example.com", is_owner=True):
    if is_owner:
        # Register owner with property
        resp = client.post(
            "/users/register-owner",
            json={
                "username": username,
                "email": email,
                "full_name": "Owner One",
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
        # Register regular user
        resp = client.post(
            "/users/register",
            json={
                "username": username,
                "email": email,
                "full_name": "Owner One",
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

def test_upload_contract_pdf():
    # Register owner and get property
    owner, owner_headers, property_id = register_and_login("owner1", "testpassword", "owner1@example.com", is_owner=True)

    # Register tenant and create tenant profile
    tenant, tenant_headers, _ = register_and_login("tenant1", "testpassword", "tenant1@example.com", is_owner=False)
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
            "pdf_file": None
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