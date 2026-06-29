# dressup.exe - AI Virtual Styling Platform

![GitHub repo size](https://img.shields.io/github/repo-size/Sissighn/dressup-exe?style=flat-square&color=1a1a1a)
![GitHub last commit](https://img.shields.io/github/last-commit/Sissighn/dressup-exe?style=flat-square&color=1a1a1a)
![License](https://img.shields.io/badge/License-MIT-1a1a1a?style=flat-square)

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.128-009688?style=flat-square&logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-CB2C28?style=flat-square)
![Alembic](https://img.shields.io/badge/Alembic-migrations-6B7280?style=flat-square)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![PyJWT](https://img.shields.io/badge/PyJWT-2.10-111827?style=flat-square)
![Pillow](https://img.shields.io/badge/Pillow-image%20processing-3776AB?style=flat-square&logo=python&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React%20Router-v7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-9-4B32C3?style=flat-square&logo=eslint&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)
![CSS Modules](https://img.shields.io/badge/CSS%20Modules-custom%20brutalist%20UI-000000?style=flat-square&logo=css3&logoColor=white)

dressup.exe is a full-stack AI fashion application that turns a face scan into a personalized digital model, combines selected wardrobe pieces into generated outfit renders, and manages a visual archive of created looks.

![Auth Page](docs/auth.png)

The project combines:

- AI image generation workflows
- a Python + FastAPI backend with persistent closet data (SQLite)
- a JavaScript + React + Vite frontend with a custom brutalist-inspired UI

---

## Highlights

- **Secure Authentication** (email/password) with modern password policy
- **HttpOnly Cookie Sessions** with validated JWT claims (`iss`, `aud`, `iat`, `jti`)
- **Guest Mode** with isolated one-session data behavior
- **Account-Scoped Data Isolation** for closet, lookbook, avatar, and profile state
- **Protected Upload Delivery** for private user assets instead of public static file serving
- **Rate-Limited Sensitive Endpoints** for auth, uploads, avatar generation, and try-on generation
- **AI Avatar Generation** from biometric input (height, weight, body type, gender, face scan)
- **AI Outfit Try-On** by compositing avatar + top + bottom references
- **Digital Closet Management** (upload, auto background removal, categorize, browse, delete)
- **Lookbook Archive** for generated outfits with delete flow
- **Strict Portrait Framing Pipeline** (9:16 / 1080x1920) with full-body validation retries
- **Profile Avatar UX**: circle profile image in header (from uploaded face scan) with Wardrobe dropdown menu for logout

---

## Tech Stack

### Frontend (JavaScript)

- React 19
- React Router
- Vite
- CSS Modules + custom styling

### Backend (Python)

- FastAPI
- SQLAlchemy
- SQLite
- Alembic migrations
- PyJWT authentication
- Pillow (image pre/post-processing)
- Google Gemini API (`gemini-2.5-flash-image`, `gemini-2.5-flash`)

### Infrastructure

- Docker Compose for local full-stack startup
- Nginx container for serving the production frontend build
- Environment-based API, asset, CORS, and cookie configuration

---

## Project Structure

frontend/

- JavaScript React application (Wardrobe, Closet, Avatar, Gallery, About)

backend/

- Python FastAPI app split into routers, schemas, security, storage, and AI services
- Alembic migrations for database schema changes
- protected `uploads/` file storage

database/

- SQLite database file (`closet.db`)

---

## Core User Flows

1. **Create model** in the Avatar page using biometric data + face scan.
2. **Upload clothing items** to categorized closet sections.
3. **Select top and bottom** in Wardrobe and run AI try-on.
4. **Save / archive generated looks** and review them in Lookbook.
5. **Manage archive** with in-app delete confirmation UI.

---

## Local Development Setup

### 1) Clone

```bash
git clone https://github.com/Sissighn/dressup-exe.git
cd dressup-exe
```

### 2) Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate

pip install -r requirements.txt
```

### 3) Environment variables

Create a `.env` file in `backend/`:

```bash
GOOGLE_API_KEY=your_google_ai_key_here
AUTH_SECRET_KEY=your_long_random_secret_here
AUTH_TOKEN_ISSUER=dressup-exe-api
AUTH_TOKEN_AUDIENCE=dressup-exe-client
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAMESITE=lax
MAX_UPLOAD_BYTES=10485760
MAX_UPLOAD_PIXELS=24000000
APP_BASE_URL=http://localhost:8000
PUBLIC_ASSET_BASE_URL=http://localhost:8000
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000
```

`AUTH_SECRET_KEY` is required. It should be a long random secret (high entropy), unique per environment, and at least 32 characters long.
For production over HTTPS, set `AUTH_COOKIE_SECURE=true`.

For the frontend, optional Vite environment variables can be placed in `frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

### 4) Run backend

```bash
alembic -c alembic.ini upgrade head
uvicorn main:app --reload --port 8000
```

### 5) Run frontend (new terminal)

```bash
cd frontend
npm install
npm run dev

Frontend: http://localhost:5173
Backend: http://localhost:8000
```

### Docker setup

The full stack can also be built and started with Docker Compose:

```bash
docker compose up --build
```

Docker URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

The Docker setup runs Alembic before starting the API, persists generated assets in `backend/uploads/`, and persists the SQLite database in `database/`.

---

## Tests & Quality Gates

Backend tests use `pytest` with FastAPI `TestClient`, temporary SQLite storage, and mocked AI/background-removal boundaries:

```bash
cd backend
python -m pytest -q --cov=. --cov-report=term-missing
```

Frontend unit tests use Vitest + React Testing Library:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

The Playwright happy path runs against a mocked backend and covers guest login, avatar creation, closet upload, outfit generation, and archive:

```bash
cd frontend
npx playwright install chromium
npm run e2e
```

GitHub Actions runs backend tests, frontend lint/tests/build, Playwright E2E, production dependency audit, and Gitleaks secret scanning on pushes and pull requests.

---

## Security & Deployment Notes

- Authentication uses HttpOnly cookies and JWT validation with issuer, audience, issued-at, expiry, and token ID claims.
- `AUTH_SECRET_KEY` is required and must be unique per environment; the backend refuses unsafe production fallback secrets.
- Uploads are validated by extension, MIME type, file size, pixel count, and actual image parsing with Pillow.
- Private generated assets are served through an authenticated `/uploads/{filename}` route with account ownership checks.
- Sensitive routes include in-memory rate limiting for safer local and portfolio deployment demos.
- Docker Compose builds the frontend and backend separately and runs database migrations automatically on backend startup.

---

## API Overview

### Authentication & Profile

- `POST /auth/register` — register with email/password
- `POST /auth/login` — login with email/password
- `POST /auth/guest` — start isolated guest session
- `GET /auth/me` — validate current token/session
- `GET /profile` — get persisted user profile (avatar + biometrics)
- `PUT /profile` — update persisted user profile

### Core Features

- `POST /generate-avatar` — generate avatar from biometrics + face scan
- `POST /try-on-outfit` — generate try-on image from avatar/top/bottom
- `POST /upload-item` — upload and save closet item metadata
- `GET /closet` — list closet items
- `DELETE /delete-item/{item_id}` — remove closet item and image file
- `POST /archive-look` — archive generated look image
- `GET /gallery` — list archived looks
- `DELETE /delete-look/{filename}` — remove archived look
- `GET /providers/check` — check configured AI provider status

---

## Design Notes

The interface intentionally uses a bold editorial/brutalist aesthetic:

- high-contrast borders
- mono + serif typography pairing
- card-based visual hierarchy
- strong micro-interactions for action states

This design direction supports portfolio storytelling while keeping usability clear.

---

## Current Status

This project is actively evolving with iterative UX refinements and feature hardening.

Planned improvements include:

- cloud storage for assets
- CI/CD deployment pipeline
- automated tests (frontend + backend)

---

## License

MIT License © 2026 Setayesh Golshan
