# How to run

## Run the backend
from the root folder:
```uvicorn app.main:app --reload```

## Recreate the dev db
From the backend folder:
```python -m app.create_tables```

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
