<div align="center">
  <h1>ECHO</h1>
  <h3>Know What's Real.</h3>
  <p>
    Detects suspicious peer-review behavior—like generic reviews, low-specificity feedback, text similarity, and collusion patterns—across OpenReview, arXiv, and Semantic Scholar.
  </p>
</div>

---

## Screenshots

### Telemetry Forensic Dashboard
![ECHO Dashboard](./screenshots/dashboard.png)

### Forensic Report & Visualizer
![ECHO Report](./screenshots/report.png)

### Welcome & Landing Experience
![ECHO Landing](./screenshots/landing.png)

---

## Project Context

Scientific peer review is a critical trust system, but scaling it has introduced issues. As submission volumes climb and AI-generated reviews become cheaper, spot-checking manually doesn't scale. 

ECHO exposes these anomalies. It pulls paper metadata and review text, analyzes them, and flags patterns that warrant a closer look. The objective is to make coordination and low-effort reviews visible so human chairs can make informed decisions.

---

## Targeted Anomalies

ECHO detects four main classes of risk:

* **Low-Specificity & Generic Text**: Reviews relying on broad academic filler language with low vocabulary entropy or weak domain density.
* **Stylometry Similarity**: Reviews whose text is suspiciously close to the paper's own abstract or content.
* **Collusion Patterns**: Reviewer-paper-author graphs with tight cycles suggesting coordinated rings.
* **Behavioral Anomalies**: Burst timing patterns, repeated template phrases, or unusually weak reviewer diversity.

---

## Frontend Interface

The UI is a dark-mode dashboard inspired by modern developer platforms, giving clear access to forensics without clutter:

* **Interactive Landing & Search**: A modern entryway featuring an active search bar and real-time thinking state animations.
* **Forensic Command Dashboard**: Displays the overall verdict gauge, timeline charts, and actionable risk cards.
* **Visual Graph Map & Reports**: Renders an interactive D3 collusion graph, detailed findings, and export options (PDF and JSON).
* **Live Status Monitoring**: A dedicated source-health page showing real-time connectivity states of downstream academic APIs.

---

## Analysis Engines

### Stylometry
We compare the abstract with review text using cosine similarity to detect templated or model-coordinated writing.
It loads a local HuggingFace `all-MiniLM-L6-v2` transformer by default. If HuggingFace is blocked or offline, it falls back to a local lexical similarity engine so analyses never fail.

### Specificity
Estimates how technical a review is by checking:
* Vocabulary entropy.
* Domain-specific vocabulary density.
* Usage frequency of academic filler phrases.

This flags reviews that use broad praise without actual technical depth.

### Collusion
Constructs a directed graph of papers, authors, and reviewers, running NetworkX under the hood to find tight co-review cycles.
*Feature:* Real when the paper has reviews on OpenReview; seeded visualization otherwise so the UI isn't empty.

### APIs & Data Sources
Queries live data from open academic APIs:
* **OpenReview**: Fetches submissions and review text.
* **arXiv**: Gathers preprint metadata.
* **Semantic Scholar**: Resolves citation and graph relationships.

---

## Repository Structure

```text
ECHO
├── backend
│   ├── FastAPI API
│   ├── OpenReview, arXiv, Semantic Scholar fetchers
│   ├── Stylometry analyzer
│   ├── Specificity analyzer
│   ├── Collusion graph analyzer
│   ├── Offline-safe embedding fallback
│   └── SQLite persistence with graceful failure handling
│
└── frontend
    ├── Next.js App Router
    ├── React 19.2.4
    ├── Tailwind CSS
    ├── Framer Motion
    ├── Recharts
    ├── D3 collusion graph
    ├── shadcn-style reusable button primitive
    └── Premium glassmorphic SaaS UI
```

---

## Tech Stack

Frontend:
* **Core Framework**: Next.js 15 (App Router) & React 19.2.4.
* **Styling**: Tailwind CSS v4.
* **Data Visualization**: Recharts & D3.
* **Animations**: Framer Motion.

Backend:
* **Web Server**: Python & FastAPI.
* **AI & Math**: sentence-transformers, NumPy, and SciPy.
* **Graph & Storage**: NetworkX and SQLite.
* **Reporting**: ReportLab (PDF generation).

---

## Setup & Run

