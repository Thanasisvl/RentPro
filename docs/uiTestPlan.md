# 🧪 RentPro — UI Test Plan

## Σκοπός
Να οριστεί ένα πρακτικό, επεκτάσιμο πλάνο **UI testing** για το RentPro, που:

- δίνει **γρήγορο feedback** σε κάθε PR (component/integration tests)
- “κλειδώνει” τις βασικές ροές χρήστη με **E2E tests** (πραγματικός browser)
- μειώνει flaky tests με σταθερή στρατηγική selectors και test data

## Πεδίο κάλυψης (Scope)

### Public routes
- `/` Landing
- `/search` Public property search
- `/search/properties/:id` Public property details
- `/login`, `/register`

### Protected routes (auth + role-based)
- `/app` (redirect ανά ρόλο)
- Tenant: `/app/tenant`, `/preferences`, `/recommendations`
- Owner/Admin: `/app/owner`, `/properties`, `/tenants`, `/contracts`
- Admin-only: `/app/admin`, `/app/admin/users`
- Common: `/profile`, logout

## Εργαλεία & επίπεδα tests

### 1) Component / Integration UI Tests (γρήγορα, σταθερά)
- **Framework**: Jest + React Testing Library (υπάρχει ήδη μέσω `react-scripts test`)
- **Scope**: components/pages με mocked API
- **Τρέχουν**: σε κάθε PR

**Πού μπαίνουν τα tests**
- `frontend/src/**/__tests__/**/*.test.js` ή απλά `frontend/src/**/*.test.js`
- Naming: `ComponentName.test.js`

**Mocking**
- Απλό: `jest.mock("../api")` για functions όπως `login()`
- Πιο ρεαλιστικό (προαιρετικό): MSW (Mock Service Worker) για HTTP-level mocking

### 2) End-to-End (E2E) UI Tests (υψηλή εμπιστοσύνη)
- **Framework (πρόταση)**: Playwright (ή Cypress)
- **Scope**: πραγματικός browser, routing, auth cookies/refresh, backend integration
- **Τρέχουν**:
  - “Smoke” suite σε κάθε PR
  - “Full” suite nightly ή πριν release

## Test Data Strategy (κριτικό για E2E)
Διάλεξε 1 από τα παρακάτω (με σειρά προτίμησης):

1) **Seed test users + fixtures σε test DB**
- Σταθεροί χρήστες: `tenant1`, `owner1`, `admin1` (σταθερά credentials)
- Fixtures: 3–5 properties, 1–2 tenants, 1–2 contracts

2) **API-driven setup μέσα στο test**
- Το test κάνει request στο backend `/login` για token/cookie και μετά ανοίγει το app με προ-ρυθμισμένο storage/cookies.

3) **UI-driven setup**
- `register → login` μέσα από UI. Χρήσιμο για 1 smoke test, αλλά πιο αργό/εύθραυστο.

**Σημείωση auth**
- Το frontend χρησιμοποιεί localStorage key `token` (access token) και refresh cookie από backend.
- Protected gating γίνεται με `RequireAuth` (redirect σε `/login` όταν δεν υπάρχει token).

## Στρατηγική selectors (για να μη σπάνε τα tests)
- Προτίμησε **accessibility selectors**:
  - `getByRole(...)`, `getByLabelText(...)`, `getByText(...)`
- Πρόσθεσε `data-testid` **μόνο** όπου:
  - το UI είναι icon-only χωρίς προσβάσιμο label
  - οι δομές αλλάζουν συχνά (π.χ. MUI tables/actions) και θες σταθερό selector
- Απόφυγε selectors τύπου “.MuiButton-root:nth-child(3)”

## Test Suites & προτεραιότητες

### P0 — Smoke (σε κάθε PR)
**Στόχος**: επιβεβαίωση ότι το app “στέκεται” και οι βασικές πύλες/ροές δουλεύουν.

- **P0-AUTH-01**: Protected route χωρίς token → redirect `/login`
- **P0-AUTH-02**: Login success → navigate `/app` → role redirect:
  - TENANT → `/app/tenant`
  - OWNER → `/app/owner`
  - ADMIN → `/app/admin`
- **P0-AUTH-03**: Login failure → εμφανίζεται error message
- **P0-PUBLIC-01**: `/search` φορτώνει results ή empty state χωρίς crash
- **P0-PUBLIC-02**: click σε property result → `/search/properties/:id` δείχνει βασικές λεπτομέρειες

