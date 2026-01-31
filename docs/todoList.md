# 📋 Αναλυτική Λίστα Εργασιών Ανάπτυξης Εφαρμογής Διαχείρισης Μισθώσεων (UPDATED — light approach)

## Σημείο αρχής / γενικές αποφάσεις
- Light approach: no external infra (no email service, no background workers, no external search engines).
- Auth: JWT access (short-lived) + JWT refresh as HttpOnly Secure cookie (no DB storage / no rotation).
- DB sync for MVP: use app/create_tables.py (alembic optional).
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
- [ ] (Optional) TypeScript / MUI / Tailwind
- [ ] (Optional) Dockerfiles + docker-compose (keep out of MVP unless required)

#### Backend (FastAPI)
- [X] Virtualenv / dependencies (fastapi, uvicorn, sqlalchemy) configured
- [X] Βασική δομή φακέλων (`routers/`, `models/`, `schemas/`, `db/`)
- [X] app/create_tables.py for DB sync

#### Frontend (React)
- [X] Basic React app + components (LoginForm, RegisterForm, Property components)
- [ ] Improve UI (optional): styling library, responsive design

#### Database — Switch to PostgreSQL (optional)
- Purpose: προαιρετική μετάβαση από SQLite (dev/in-memory) σε local PostgreSQL για πιο ρεαλιστικό dev/integration περιβάλλον.
- Constraints: light approach — δεν απαιτούνται managed services, χρήση Docker για τοπικό Postgres προτείνεται.

Tasks to ADD
- [ ] Install DB driver: `pip install psycopg2-binary`
- [ ] Add `.env.example` with DATABASE_URL (e.g. postgresql+psycopg2://rentpro:secret@localhost:5432/rentpro)
- [ ] Provide docker-compose.yml or docker run snippet for local Postgres (developer docs)
- [ ] Update `backend/app/db/session.py` to read DATABASE_URL and conditionally set connect_args for SQLite
- [ ] Run `python app/create_tables.py` or Alembic migrations after switching
- [ ] Update CI/test scripts to support running tests against Postgres (or keep SQLite for fast unit tests)
- [ ] Document steps in README (how to start Postgres, set env, run migrations)

Tasks to MODIFY
- [ ] Tests that assume in-memory DB: make them parametrizable to run against SQLite or Postgres
- [ ] dev/run scripts: add env var examples and fallbacks to SQLite for quick dev

Tasks to REMOVE / NOTE
- [ ] (No external hosting) Do NOT add managed DB services in MVP — local Postgres only
- Note: switching to Postgres requires running service (Docker) — mention as dev dependency in docs

Commands (dev)
- `pip install psycopg2-binary`
- `docker run --name rentpro-postgres -e POSTGRES_USER=rentpro -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=rentpro -p 5432:5432 -d postgres:15`
- set `DATABASE_URL` env and `python backend\app\create_tables.py`


#### README
- [ ] Update README with light-approach constraints and run instructions

---

### 1.2 Authentication (UC-01) — light
- [X] User model with roles (backend/app/models/user.py)
- [X] Register endpoint and password hashing
- [X] Login endpoint (JWT access)
- [X] JWT middleware present
- [ ] Add refresh token helpers (app/core/jwt.py: create_refresh_token / verify_refresh_token)
- [ ] Endpoint POST /auth/refresh (reads HttpOnly refresh cookie, returns new access token)
- [ ] Password reset flow (POST /auth/password-reset/request → returns token in response or logs; POST /auth/password-reset/confirm)
- [ ] (Optional) Email verify endpoint (token-based; no email infra)
- [ ] role_required dependency / simple RBAC helper (core/security.py or api/deps.py)
- Frontend:
  - [ ] LoginForm: use access token in memory; rely on backend-set refresh cookie
  - [ ] Add PasswordResetRequestForm.js and PasswordResetConfirmForm.js (dev-mode token display)
  - [ ] Global fetch/axios interceptor: on 401 call /auth/refresh and retry
- Tests:
  - [ ] Extend tests/test_auth.py for refresh, password-reset, role-guards

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
- [ ] Endpoint for PDF upload (store under uploads/contracts/)
- [ ] Link PDFs to Contract records
- [ ] Frontend: file select, preview, download
- [ ] Tests for upload/download (local filesystem)

---

### 1.7 Testing / Debugging
- [X] Existing backend tests (pytest) for core features
- [ ] Add unit tests for new endpoints and services (auth refresh, password reset, recommendation logic)
- [ ] Integration tests for critical flows (auth → search → recommend → contract)
- [ ] Frontend tests (react-testing-library) as time permits

---

## 2. Σύστημα Συστάσεων (MCDM) — light UC-04
- [ ] Add minimal models:
  - backend/app/models/criterion.py
  - backend/app/models/preference_profile.py
  - backend/app/models/pairwise_comparison.py
  - Update backend/app/models/__init__.py
- [ ] Pydantic schemas: backend/app/schemas/recommendation_*.py
- [ ] CRUD helpers: backend/app/crud/recommendation_*.py
- [ ] Service: backend/app/services/recommendation.py — simple AHP weight calc + TOPSIS ranking (synchronous)
- [ ] Router: backend/app/routers/recommendations.py (create profile, submit comparisons, GET /recommendations)
- Frontend:
  - [ ] RecommendationsForm.js (pairwise or sliders, minimal)
  - [ ] RecommendationsResults.js (show ranked properties + score)
- Tests:
  - [ ] Unit tests for AHP/TOPSIS calculations
  - [ ] Integration test: profile → recommendations
- DB:
  - [ ] Run app/create_tables.py after adding models (alembic optional)

---

## 3. Admin / Εποπτεία (UC-06)
- [ ] role_required dependency for admin checks
- [ ] Admin endpoints (list users, change role, deactivate) in app/routers/admin.py or extend user router
- Frontend:
  - [ ] AdminDashboard.js with minimal user/property/contract management
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
1. UC-01: Add refresh endpoint, password-reset token flow, role_required dependency, tests.  
2. UC-03: Add property filters + pagination (backend + frontend).  
3. UC-02 & UC-05: Add uploads + ownership validation + contract lifecycle.  
4. UC-04: Add minimal recommendation models + simple AHP/TOPSIS service + endpoints.  
5. UC-06: Admin endpoints + minimal audit.

## Σημείωση
- Όλα τα νέα features στο MVP πρέπει να υλοποιηθούν χωρίς εξωτερικές υπηρεσίες. Τεχνικοί περιορισμοί (no refresh revoke, no email infra, no background workers) να αναφέρονται στο documentation.
