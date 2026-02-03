import sqlite3

import pytest


@pytest.fixture(scope="function")
def db_connection():
    # Use in-memory database for isolation
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)")
    conn.commit()
    yield conn
    conn.close()


def test_database_connection(db_connection):
    cursor = db_connection.cursor()
    cursor.execute('SELECT name FROM sqlite_master WHERE type="table";')
    tables = cursor.fetchall()
    assert ("test",) in tables