### P1 — Core business journeys (nightly / pre-release)
**Owner/Admin**
- **P1-PROP-01**: `/properties` list → open details `/properties/:id`
- **P1-PROP-02**: Create property `/properties/new` → success → εμφανίζεται στη λίστα ή details
- **P1-PROP-03**: Edit property `/properties/:id/edit` → success → ενημερωμένα πεδία

**Tenant**
- **P1-PREF-01**: Save preferences `/preferences` → success feedback
- **P1-REC-01**: `/recommendations`:
  - έχει recommendations → εμφανίζει κάρτες/λίστα
  - δεν έχει profile → εμφανίζει empty/guide state

**Contracts**
- **P1-CONTRACT-01**: `/contracts` list → open `/contracts/:id`
- **P1-CONTRACT-02**: Create contract `/contracts/new` (+ upload PDF αν υπάρχει) → success
- **P1-CONTRACT-03**: Edit contract `/contracts/:id/edit` → success

### P2 — Admin / Permissions / Negative tests (pre-release)
- **P2-PERM-01**: OWNER δεν έχει πρόσβαση σε admin pages → redirect (ή “forbidden” αν υπάρχει)
- **P2-ADMIN-01**: `/app/admin/users` φορτώνει λίστα χρηστών (και βασικά filters αν υπάρχουν)
- **P2-ROBUST-01**: Simulate 401 σε protected API call → refresh flow → retry success (1–2 tests μόνο)

## Test Matrix (ρόλοι × διαδρομές)

### Unauthenticated
- Επιτρέπονται: `/`, `/search`, `/search/properties/:id`, `/login`, `/register`
- Απαγορεύονται: `/app/*`, `/properties`, `/tenants`, `/contracts`, `/preferences`, `/recommendations`, `/profile`

### TENANT
- Επιτρέπονται: `/app/tenant`, `/search`, `/preferences`, `/recommendations`, `/profile`
- Απαγορεύονται: owner/admin management (`/properties`, `/tenants`, `/contracts`, `/app/admin*`)

### OWNER
- Επιτρέπονται: `/app/owner`, `/properties`, `/tenants`, `/contracts`, `/profile`
- Απαγορεύονται: `/app/admin*`

### ADMIN
- Επιτρέπονται: όλα (συμπεριλαμβανομένων `/app/admin`, `/app/admin/users`)

## Δομή test cases (Given / When / Then)
Για κάθε test case κράτα:
- **Given**: ρόλος, seeded data, αρχικό route
- **When**: user actions (type/click/navigate)
- **Then**:
  - URL/route σωστό
  - βασικά UI στοιχεία ορατά (title, CTA buttons, rows/cards)
  - success/error/empty/loading state σωστά
  - (για E2E) κρίσιμα side-effects (π.χ. νέο item στη λίστα)

## Πρόταση για οργάνωση αρχείων (ενδεικτικά)

### Jest/RTL
- `frontend/src/components/**.test.js`
- `frontend/src/pages/**.test.js` (αν αργότερα ξεχωρίσουν “pages”)

### Playwright
- `frontend/e2e/auth.spec.ts`
- `frontend/e2e/public-search.spec.ts`
- `frontend/e2e/owner-properties.spec.ts`
- `frontend/e2e/contracts.spec.ts`
- `frontend/e2e/admin-users.spec.ts`

## CI (GitHub Actions) — πρόταση προσθήκης
Το υπάρχον CI τρέχει backend tests. Για UI plan:

- **Job: frontend-unit**
  - `npm ci` (στο `frontend/`)
  - `npm test -- --watchAll=false`
- **Job: e2e-smoke**
  - start backend + frontend
  - run Playwright “smoke” project/suite
  - upload artifacts (screenshots/videos) σε failure
- **Job: e2e-full (optional)**
  - scheduled nightly ή manual dispatch

## Συντήρηση & κανόνες αξιοπιστίας
- Κράτα **λίγα E2E** (P0 + 2–3 P1 journeys). Τα υπόλοιπα να είναι RTL tests.
- Όταν ένα E2E σπάει συχνά:
  - βελτίωσε selectors (roles/labels/testids)
  - σταθεροποίησε test data (fixtures/seed)
  - αφαίρεσε sleeps, χρησιμοποίησε explicit waits για UI state

