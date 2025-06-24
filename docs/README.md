# 📋 README for Housing Service Application

## Εισαγωγή

Αυτή η εφαρμογή είναι μια διαδικτυακή πλατφόρμα διαχείρισης μισθώσεων ακινήτων, σχεδιασμένη για να διευκολύνει την αλληλεπίδραση μεταξύ ιδιοκτητών και ενοικιαστών. Περιλαμβάνει λειτουργίες όπως η αυθεντικοποίηση χρηστών, η διαχείριση ακινήτων και συμβολαίων, καθώς και ένα σύστημα συστάσεων για την εύρεση κατάλληλων ακινήτων.

## Τεχνολογίες

- **Frontend**: React.js
- **Backend**: Python (FastAPI ή Flask)
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose

## Ρύθμιση Περιβάλλοντος

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd HousingService
   ```

2. **Backend Setup**:
   - Navigate to the backend directory:
     ```bash
     cd backend
     ```
   - Create a virtual environment and install dependencies:
     ```bash
     python -m venv venv
     source venv/bin/activate  # On Windows use `venv\Scripts\activate`
     pip install -r requirements.txt
     ```

3. **Frontend Setup**:
   - Navigate to the frontend directory:
     ```bash
     cd ../frontend
     ```
   - Install dependencies:
     ```bash
     npm install
     ```

4. **Docker Setup**:
   - To build and run the application using Docker, navigate to the root directory and run:
     ```bash
     docker-compose up --build
     ```

## Χρήση

- **Backend**: Η εφαρμογή θα είναι διαθέσιμη στο `http://localhost:8000`.
- **Frontend**: Η εφαρμογή θα είναι διαθέσιμη στο `http://localhost:3000`.

## Συνεισφορά

Για να συνεισφέρετε στο έργο, παρακαλώ δημιουργήστε ένα νέο branch και υποβάλετε pull request με τις αλλαγές σας.

## Άδεια

Αυτή η εφαρμογή είναι διαθέσιμη υπό την άδεια MIT.