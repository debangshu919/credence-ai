<div align="center">

# CredenceAI

<p>
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/LangChain-AI%20Orchestration-1C3C3C?style=for-the-badge" alt="LangChain">
  <img src="https://img.shields.io/badge/LangGraph-Agentic%20Workflows-blue?style=for-the-badge" alt="LangGraph">
  <img src="https://img.shields.io/badge/Tavily-Evidence%20Retrieval-orange?style=for-the-badge" alt="Tavily">
</p>

<p>
  <a href="https://credence-ai-eta.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel" alt="Live Demo">
  </a>
  <a href="https://github.com/Synapse-CodeX/Credence-AI">
    <img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub">
  </a>
</p>

<img width="853" alt="CredenceAI Demo" src="https://github.com/user-attachments/assets/8ad84f90-8ae9-4591-af8a-587896f8c505" />

### Verify Claims • Retrieve Evidence • Detect AI-Generated Content

**CredenceAI** is a multimodal AI-powered fact verification platform that analyzes unstructured content, extracts factual claims, retrieves external evidence, and produces claim-level verification results with confidence scores, reasoning, and cited sources.

It also provides AI-generated content detection for **text, images, and videos**, including deepfake analysis for supported media.

</div>

---

## Features

- **Claim Extraction** – Decomposes submitted content into individual factual claims.
- **Evidence Retrieval** – Searches external sources using Tavily to gather supporting and conflicting evidence.
- **AI Verification** – Uses LLM-powered reasoning to evaluate claims against retrieved evidence.
- **Claim-Level Reports** – Provides verdicts, confidence scores, reasoning, and cited sources.
- **Real-Time Verification** – Streams verification progress and results to the frontend using Server-Sent Events (SSE).
- **AI Text Detection** – Estimates whether submitted text is likely AI-generated or human-written.
- **AI Image Detection** – Analyzes images for AI-generation signals and synthetic artifacts.
- **AI Video Detection** – Extracts and analyzes video frames for AI-generated content and deepfake signals.
- **Modern Web Interface** – React-based frontend designed for interactive fact-checking and analysis.

---

## Architecture Overview

```text
                         ┌──────────────────────┐
                         │      React UI        │
                         │      Frontend        │
                         └──────────┬───────────┘
                                    │
                              REST / SSE
                                    │
                         ┌──────────▼───────────┐
                         │       FastAPI        │
                         │       Backend        │
                         └──────────┬───────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
           Claim Verification   AI Detection     Media Analysis
                  │                 │                 │
                  ▼                 ▼                 ▼
             LLM Reasoning      Text Analysis    Image / Video
                  │                              Deepfake Analysis
                  ▼
           Tavily Evidence Search
                  │
                  ▼
          Claim-Level Verification
                  │
                  ▼
       Verdict + Confidence + Sources
````

### Core Stack

* **Frontend:** React
* **Backend:** FastAPI
* **AI Orchestration:** LangChain, LangGraph
* **LLM Providers:** Configurable LLM backends including OpenAI/Groq-based inference
* **Evidence Retrieval:** Tavily
* **Real-Time Communication:** Server-Sent Events (SSE)
* **Media Analysis:** Sightengine and dedicated image/video processing pipelines
* **Deployment:** Vercel + Render

---

## Installation

### Prerequisites

* Node.js ≥ 18
* Python ≥ 3.10
* Git

### Clone the Repository

```bash
git clone https://github.com/debangshu919/credence-ai.git
cd Credence-AI
```

### Backend Setup

```bash
cd backend

python -m venv .venv
```

Activate the environment:

**Windows**

```bash
.venv\Scripts\activate
```

**Linux / macOS**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside `backend/` and configure the required API keys and application settings.

Start the backend:

```bash
uvicorn app.main:app --reload
```

The API will be available at:

```text
http://localhost:8000
```

### Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm start
```

The frontend will normally be available at:

```text
http://localhost:3000
```

---

## Environment Variables

The backend requires API credentials for the services enabled in the application.

Typical configuration includes:

```env
SIGHTENGINE_API_USER=your_user
SIGHTENGINE_API_SECRET=your_secret

TAVILY_API_KEY=your_tavily_key

LLM_BASE_URL=your_llm_base_url
LLM_MODEL_FAST=your_fast_model
LLM_MODEL_REASONING=your_reasoning_model

GROQ_API_KEY=your_groq_key

CORS_ORIGINS=http://localhost:3000

DEBUG=True
```

Additional variables may be required depending on the selected LLM and media-analysis configuration.

**Never commit `.env` files or API keys to GitHub.**

---

## Running the Application

Start the backend:

```bash
cd backend
uvicorn app.main:app --reload
```

Then start the frontend:

```bash
cd frontend
npm start
```

Open:

```text
http://localhost:3000
```

You can then:

1. Submit text for fact verification.
2. Extract and verify individual claims.
3. View retrieved evidence and cited sources.
4. Analyze text for AI-generated content.
5. Upload images for AI-generation detection.
6. Upload videos for frame-level AI/deepfake analysis.

---

## Project Structure

```text
Credence-AI/
│
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   ├── verify.py
│   │   │   ├── report.py
│   │   │   ├── history.py
│   │   │   ├── detect_text.py
│   │   │   └── detect_media.py
│   │   │
│   │   ├── services/
│   │   └── main.py
│   │
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── App.js
│   │
│   ├── public/
│   └── package.json
│
└── README.md
```

---

## Testing

### Backend

```bash
cd backend
pytest
```

### Frontend

```bash
cd frontend
npm test
```

---

## Deployment

CredenceAI uses a separated production deployment architecture:

```text
React Frontend
      │
      ▼
   Vercel
      │
      │ API Requests / SSE
      ▼
FastAPI Backend
      │
      ▼
   Render
```

### Production

* **Frontend:** Vercel
* **Backend:** Render
* **Frontend API configuration:** `REACT_APP_BACKEND_URL`
* **Backend CORS:** Configured through environment variables

### Live Demo

**Frontend:**
[https://credence-ai-eta.vercel.app/](https://credence-ai-eta.vercel.app/)

**Backend:**
[https://credence-ai-backend-rzip.onrender.com/](https://credence-ai-backend-rzip.onrender.com/)

---

## Development Workflow

```bash
# Backend linting
ruff check .

# Backend tests
pytest

# Frontend build
npm run build

# Frontend development
npm start
```

---

## Why CredenceAI?

Online information can contain factual claims, manipulated media, and AI-generated content that are difficult to evaluate manually.

CredenceAI combines **claim decomposition, external evidence retrieval, LLM reasoning, and multimodal AI detection** into a single platform for faster and more transparent content verification.

---

## License

This project is intended for educational, research, and demonstration purposes.

---



