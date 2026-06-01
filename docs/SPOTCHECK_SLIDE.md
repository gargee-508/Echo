# Slide: External spot-check (held-out)

**Title:** ECHO — held-out OpenReview spot-check (manual vs ECHO)

| ID | Source | Manual (Sty / Spec) | ECHO | Agreement |
|----|--------|---------------------|------|-----------|
| ext-01 | LoRA (ICLR 2022) | ok / ok | ok / ok | ✓ |
| ext-02 | InstructGPT RLHF (NeurIPS 2022) | ok / ok | ok / ok | ✓ |
| ext-03 | ViT (ICLR 2021) | ok / **slop** | ok / slop | ✓ |
| ext-04 | Scaling laws (2020) | **copy-paste** / slop | flag / slop | ✓ |
| ext-05 | FlashAttention (NeurIPS 2022) | ok / ok | ok / ok | ✓ |

**Summary:** 5/5 stylometry · 5/5 specificity agreement (lexical embedder, frozen thresholds).

**Footer**

- Spot-check excluded from `labeled_reviews.json` calibration.
- Render deploy: `lexical_fallback`; local may use MiniLM — stylometry scores differ by environment.
- No analysis on synthetic reviews when OpenReview text is missing.

**Live:** [echo-frontend](https://echo-frontend-6xnv.onrender.com)/validation
