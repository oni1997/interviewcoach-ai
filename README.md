# Interviewcoach-AI

AI-powered mock interview platform that helps job seekers prepare for technical and behavioral interviews through AI-generated questions, personalized feedback, and interview progress tracking.

## Team

- Onesmus Dzidzai Maenzanise
- Stephanie Dacullo Selanoba
- Philip Izekor
- Bhekimpilo Ncube

## Favorite Quote

> "Building the future starts with asking better questions." Inspired by Tony Stark

## Stephanie Selanoba's Favorite Quote

> "In the end, we only regret the chances we didn't take" --Lewis Carroll

## Philip Izekor's Favorite Quote

> "That which we persist in doing becomes easier, not that the task has changed, but that our ability to do it has increased"

## Bhekimpilo Ncube's Favourite Quote

> "It alaways seems impossible until it's done" - Nelson Mandela

###### Features

## Authentication (Login & Register)

Registration (/register): Allows new users to create an account by submitting their details (ex. email & password). Passwords are securely hashed before being stored in the database.

Login (/login): Authenticates existing users by verifying their credentials. Upon successful login, a session or JWT token is generated to authorize future requests.

## Password Reset (via Resend API)

Reset: Users can enter their email address to request a password reset link if they forget their password. The backend uses the Resend API to securely generate and send a password reset email containing a secure, time-sensitive token link to the user's inbox.

## Resume Management (Upload, View, & Delete)

Upload Resume: Authenticated users can upload their resume file (ex. PDF or DOCX). Files are stored securely in cloud storage.

View Resume: Users or authorized viewers can retrieve and open/preview the uploaded resume directly within the application interface.

Delete Resume: Users can remove their currently uploaded resume from the system, which deletes the file from storage and updates the database reference.

## How to Run

### Prerequisites

- Go 1.22+
- Node.js 20+
- PostgreSQL 16+ running locally

### 1. Setup the database

Start PostgreSQL and create the database:

```bash
psql -U postgres -c "CREATE DATABASE interviewcoach;"
psql -U postgres -d interviewcoach -f database/schema.sql
```

### 2. Configure the backend

Create `backend/.env` (there is already one configured for local development):

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=interviewcoach
JWT_SECRET=interviewcoach-dev-secret-key
SERVER_PORT=8080
GEMINI_API_KEY=your_gemini_key   # optional - app falls back gracefully
```

### 3. Install frontend dependencies

```bash
cd frontend && npm install
```

### 4. Run the app (backend + frontend together)

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

### 5. Demo account

Register a new account from the login page, or use the in-app dev credentials configured
by your instructor to quickly log in.

### Docker (optional)

```bash
docker build -t interviewcoach-backend ./backend
docker run -p 8080:8080 interviewcoach-backend
```

## Features

- Secure user authentication with JWT (login, register, password reset via Resend API)
- Resume upload, view, and delete
- AI-generated interview questions (Gemini → OpenAI → NVIDIA fallback chain)
- AI answer evaluation with per-question scores, strengths, and improvements
- One-question-at-a-time interview flow with 2 attempts per question
- Voice-first interview mode: AI reads questions aloud (TTS), 1-minute speaking window,
  speech-to-text transcription, and full interview audio replay
- Conversational AI: ask for AI follow-up questions mid-interview
- Dashboard with session statistics, interview history, and per-question detail view
- Dark mode toggle and fully responsive mobile design
