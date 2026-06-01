"""
Detection thresholds for ECHO analyzers.

Stylometry (cosine similarity paper vs review):
  Calibrated on backend/data/labeled_reviews.json (see /api/benchmark).
  At 0.80 on the labeled set we prioritize catching copy-paste / same-voice
  reviews; narrow subfields with shared jargon may false-positive — use as triage.

Specificity (composite score = specificity_ratio * 10 + vocab_entropy):
  Calibrated via grid search on labeled_reviews.json (see evaluation/benchmark.py).
  Default 6.0 maximizes F1 on the bundled labeled set; adjust with ECHO_SPECIFICITY_THRESHOLD.
"""

import os

# Paper–review cosine similarity above this flags stylometric collision risk.
STYLOMETRY_SIMILARITY_THRESHOLD: float = float(
    os.getenv("ECHO_STYLOMETRY_THRESHOLD", "0.80")
)

# Composite specificity score below this flags likely generic / low-depth review text.
SPECIFICITY_SLOP_THRESHOLD: float = float(
    os.getenv("ECHO_SPECIFICITY_THRESHOLD", "6.0")
)

# Minimum review character length to include in stylometry / specificity passes.
MIN_REVIEW_CHARS: int = 50

# Venue-wide collusion scan: max submissions pulled when building cross-paper graph.
VENUE_COLLUSION_PAPER_LIMIT: int = int(os.getenv("ECHO_VENUE_COLLUSION_LIMIT", "40"))
