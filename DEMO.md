# ECHO — Live demo script (~2 minutes)

Use this flow for hackathon presentation or submission video.

## Before you start

- Deploy **backend + frontend** (Render URLs in README).
- Production uses **`lexical_fallback`** embeddings (RAM-safe). Mention: *“Stylometry on Render uses our deterministic lexical embedder; local dev can run full MiniLM — scores may differ slightly, specificity does not.”*
- Do **not** type a random paper title. Use the scripted queries below.

---

## Script

| Step | Where | What to say / do |
|------|--------|------------------|
| 1 | `/` (homepage) | “ECHO flags suspicious **peer reviews** — copy-paste voice, generic slop, and collusion patterns — not generic AI-detection on papers.” |
| 2 | `/dashboard` | Search **`Attention Is All You Need`** → **Analyze**. Point to verdict gauge, stylometry card, specificity, D3 collusion graph. |
| 3 | Report banner | If **reference validation set**: “Curated fixture with known bad Review 3 (abstract echo) and generic Review 2.” If **live**: “Real OpenReview text; venue-wide graph when available.” |
| 4 | `/validation` | “Calibration set n=24 used to tune thresholds. **Held-out spot-check**: five OpenReview-style reviews we labeled **after** calibration — table shows manual vs ECHO agreement.” |
| 5 | `/sources` | Show OpenReview / arXiv / Semantic Scholar health — “degrades gracefully if APIs fail.” |
| 6 | Close | “ECHO is **triage for chairs**, not auto-reject. We publish FPR and confusion matrices.” |

---

## Example queries (safe)

- `Attention Is All You Need`
- `Denoising Diffusion Probabilistic Models`
- `Position: The role of open source in AI`

---

## API checks (optional backup slide)

```text
GET /api/health              → embedder.mode
GET /api/benchmark?full=true → calibration + external_spotcheck
```

---

## One-liner for judges

> We combine stylometry, specificity, and collusion graphs on **real review text**, publish labeled-set metrics plus a **held-out OpenReview spot-check**, and refuse to score synthetic reviews when data is missing.
