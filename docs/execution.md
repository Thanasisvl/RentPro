# How to run

## Run the backend
from the root folder:
```uvicorn app.main:app --reload```

## Recreate the dev db
From the backend folder:
```bash
# apply migrations to the configured DB
alembic upgrade head
```

## Create a new migration (Alembic)

From the `backend/` folder:

```bash
# 1) Make your SQLAlchemy model changes in app/models/*
# 2) Create a revision (autogenerate)
alembic revision --autogenerate -m "add_x"

# 3) Review the generated file in backend/alembic/versions/
# 4) Apply it
alembic upgrade head
```

If you’re using Docker Compose (recommended for demos), you can also run:

```bash
make revision-auto MSG="add_x"
make migrate
```

## Run the backend tests
from the root folder:
```pytest```
```pytest backend/tests/test_auth.py```
```pytest -s backend/tests/test_contract_crud.py::test_create_contract```

## Run the frontend
```cd frontend```
```npm install```
```npm start```
or
```cd frontend```
```yarn```
```yarn start```
