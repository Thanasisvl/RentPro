## RentPro

Thesis prototype για διαχείριση μισθώσεων/ακινήτων (React + FastAPI).

### Quickstart (Demo με Docker)

Από το root:

```bash
cp .env.example .env
docker compose up --build
```

- **UI**: `http://localhost`
- **API**: `http://localhost/api` (nginx proxy → backend)
- **Health**: `http://localhost/api/health`

Stop / reset demo data:

```bash
docker compose down
docker compose down -v
```

### Quality-of-life

Ίδιες εντολές μέσω `make`:

```bash
make demo-up
make demo-down
make demo-reset
make logs
make test-ui
make test-backend
```

### Troubleshooting

- **Η πόρτα 80 είναι πιασμένη**: άλλαξε port στο `.env` (π.χ. `WEB_PORT=8080`) και άνοιξε `http://localhost:8080`.
- **Ξέχασες να βάλεις secret**: το `docker compose` απαιτεί `RENTPRO_SECRET_KEY` στο `.env` (δες `.env.example`).
- **Permissions σε volume μετά από αλλαγές**: αν δεις error για write σε `/data` (SQLite/uploads), κάνε `docker compose down -v` για να ξαναδημιουργηθεί το volume.

### Documentation

Δες το πλήρες guide στο `docs/README.md`.

