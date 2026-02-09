# 🧪 RentPro — Manual Test Plan (ανά Use Case)

Στόχος: πρακτικό πλάνο **manual testing** για να ελέγξεις την εφαρμογή end‑to‑end, με **τουλάχιστον 1 test ανά UC (UC‑01..UC‑06)** και αναλυτικές οδηγίες εκτέλεσης.

---

## 1) Προαπαιτούμενα / Περιβάλλον

### 1.1 Συνιστώμενο setup
- **Docker demo stack** (nginx UI + FastAPI API) από το root του repo.

### 1.2 URLs
- **UI**: `http://localhost` (ή `http://localhost:<WEB_PORT>`)
- **API**: `http://localhost/api`
- **Health**: `http://localhost/api/health`
- **Swagger / OpenAPI**: `http://localhost/api/docs`
- **Metrics**: `http://localhost/api/metrics`

---

## 2) Πώς “τρέχεις” τα manual tests (Runbook)

### 2.1 Ρύθμιση seed δεδομένων (μία φορά)
1. Από το root:
   - `cp .env.example .env`
2. Άνοιξε το `.env` και βάλε **οπωσδήποτε**:
   - `RENTPRO_SECRET_KEY=<κάποια_τιμή>` (π.χ. `dev-secret-local`)
   - `RENTPRO_E2E_SEED=1`
   - (προαιρετικά) `RENTPRO_E2E_PASSWORD=rentpro-e2e`

### 2.2 Εκκίνηση εφαρμογής
Από το root:
- `docker compose up --build`

Έπειτα έλεγξε ότι “αναπνέει”:
- Άνοιξε `http://localhost/api/health` → πρέπει να δεις **`{"status":"ok"}`**

### 2.3 Seed λογαριασμοί (credentials)
- **ADMIN**: `admin1` / `rentpro-e2e`
- **OWNER**:
  - `owner1` / `rentpro-e2e`
  - `owner2` / `rentpro-e2e`
  - `owner3` / `rentpro-e2e`
  - `owner4` / `rentpro-e2e`
  - `owner5` / `rentpro-e2e`
- **TENANT/USER**:
  - `tenant1` / `rentpro-e2e`
  - `tenant2` / `rentpro-e2e`

### 2.3.1 Seed tenants (domain records για συμβόλαια)
Αυτά δεν είναι login accounts—είναι εγγραφές ενοικιαστών που ανήκουν στον `owner1` και σε βοηθούν στα UC‑05 flows:
- **E2E Seed Tenant**: AFM `123456789`, phone `6900000000`, email `seed.tenant@example.com`
- **E2E Seed Tenant 2**: AFM `987654321`, phone `6900000001`, email `seed.tenant2@example.com`

### 2.4 Reset demo δεδομένων (όταν “μπερδευτούν” τα tests)
- Stop: `docker compose down`
- **Πλήρες reset (DB + uploads volumes)**: `docker compose down -v`

### 2.5 Evidence checklist (για bug reports)
Για κάθε αποτυχία κράτα:
- **Screenshot** (UI + error message).
- **Browser DevTools → Network**: request URL, method, status code, response body.
- **Response header `X-Request-ID`** (αν υπάρχει) για correlation.
- (Προαιρετικά) snapshot από `http://localhost/api/metrics`.

---

## 3) Προτεινόμενη σειρά εκτέλεσης (για σταθερότητα)
1. **P0 Smoke**: UC01‑M02 → UC01‑M01 → UC01‑M03 → UC03‑M01
2. **Owner flows**: UC02‑M01 → UC05‑M01 → UC05‑M02
3. **Tenant flows**: UC04‑M01
4. **Admin flows**: UC06‑M01 → UC06‑M02
5. Αν κάτι “στραβώσει”, κάνε `docker compose down -v` και ξεκίνα από την αρχή.

---

## 4) Manual Tests ανά Use Case (Given / When / Then)

### UC‑01 — Εγγραφή / Σύνδεση / Αποσύνδεση (Auth + refresh)

#### UC01‑M01 Login + role redirect
- **Given**: demo stack up, seed enabled.
- **When**:
  1. Άνοιξε `http://localhost/login`
  2. Κάνε login ως `tenant1` / `rentpro-e2e`
- **Then**:
  - Μετά το login γίνεται redirect στο `/app` και τελικά καταλήγεις στο **`/app/tenant`**
  - Το navbar δείχνει authenticated state (π.χ. υπάρχει “Προφίλ” και δυνατότητα Logout)

#### UC01‑M02 Protected route χωρίς token → redirect `/login`
- **Given**: incognito / καθαρό session.
- **When**: άνοιξε `http://localhost/properties`
- **Then**: redirect σε **`/login`**

#### UC01‑M03 Logout
- **Given**: είσαι logged‑in (οποιοσδήποτε ρόλος).
- **When**: πάτα Logout.
- **Then**:
  - επιστρέφεις σε public κατάσταση
  - αν ανοίξεις `/app` ή `/properties` σε πετάει ξανά στο `/login`

---

### UC‑02 — Διαχείριση Ακινήτων (OWNER/ADMIN CRUD)

#### UC02‑M01 Owner δημιουργεί νέο ακίνητο
- **Given**: login ως `owner1` / `rentpro-e2e`.
- **When**:
  1. Πήγαινε `Ακίνητα` → `/properties`
  2. Πάτα **“Νέο ακίνητο”**
  3. Συμπλήρωσε: τίτλο, διεύθυνση, τύπο, τ.μ., €/μήνα
  4. Πάτα **Αποθήκευση**