**Live demo:** [https://echo-frontend-6xnv.onrender.com](https://echo-frontend-6xnv.onrender.com)

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Backend resolves locally to: `http://127.0.0.1:8000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Frontend resolves locally to: `http://127.0.0.1:3001`

Next.js proxies requests: `/api/*` resolves to `http://127.0.0.1:8000/api/*`

---

## Getting started

Example queries that return full analysis (OpenReview or reference set):

**`Attention Is All You Need`**, **`Denoising Diffusion Probabilistic Models`**, **`Position: The role of open source in AI`**

* Search from the dashboard and run **Analyze** to see stylometry, specificity, and collusion results.
* Open **`/validation`** or `GET /api/benchmark` for confusion matrices and precision/recall on the labeled set.
* Use the source-health page to confirm OpenReview, arXiv, and Semantic Scholar connectivity.

Queries with no review text on OpenReview return `404` or `422` instead of synthetic reviews.

---

## Detection validation

ECHO ships a **labeled review dataset** (`backend/data/labeled_reviews.json`, n=24):

| Engine | Threshold | What it catches |
|--------|-----------|-----------------|
| Stylometry | cosine > **0.80** | Copy-paste / same-voice paper↔review similarity |
| Specificity | composite < **6.0** | Generic academic filler, low entropy |

Run evaluation:

```bash
cd backend
set USE_FALLBACK_EMBEDDER=true
pytest tests/ -q
python -c "from evaluation.benchmark import run_labeled_benchmark; import json; print(json.dumps(run_labeled_benchmark(), indent=2))"
```

Or visit **`/validation`** in the frontend while the API is running.

### External spot-check (held-out, n=5)

Reviews in `backend/data/external_spotcheck.json` are **not** used to tune thresholds. Each entry cites an OpenReview-style source; manual labels were applied independently, then compared to ECHO output.

```bash
GET /api/benchmark/spotcheck
GET /api/benchmark?full=true   # calibration + spot-check + embedder mode
```

See **`DEMO.md`** for the 2-minute live demo script and **`docs/SPOTCHECK_SLIDE.md`** for a one-slide summary.

### Deployed vs local embedder

| Environment | Stylometry embedder |
|-------------|---------------------|
| Render (`RENDER=true`) | `lexical_fallback` (blake2b bag-of-words, 384-d) |
| Local (default) | `sentence-transformers` all-MiniLM-L6-v2 when available |

Specificity does not use the embedder. Compare stylometry scores only within the same mode.

### Honest false-positive rate

* **Stylometry**: Reviewers in narrow subfields may share jargon with the abstract → elevated cosine similarity. ECHO is **triage**, not an automated verdict.
* **Specificity**: Short but substantive reviews can score below threshold; chairs should read flagged text.
* **Collusion**: Cross-paper rings require venue-wide OpenReview data; single-paper graphs are intentionally limited.

---

## Production Resilience

* **Offline Embeddings**: Automatically falls back to a local lexical similarity engine if HuggingFace is blocked.
* **Non-Fatal Storage**: SQLite failures are handled gracefully, returning active reports even if storage is locked.
* **Clean Builds**: Production builds avoid remote font loading, ensuring faster execution and compile speeds.
* **Format Exports**: Detailed analyses can be exported directly to JSON or generated as print-ready PDF reports.

---

## Code Validation

Verified with:
```bash
npm run lint
npx next build --webpack
```

Smoke checks:
* `GET  /` -> 200
* `POST /api/analyze` -> 200
* `GET  /api/sources/health` -> 200

Verified commit: `c332c82897083c39b16d64255f27671ef914a5b6`

---

## API Endpoints

* `POST /api/analyze` - Runs stylometry, specificity, and collusion on **real** review text (404/422 if unavailable).
* `GET /api/benchmark` - Full report by default (`?full=true`): calibration matrices, held-out spot-check, embedder mode. Use `?full=false` for calibration only.
* `GET /api/benchmark/spotcheck` - Held-out OpenReview-style spot-check only.
* `GET /api/sources/health` - Live status for OpenReview, arXiv, and Semantic Scholar.
* `POST /api/export/pdf` - Base64 PDF forensic report.

---

## Why ECHO

Trust in peer review is under pressure from volume and cheap AI-generated text. ECHO runs deterministic stylometry and graph analysis on real review text, surfaces risk visually, and exports evidence for human follow-up. It degrades gracefully when external APIs or embedding models are unavailable.
