# 📋 Αναλυτική Λίστα Εργασιών Ανάπτυξης Εφαρμογής Διαχείρισης Μισθώσεων

## 1. Βασικά Υποσυστήματα

### 1.1 Ρύθμιση Περιβάλλοντος

#### 🗂 Git & Δομή Έργου
- [ ] Δημιουργία αποθετηρίου Git
- [ ] Ρύθμιση `.gitignore`
- [ ] Δημιουργία φακέλων `backend/`, `frontend/`, `docs/`

#### ⚙️ Backend (FastAPI/Flask)
- [ ] Ρύθμιση virtualenv / poetry
- [ ] Εγκατάσταση βιβλιοθηκών (`fastapi`, `uvicorn`, `sqlalchemy`)
- [ ] Δημιουργία βασικής δομής φακέλων (`routers/`, `models/`, `schemas/`, `db/`)

#### 🎨 Frontend (React)
- [ ] Δημιουργία React app
- [ ] Ρύθμιση TypeScript (προαιρετικά)
- [ ] Ρύθμιση MUI ή Tailwind

#### 🐳 Docker
- [ ] `Dockerfile` για backend
- [ ] `Dockerfile` για frontend
- [ ] `docker-compose.yml` για όλα
- [ ] Έλεγχος σύνδεσης frontend ↔ backend

#### 📝 README
- [ ] Περιγραφή έργου
- [ ] Οδηγίες εγκατάστασης
- [ ] Περιγραφή αρχιτεκτονικής

---

### 1.2 Authentication

- [ ] Μοντέλο χρήστη (User) με ρόλο `Ιδιοκτήτης`
- [ ] Endpoint εγγραφής `/register` (με hash password)
- [ ] Endpoint σύνδεσης `/login` (JWT)
- [ ] Middleware για JWT έλεγχο
- [ ] React φόρμα `RegisterForm`
- [ ] React φόρμα `LoginForm`
- [ ] Αποθήκευση token στο `localStorage`
- [ ] Route protection στο React (π.χ. PrivateRoute)

---

### 1.3 CRUD Ακινήτων

- [ ] Μοντέλο `Property` με πεδία: τίτλος, περιγραφή, τιμή, φωτογραφίες
- [ ] Σχέση `owner_id` (ForeignKey)
- [ ] Endpoints: `GET`, `POST`, `PUT`, `DELETE`, `GET /{id}`
- [ ] React component: `PropertyList`
- [ ] React component: `PropertyForm`
- [ ] React component: `PropertyDetails`
- [ ] Upload & preview φωτογραφιών

---

### 1.4 CRUD Συμβολαίων

- [ ] Μοντέλο `Contract` (ημερομηνία, ποσό, property_id, tenant_id)
- [ ] CRUD Endpoints
- [ ] React: `ContractForm`
- [ ] Επιλογή από dropdown για ακίνητο και ενοικιαστή

---

### 1.5 CRUD Ενοικιαστών

- [ ] Μοντέλο `Tenant` (όνομα, ΑΦΜ, τηλέφωνο)
- [ ] CRUD Endpoints
- [ ] React: `TenantForm`, `TenantList`
- [ ] Προβολή ιστορικού μισθώσεων

---

### 1.6 Upload αρχείων (PDF)

- [ ] Endpoint για PDF upload
- [ ] Σύνδεση με `Contract`
- [ ] Αποθήκευση σε `/uploads/`
- [ ] React: επιλογή αρχείου, preview, download

---

### 1.7 Υπενθυμίσεις

- [ ] Λογική για λήξεις συμβολαίων
- [ ] Scheduled task (cron ή Celery)
- [ ] Πίνακας `Notifications`
- [ ] React: component ειδοποιήσεων

---

### 1.8 Αναφορές / Στατιστικά

- [ ] SQL query για συνολικά έσοδα ανά μήνα
- [ ] Endpoint: `/reports/revenue`
- [ ] React component: πίνακας και γράφημα
- [ ] Φίλτρα: μήνας, έτος, κατάσταση

---

### 1.9 Testing / Debugging

- [ ] Backend tests με `pytest`
- [ ] Έλεγχος API με Postman
- [ ] UI tests με `react-testing-library`
- [ ] Έλεγχος edge cases

---

## 2. Σύστημα Συστάσεων (MCDM)

### 2.1 Φόρμα Προτιμήσεων

- [ ] React φόρμα με sliders ή inputs
- [ ] Ορισμός βαρών για: τιμή, περιοχή, μέγεθος, όροφος

### 2.2 Υλοποίηση MCDM Αλγορίθμου

- [ ] Επιλογή αλγορίθμου: SAW ή TOPSIS
- [ ] Κανονικοποίηση δεδομένων
- [ ] Υπολογισμός scores βάσει βαρών

### 2.3 Διασύνδεση με Backend

- [ ] Endpoint: `/recommendations`
- [ ] Ανάκτηση διαθέσιμων ακινήτων
- [ ] Ταξινόμηση βάσει scores

### 2.4 Προβολή Προτάσεων

- [ ] React: `RecommendationsList`
- [ ] Προβολή score κάθε ακινήτου
- [ ] Highlight καλύτερης πρότασης
- [ ] Tooltip με εξήγηση επιλογής

---

## 3. Τεκμηρίωση / Παράδοση

### 3.1 Τεκμηρίωση

- [ ] README με οδηγίες εγκατάστασης
- [ ] Swagger UI ή Postman collection
- [ ] Inline σχόλια στον κώδικα

### 3.2 Διαγράμματα & Screenshots

- [ ] ER διάγραμμα
- [ ] UML Use Case & Component
- [ ] Screenshots UI (login, property, reports)

### 3.3 Θεωρητικό Μέρος

- [ ] Περιγραφή MVC αρχιτεκτονικής
- [ ] Ανάλυση MCDM αλγορίθμου
- [ ] Επιλογή τεχνολογιών και αιτιολόγηση

### 3.4 Τελική Παράδοση

- [ ] PowerPoint ή PDF παρουσίασης
- [ ] ZIP με snapshot (κώδικας, DB, docs)
- [ ] Ολοκληρωμένη εγκατάσταση / demo