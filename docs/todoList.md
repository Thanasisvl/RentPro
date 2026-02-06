# 📋 Αναλυτική Λίστα Εργασιών Ανάπτυξης Εφαρμογής Διαχείρισης Μισθώσεων (UPDATED — light approach)

## Σημείο αρχής / γενικές αποφάσεις
- Light approach: no external infra (no email service, no background workers, no external search engines).
- Auth: JWT access (short-lived) + JWT refresh as HttpOnly Secure cookie (no DB storage / no rotation).
- DB sync: use Alembic migrations (source of truth).
- File storage: local filesystem under uploads/.
- Simple logging/audit: append to log/file or small audit table.
- Keep services synchronous and testable.

---

## 1. Βασικά Υποσυστήματα

### 1.1 Ρύθμιση Περιβάλλοντος
- [X] Δημιουργία αποθετηρίου Git
- [X] Ρύθμιση `.gitignore`
- [X] Δημιουργία φακέλων `backend/`, `frontend/`, `docs/`
- [X] Frontend React app exists (src/ components present)
- [X] (Optional) MUI (Material UI) styling
- [X] Dockerfiles + docker-compose (demo UX + tests + CI)

#### Backend (FastAPI)
- [X] Virtualenv / dependencies (fastapi, uvicorn, sqlalchemy) configured
- [X] Βασική δομή φακέλων (`routers/`, `models/`, `schemas/`, `db/`)
- [X] Alembic migrations for DB schema sync

#### Frontend (React)
- [X] Basic React app + components (LoginForm, RegisterForm, Property components)
- [ ] Improve UI (optional): styling library, responsive design

#### Database — PostgreSQL (Docker demo/runtime) + SQLite (tests)
- Purpose: Docker demo/runtime σε PostgreSQL (πιο ρεαλιστικό), ενώ τα tests τρέχουν σε SQLite για ταχύτητα.

Tasks
- [X] Install DB driver: `psycopg2-binary`
- [X] Add `.env.example` with `RENTPRO_DATABASE_URL` + Postgres vars
- [X] Provide `docker-compose.yml` with local Postgres
- [X] Update `backend/app/db/session.py` to conditionally set SQLite connect_args and use sane engine options for Postgres
- [X] Stop relying on `create_all`: apply schema via Alembic migrations
- [X] CI/docker tests: keep backend tests on SQLite; demo/runtime uses Postgres
- [X] Document steps in README/docs (start Postgres, set env, run migrations)

Not applicable / deprioritized (kept simple)
- ~~[ ] Tests parametrizable to run against SQLite *and* Postgres~~ (we intentionally keep SQLite tests + Postgres demo/runtime)


#### README
- [ ] Update README with light-approach constraints and run instructions

---

### 1.2 Authentication (UC-01) — light
- [X] User model with roles (backend/app/models/user.py)
- [X] Register endpoint and password hashing
- [X] Login endpoint (JWT access)
- [X] JWT middleware present
- [X] Add refresh token helpers (app/core/jwt.py: create_refresh_token / verify_refresh_token)
- [X] Endpoint POST /auth/refresh (reads HttpOnly refresh cookie, returns new access token)password-reset/confirm)
- [X] role_required / RBAC helpers (require_admin, is_admin, owner scoping checks)
- Frontend:
  - [X] LoginForm: use access token in memory; rely on backend-set refresh cookie
  - [X] Global axios interceptor: on 401 call /auth/refresh and retry
- Tests:
  - [X] tests/test_auth.py includes refresh/logout coverage

---

### 1.3 CRUD Ακινήτων (UC-02)
- [X] Property model, owner relation, basic CRUD endpoints and frontend components
- [ ] Image/media upload support (endpoint storing files under uploads/properties/)
- [ ] Ownership/authorization validation in crud/property.py
- Frontend:
  - [ ] PropertyForm.js: image input + preview
  - [ ] PropertyDetails.js: show image(s)
