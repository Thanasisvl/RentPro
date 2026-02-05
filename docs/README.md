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
- **Database**: SQLite (tests/dev) / PostgreSQL (prod-ready)
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

## Χρήση

- **Backend**: Η εφαρμογή θα είναι διαθέσιμη στο `http://localhost:8000`.
- **Frontend**: Η εφαρμογή θα είναι διαθέσιμη στο `http://localhost:3000`.

## Tests

### Backend

```bash
source .venv/bin/activate
pytest backend/tests
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

Τα περισσότερα έχουν defaults για dev/tests. Ενδεικτικά:

- **`RENTPRO_DATABASE_URL`**: π.χ. `sqlite:///./rentpro.db`
- **`RENTPRO_SECRET_KEY`**: secret για JWT (βάλε δική σου τιμή σε production)
- **`RENTPRO_UPLOAD_DIR`**: directory για uploads (default: `backend/uploads`)
- **`ACCESS_TOKEN_EXPIRE_MINUTES`**, **`REFRESH_TOKEN_EXPIRE_DAYS`**

## Συνεισφορά

Για να συνεισφέρετε στο έργο, παρακαλώ δημιουργήστε ένα νέο branch και υποβάλετε pull request με τις αλλαγές σας.

## Άδεια

Αυτή η εφαρμογή είναι διαθέσιμη υπό την άδεια MIT.