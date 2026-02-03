import os

from dotenv import load_dotenv

import pytest
from fastapi.testclient import TestClient

from app.db.session import Base, engine
from app.main import app
from tests.utils import (
    create_property,
    login_headers,
    make_admin,
    register_and_login,
    seed_locked_criteria_for_tests,
    set_property_status,
)

os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./test_test.db"
load_dotenv()

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_locked_criteria_for_tests()


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
    set_property_status(p["id"], "RENTED")

    public_resp = client.get(f"/properties/{p['id']}")
    assert public_resp.status_code == 404

    owner_resp = client.get(f"/properties/{p['id']}", headers=owner_headers)
    assert owner_resp.status_code == 200
    assert owner_resp.json()["id"] == p["id"]


def test_admin_can_view_non_available_details(owner_headers):
    p = create_property(client, owner_headers)
    set_property_status(p["id"], "INACTIVE")

    # create admin + fresh token
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
