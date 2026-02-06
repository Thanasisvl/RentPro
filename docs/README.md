# 📋 RentPro — Housing / Rental Management (Thesis Prototype)

## Εισαγωγή

Το **RentPro** είναι μια διαδικτυακή πλατφόρμα διαχείρισης μισθώσεων ακινήτων, σχεδιασμένη για να διευκολύνει την αλληλεπίδραση μεταξύ ιδιοκτητών και ενοικιαστών. Περιλαμβάνει λειτουργίες όπως αυθεντικοποίηση χρηστών, διαχείριση ακινήτων και συμβολαίων (UC‑05), καθώς και πρόσθετους κανόνες/ελέγχους (owner scoping, admin εποπτεία).

## Use cases που υποστηρίζονται (ενδεικτικά)

- **UC‑01 — Εγγραφή/Σύνδεση/Αποσύνδεση**: JWT access token + refresh token cookie.
- **UC‑02 — Διαχείριση Ακινήτων**: CRUD ακινήτων από **OWNER/ADMIN** με owner scoping (οι owners βλέπουν/διαχειρίζονται μόνο τα δικά τους, ο admin μπορεί να εποπτεύει/διαχειρίζεται όλα).
- **UC‑03 — Αναζήτηση & Προβολή Ακινήτων**: Public αναζήτηση μέσω `/properties/search`. Public προβολή λεπτομερειών για ακίνητα **AVAILABLE**· για μη‑AVAILABLE απαιτείται αυθεντικοποίηση και εξουσιοδότηση (owner/admin).
- **UC‑04 — Προτάσεις ακινήτων**: AHP (consistency check / CR) → TOPSIS ranking. Σε περίπτωση ασυνέπειας, το API επιστρέφει `422` με `error="AHP_INCONSISTENT"` και το UI εμφανίζει ειδικό μήνυμα/καθοδήγηση.
- **UC‑05 — Συμβόλαια (Contracts)**: CRUD + upload PDF + inline προβολή PDF από auth-guarded endpoint.
- **UC‑06 — Εποπτεία χρηστών & καταχωρίσεων συστήματος (Admin)**:
  - Admin dashboard με συγκεντρωτικά στοιχεία (π.χ. counts για χρήστες/ακίνητα/ενοικιαστές/συμβόλαια).
  - Λίστα χρηστών (admin-only) με **filtering/pagination** (`q`, `role`, `skip/limit`, `X-Total-Count`).
  - Εποπτεία καταχωρίσεων: admin μπορεί να βλέπει/διαχειρίζεται όλα τα ακίνητα· προαιρετικό φίλτρο `owner_id` στη λίστα ακινήτων.
  - Περιορισμοί συνέπειας δεδομένων: αποτρέπεται διαγραφή **ακινήτου/ενοικιαστή** όταν υπάρχει **ACTIVE contract** (409).

## Τεχνολογίες

- **Frontend**: React.js
- **Backend**: Python (FastAPI)
- **Database**: PostgreSQL (Docker demo/runtime) + SQLite (tests)
- **Tooling**: pytest, ruff, black

## Προαπαιτούμενα

- **Python**: 3.10+ (απαιτείται, λόγω typing syntax π.χ. `str | None`)
- **Node.js**: 18+ (recommended)

## Ρύθμιση Περιβάλλοντος

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd RentPro
   ```

2. **Python virtual environment (root)**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   python -m pip install -U pip
   ```

3. **Backend dependencies**:
   ```bash
   python -m pip install -r backend/requirements.txt -r backend/requirements-dev.txt
   ```

4. **Frontend Setup**:
   - Navigate to the frontend directory:
     ```bash
     cd ../frontend
     ```
   - Install dependencies:
     ```bash
     npm install
     ```

## Εκτέλεση (Development)

### Backend

Από το root (ή μέσα από `backend/`):

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --app-dir backend
```

- **Swagger/OpenAPI**: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm start
```

## Εκτέλεση (Demo με Docker)

Για demo/παρουσίαση μπορείς να σηκώσεις **frontend (nginx)** + **backend** με 1 εντολή, ώστε να έχεις:

- **UI**: `http://localhost`
- **API**: `http://localhost/api` (nginx proxy στο backend)
- **Uploads**: `http://localhost/uploads`

### Προαπαιτούμενα

- Docker Desktop (ή Docker Engine) με `docker compose`

### Εκτέλεση

Από το root του project:

```bash
cp .env.example .env
docker compose up --build
```

Σημείωση: το backend τρέχει **Alembic migrations** στο startup (δεν χρησιμοποιεί πλέον `create_all`).

Health check:

```bash
curl -fsS http://localhost/api/health
```

### Stop / Reset demo data

- Stop:

```bash
docker compose down
```

- Reset (σβήνει και τα volumes με PostgreSQL DB + uploads):

```bash
docker compose down -v
```

### Inspect PostgreSQL (optional)