- Tests:
  - [ ] Upload tests + ownership guard tests (local filesystem)

---

### 1.4 CRUD Συμβολαίων (UC-05)
- [X] Contract model and CRUD endpoints
- [ ] Add status field (draft/active/terminated) and lifecycle routes:
  - POST /contracts/{id}/activate
  - POST /contracts/{id}/terminate
  - POST /contracts/{id}/renew
- Frontend:
  - [ ] ContractForm.js: controls for status transitions
- Tests:
  - [ ] Lifecycle flow tests and edge cases

---

### 1.5 CRUD Ενοικιαστών
- [X] Tenant model and CRUD endpoints
- [ ] Frontend: TenantForm.js, TenantList.js enhancements
- [ ] Show contracts history per tenant
- Tests:
  - [ ] Tenant CRUD tests (existing) — extend as needed

---

### 1.6 Upload αρχείων (PDF / contracts)
- [X] Endpoint for PDF upload (store under uploads/contracts/)
- [X] Link PDFs to Contract records
- [X] Frontend: file select + inline preview (open PDF)
- [X] Tests for upload/download (local filesystem)

---

### 1.7 Testing / Debugging
- [X] Existing backend tests (pytest) for core features
- [ ] Add unit tests for new endpoints and services (auth refresh, password reset, recommendation logic)
- [ ] Integration tests for critical flows (auth → search → recommend → contract)
- [X] Frontend tests (Jest/RTL) present (component/integration coverage)

---

## 2. Σύστημα Συστάσεων (MCDM) — light UC-04
- [X] Add minimal models:
  - backend/app/models/criterion.py
  - backend/app/models/preference_profile.py
  - backend/app/models/pairwise_comparison.py
  - Update backend/app/models/__init__.py
- [X] Pydantic schemas (recommendations + preference profiles)
- [X] CRUD helpers (preference profile + pairwise comparisons)
- [X] Service: AHP weight calc + TOPSIS ranking (synchronous)
- [X] Routers: preference profiles + recommendations (GET /recommendations)
- Frontend:
  - [X] Preferences UI (pairwise or sliders) + recommendations results page
- Tests:
  - [X] AHP/TOPSIS + recommendations tests
  - [X] Integration-ish test: profile → recommendations
- DB:
  - [X] Alembic migrations are the source of truth

---

## 3. Admin / Εποπτεία (UC-06)
- [X] Admin checks (require_admin)
- [X] Admin endpoints (list users w/ filtering/pagination via user router)
- [ ] Admin endpoints: change role / deactivate (optional)
- Frontend:
  - [X] AdminDashboard.js + Admin users page (basic oversight)
- Audit:
  - [ ] Simple audit logging (append to logfile or small audit table) for critical actions
- Tests:
  - [ ] RBAC tests (admin vs non-admin)

---

## 4. Documentation / Delivery (έγγραφα & περιορισμοί)
- [ ] Update README with light approach constraints (no email infra, no background workers, refresh cookie no-DB)
- [ ] Document security choices (HttpOnly cookie for refresh, access in memory)
- [ ] ER diagram & basic architecture notes
- [ ] Final deliverables (presentation, ZIP with code & docs)

---

## 5. Προτεινόμενο πλάνο προτεραιοτήτων (MVP — light)
1. UC-01: Password-reset token flow + RBAC edge cases + extra tests.  
2. UC-03: Add property filters + pagination (backend + frontend).  
3. UC-02 & UC-05: Add uploads + ownership validation + contract lifecycle.  
4. UC-04: Add minimal recommendation models + simple AHP/TOPSIS service + endpoints.  
5. UC-06: Admin endpoints + minimal audit.

## Σημείωση
- Όλα τα νέα features στο MVP πρέπει να υλοποιηθούν χωρίς εξωτερικές υπηρεσίες. Τεχνικοί περιορισμοί (no refresh revoke, no email infra, no background workers) να αναφέρονται στο documentation.