- **Then**:
  - βλέπεις επιτυχία (navigation σε `/properties/:id` ή το νέο ακίνητο εμφανίζεται στη λίστα)
  - τα πεδία εμφανίζονται σωστά στο details

**Σημείωση (αρνητικό/validation)**: άφησε απαιτούμενο πεδίο κενό ή βάλε invalid τιμή → αναμένεις UI error και/ή API 422 στο Network.

---

### UC‑03 — Αναζήτηση & Προβολή Ακινήτων (public + gated details)

#### UC03‑M01 Public search χωρίς login + details
- **Given**: **χωρίς login**.
- **When**:
  1. Άνοιξε `http://localhost/search`
  2. Εφάρμοσε φίλτρα (περιοχή/τύπος/εύρος τιμής/εύρος τ.μ.) και εκτέλεσε αναζήτηση
  3. Πάτα “Προβολή” σε ένα αποτέλεσμα
- **Then**:
  - εμφανίζονται αποτελέσματα ή σωστό empty state
  - στο details (`/search/properties/:id`) εμφανίζονται βασικές πληροφορίες χωρίς να ζητηθεί login (για AVAILABLE)

#### UC03‑M02 Invalid ranges (validation)
- **Given**: είσαι στο `/search`.
- **When**: προσπάθησε να βάλεις **min > max** (τιμή ή τ.μ.) (αν το UI το επιτρέπει) ή επιβεβαίωσε μέσω Network ότι το API απαντά με **422**.
- **Then**: εμφανίζεται validation error / μήνυμα και το UI δεν “κολλάει”.

---

### UC‑04 — Προτάσεις Ακινήτων (AHP → TOPSIS)

#### UC04‑M01 Preferences → Recommendations
- **Given**: login ως `tenant1` / `rentpro-e2e`.
- **When**:
  1. Άνοιξε `/preferences`
  2. Ρύθμισε προτιμήσεις (pairwise ή sliders)
  3. Πάτα **“Υποβολή προτιμήσεων”**
  4. Άνοιξε `/recommendations`
- **Then**:
  - βλέπεις σελίδα “Προτάσεις” με ranked αποτελέσματα (αν υπάρχουν διαθέσιμα ακίνητα)
  - αν δεν υπάρχουν διαθέσιμα, βλέπεις empty state (όχι crash)

**Σημείωση (αρνητικό)**: δώσε αντιφατικές AHP συγκρίσεις (όσο επιτρέπει το UI) → αναμένεις inconsistency message (συνήθως API 422).

---

### UC‑05 — Συμβόλαια (CRUD + terminate + PDF upload/download)

#### UC05‑M01 Δημιουργία συμβολαίου + PDF upload/download
- **Given**: login ως `owner1` / `rentpro-e2e`.
- **When**:
  1. (Prereq) Αν δεν υπάρχει ενοικιαστής: πήγαινε `/tenants` → “Νέος ενοικιαστής” → δημιουργία.
  2. Πήγαινε `/contracts/new` και διάλεξε **property + tenant**, βάλε ημερομηνίες + μίσθωμα → **Δημιουργία**.
  3. Κάνε **upload PDF** στο συμβόλαιο (αν υπάρχει UI action για upload).
  4. Πάτα **PDF**/download.
- **Then**:
  - το συμβόλαιο εμφανίζεται στη λίστα `/contracts`
  - το PDF ανοίγει/κατεβαίνει με `content-type: application/pdf`
  - σε incognito, πρόσβαση στο PDF endpoint πρέπει να αποτυγχάνει (auth-guarded)

#### UC05‑M02 Terminate (lifecycle)
- **Given**: υπάρχει ACTIVE συμβόλαιο.
- **When**: πάτα **Τερματισμός** και επιβεβαίωσε.
- **Then**: status γίνεται **TERMINATED** (και όπου φαίνεται, το ακίνητο γίνεται διαθέσιμο).

---

### UC‑06 — Admin / Εποπτεία / RBAC

#### UC06‑M01 Admin users list + filters
- **Given**: login ως `admin1` / `rentpro-e2e`.
- **When**:
  1. Πήγαινε `/app/admin/users`
  2. Δοκίμασε φίλτρο **Ρόλος** (π.χ. OWNER)
  3. Δοκίμασε αναζήτηση `q` (username/email/full_name)
- **Then**:
  - ο πίνακας φορτώνει σωστά
  - τα filters περιορίζουν τα αποτελέσματα
  - το total/pagination (αν εμφανίζεται) ενημερώνεται σωστά

#### UC06‑M02 Forbidden access (RBAC)
- **Given**: login ως `owner1`.
- **When**: άνοιξε `/app/admin/users`.
- **Then**: εμφανίζεται forbidden/403 screen (π.χ. `/forbidden`).

---

## 5) Template bug report (σύντομο)
- **Title**: `[ROLE][AREA] σύντομο` (π.χ. `[OWNER][CONTRACTS] PDF download without auth works`)\n
- **Env**: local docker demo, seed on/off, timestamp\n
- **Steps**: Given/When/Then\n
- **Expected vs Actual**\n
- **Evidence**: screenshot + Network response + `X-Request-ID`\n