Αν θέλεις να δεις tables/δεδομένα:

```bash
docker compose exec postgres psql -U "${POSTGRES_USER:-rentpro}" -d "${POSTGRES_DB:-rentpro}" -c "\\dt"
```

### Database migrations (Alembic)

Το RentPro χρησιμοποιεί **Alembic migrations** (source of truth για schema).

#### Apply migrations (Docker demo runtime)

Από το root:

```bash
make migrate
```

ή χωρίς Makefile:

```bash
docker compose run --rm backend alembic -c alembic.ini upgrade head
```

#### Create a new migration (autogenerate)

Flow:

1. Κάνε αλλαγές στα SQLAlchemy models (`backend/app/models/*`).
2. Δημιούργησε revision:

```bash
make revision-auto MSG="add_x"
```

3. Έλεγξε/διόρθωσε το generated migration file στο `backend/alembic/versions/`.
4. Εφάρμοσέ το:

```bash
make migrate
```

Σημείωση: το `--autogenerate` είναι “best effort”. Για constraints / indexes / data migrations μπορεί να χρειαστεί manual edit στο migration script.

### Quality-of-life (Makefile)

Ίδιες εντολές μέσω `make`:

```bash
make demo-up
make demo-down
make demo-reset
make logs
make migrate
make revision-auto MSG="add_x"
```

### Troubleshooting

- **Η πόρτα 80 είναι πιασμένη**: άλλαξε port στο `.env` (π.χ. `WEB_PORT=8080`) και άνοιξε `http://localhost:8080`.
- **Ξέχασες να βάλεις secret**: το `docker compose` απαιτεί `RENTPRO_SECRET_KEY` στο `.env` (δες `.env.example`).
- **Permissions σε volume μετά από αλλαγές**: αν δεις error για write σε `/data` (SQLite/uploads), κάνε `docker compose down -v` για να ξαναδημιουργηθεί το volume.

## Χρήση

- **Backend**: Η εφαρμογή θα είναι διαθέσιμη στο `http://localhost:8000`.
- **Frontend**: Η εφαρμογή θα είναι διαθέσιμη στο `http://localhost:3000`.

## Tests

### Κατηγοριοποίηση & πότε τρέχουν

- **Backend (pytest)**: unit/integration tests για FastAPI + DB logic (SQLite by default).
  - **Local**: `pytest backend/tests`
  - **Docker**: `docker compose --profile test run --rm backend-tests`
  - **CI**: τρέχουν και “native” (Python job) και “via Docker” (docker-tests job) + ανεβαίνουν coverage artifacts
- **Frontend component/integration (Jest/RTL)**:
  - **Local**: `npm run test:ci` (από `frontend/`)
  - **Docker**: `docker compose --profile test run --rm frontend-tests`
  - **CI**: τρέχουν και “native” (Node job) και “via Docker” (docker-tests job) + ανεβαίνουν coverage artifacts
- **Frontend E2E (Playwright)**:
  - **CI**: smoke + tiered suites (`@smoke`, `@p1`, `@p2`)
  - **Local**: `npm run test:e2e` (από `frontend/`)
  - **Integration E2E (@p3)**: manual/optional (real backend, seeded)

### Backend

```bash
source .venv/bin/activate
pytest backend/tests
```

### Backend tests via Docker

Από το root:

```bash
docker compose --profile test run --rm backend-tests
```

ή με Makefile:

```bash
make test-backend
```

### UI (Frontend)

Δες το UI test plan εδώ: `docs/uiTestPlan.md`

#### Component / Integration (Jest + React Testing Library)

Από το `frontend/`:

```bash
cd frontend
npm install
```

- Run once (CI-style, χωρίς watch):

```bash
npm run test:ci
```

- Run component tests via Docker:

Από το root:

```bash
docker compose --profile test run --rm frontend-tests
```

ή με Makefile:

```bash
make test-ui
```

- Watch mode (interactive):

```bash
npm test
```

- Run ένα συγκεκριμένο test file / pattern:

```bash
npm test -- PropertyList.test.js
npm test -- Property
```

#### E2E (Playwright)

Προαπαιτούμενο: **Node.js 18+** (recommended 20).

Από το `frontend/`:

```bash
cd frontend
npm run e2e:install
npm run test:e2e
```

Αν δεις error τύπου “Executable doesn't exist … chrome-headless-shell …” (συνήθως μετά από Node/Playwright upgrade ή αλλαγή αρχιτεκτονικής), κάνε force reinstall:

```bash
cd frontend
npm run e2e:install:force
```

Debug helpers:

```bash
npm run test:e2e -- --headed
npm run test:e2e -- --ui
```

Artifacts σε failure (χρήσιμο για debugging):

- `frontend/test-results/` (traces, screenshots)
- `frontend/playwright-report/` (HTML report όταν τρέχει σε CI)

#### E2E Integration (Playwright) — χωρίς network stubbing (@p3)

