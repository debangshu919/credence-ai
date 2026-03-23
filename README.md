# CredenceAI

> **CredenceAI** is an AI‑powered fact‑checking and claim‑verification platform built for the hackathon. It combines a FastAPI backend, LangChain/LangGraph orchestration, and a modern React frontend to let users submit text or URLs, retrieve evidence, and receive an accuracy report with citations.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [FAQ](#faq)

---

## Features

- **Multi‑modal input** – Submit raw text or a URL.
- **Claim extraction** – Automatic detection of factual statements.
- **Evidence retrieval** – Powered by Tavily and web search.
- **AI verification** – Uses OpenAI models via LangChain.
- **Rich reports** – Generates a concise accuracy score with source citations.
- **Real‑time updates** – Socket.IO pushes verification progress to the UI.

---

## Architecture Overview

> The system follows a clean separation of concerns:
>
> - **Frontend** (`frontend/`): React + Vite UI, styled with a premium glass‑morphism theme.
> - **Backend** (`backend/`): FastAPI exposing REST endpoints, orchestrated by LangGraph.
> - **AI Layer**: LangChain agents call OpenAI and Tavily APIs.
> - **Database**: PostgreSQL (Supabase/InsForge) stores user history and verification logs.
> - **Real‑time**: Socket.IO bridges backend progress events to the frontend.

---

## Installation

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Poetry** (or `pip` + `virtualenv`)
- **Docker** (optional, for containerised deployment)

### Clone the repository

```bash
git clone https://github.com/debangshu919/gfg-finale.git
cd gfg-finale
```

### Backend setup

```bash
cd backend
poetry install   # or pip install -r requirements.txt
poetry shell      # activate the virtual env
uvicorn app.main:app --reload
```

### Frontend setup

```bash
cd ../frontend
npm install
npm start
```

---

## Running the Application

1. Start the backend (see **Backend setup** above).
2. In a separate terminal, start the frontend.
3. Open `http://localhost:5173` in your browser.
4. Use the UI to submit text or a URL and watch the verification process in real time.

---

## Project Structure

```
credenceai/
├─ backend/            # FastAPI server, LangChain agents
│   ├─ app/            # API routes & services
│   └─ tests/          # Backend test suite
├─ frontend/           # React + Vite UI
│   ├─ src/            # Components, pages, hooks
│   └─ public/         # Static assets
├─ README.md           # ← This file
└─ ...
```

---

## Development Workflow

- **Linting**: `npm run lint` (frontend) and `ruff check .` (backend).
- **Formatting**: `prettier --write .` and `black .`.
- **Testing**: `npm test` and `pytest`.
- **Commit messages**: Follow Conventional Commits.

---

## Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd ../frontend
npm test
```

---

## FAQ

**Q:** *Do I need a Supabase account?*  
**A:** The project supports both Supabase and InsForge. Set the appropriate environment variables (`DATABASE_URL`, `SUPABASE_KEY`, etc.) in a `.env` file.

**Q:** *Can I run the app in Docker?*  
**A:** Yes. See the `Dockerfile` in the repository root for a multi‑stage build.

---

*Last updated: 2026‑03‑22*