Απαιτείται να τρέχει backend τοπικά, με seeded users/fixtures.

Σε 1 terminal (backend):

```bash
source .venv/bin/activate
export RENTPRO_E2E_SEED=1
export RENTPRO_E2E_PASSWORD=rentpro-e2e
uvicorn app.main:app --reload --app-dir backend
```

Σε άλλο terminal (frontend):

```bash
cd frontend
npm run e2e:install
E2E_PASSWORD=rentpro-e2e npm run test:e2e -- --grep @p3
```

## Lint / Format

### Ruff

```bash
source .venv/bin/activate
ruff check backend/app backend/tests
ruff check --fix backend/app backend/tests
```

### Black

```bash
source .venv/bin/activate
black backend/app backend/tests
```

## Ρυθμίσεις / Environment variables (backend)

Τα περισσότερα έχουν defaults για dev/tests, αλλά για **Docker demo** προτείνεται να τα ορίζεις από `.env`
(δες `.env.example`).

### Docker / Compose (`.env`)

- **`WEB_PORT`** (default: `80`): port που κάνει expose το nginx (UI + `/api`).
- **`REACT_APP_API_URL`** (default: `/api`): API base URL που “ψήνεται” στο React build (για nginx demo κράτα `/api`).
- **`POSTGRES_DB`**, **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`**: ρυθμίσεις για το Postgres container (Docker demo).

### Backend (FastAPI)

- **`RENTPRO_DATABASE_URL`** (default στο code: `sqlite:///./rentpro_dev.db`): SQLAlchemy DB URL.
  - Docker demo (Postgres): `postgresql+psycopg2://rentpro:rentpro@postgres:5432/rentpro`
  - Tests (SQLite): `sqlite:///./test_test.db`
- **`RENTPRO_UPLOAD_DIR`** (default: `backend/uploads`): absolute/relative directory για uploads (PDFs).
  - Docker demo: `/data/uploads` (persist σε volume)
- **`RENTPRO_SECRET_KEY`** (default στο code: `your-secret-key`): JWT signing key.
  - **Στο Docker demo είναι required** (δεν επιτρέπεται fallback).
- **`RENTPRO_JWT_ALGORITHM`** (default: `HS256`): JWT HMAC algorithm (HS256/HS384/HS512).
- **`ACCESS_TOKEN_EXPIRE_MINUTES`** (default: `60`): διάρκεια access token (λεπτά).
- **`REFRESH_TOKEN_EXPIRE_DAYS`** (default: `7`): διάρκεια refresh token (ημέρες).
- **`RENTPRO_COOKIE_SECURE`** (optional): αν είναι `1`, το refresh cookie μπαίνει με `Secure`.
  - Useful όταν τρέχεις πίσω από HTTPS reverse proxy.
- **`RENTPRO_COOKIE_SAMESITE`** (default: `lax`): `lax` / `strict` / `none` για το refresh cookie.
- **`RENTPRO_E2E_SEED`** (default: `0`): αν είναι `1`, κάνει seed fixtures στο startup.
- **`RENTPRO_E2E_PASSWORD`** (default: `rentpro-e2e`): password που χρησιμοποιείται όταν `RENTPRO_E2E_SEED=1`.

### Startup validation (optional)

- **`RENTPRO_STRICT_CONFIG`** (default: `0`)
  - Αν είναι `1`, το backend κάνει πιο αυστηρό validation στην εκκίνηση (π.χ. δεν επιτρέπει default `RENTPRO_SECRET_KEY`
    και επιβάλλει αποδεκτές τιμές για `RENTPRO_JWT_ALGORITHM`).

### Observability (optional)

- **`RENTPRO_LOG_LEVEL`** (default: `INFO`)
- **`RENTPRO_JSON_LOGS`**: αν είναι `1`, τα logs γράφονται ως JSON lines.
- **`RENTPRO_LOG_REQUESTS`**: αν είναι `1`, κάνει access-style log για κάθε request (method/path/status/duration) με `request_id`.
- Κάθε response περιλαμβάνει header **`X-Request-ID`** για correlation.
- Simple metrics endpoint: `GET /metrics` (public).

### Rate limiting (optional)

Για demo-friendly throttling στα auth endpoints (in-memory, fixed window, per-IP):

- **`RENTPRO_RATE_LIMIT_ENABLED`**: `1` για enable.
- **`RENTPRO_RATE_LIMIT_LOGIN_PER_MIN`** (default: `120`)
- **`RENTPRO_RATE_LIMIT_REFRESH_PER_MIN`** (default: `240`)

## Συνεισφορά

Για να συνεισφέρετε στο έργο, παρακαλώ δημιουργήστε ένα νέο branch και υποβάλετε pull request με τις αλλαγές σας.

## Άδεια

Αυτή η εφαρμογή είναι διαθέσιμη υπό την άδεια MIT.