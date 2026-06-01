"""Unit tests for ECHO analyzers (lexical fallback embedder, no GPU required)."""

import os

os.environ["USE_FALLBACK_EMBEDDER"] = "true"

from analyzers.specificity import analyze_specificity
from analyzers.stylometry import analyze_stylometry


def test_stylometry_flags_copy_paste_review():
    paper = (
        "We propose attention-only sequence models without recurrence, "
        "evaluated on WMT14 translation benchmarks."
    )
    copy_paste = paper + " Therefore I recommend acceptance."
    genuine = (
        "The WMT14 en-de setup is solid but the paper omits confidence intervals "
        "and does not compare against the ConvS2S baseline at matched parameter count."
    )
    result = analyze_stylometry(
        paper,
        [
            {"id": "bad", "text": copy_paste},
            {"id": "ok", "text": genuine},
        ],
    )
    by_id = {row["review_id"]: row for row in result["details"]}
    assert by_id["bad"]["is_suspicious"] is True
    assert by_id["ok"]["is_suspicious"] is False


def test_specificity_flags_generic_slop():
    slop = (
        "The paper is well written and novel. It presents interesting results. "
        "The authors show that the proposed method is good. I recommend acceptance."
    )
    technical = (
        "Masking 15% of tokens is standard but the NSP ablation belongs in the main text. "
        "Report held-out hyperparameter sweeps on CoNLL-2003 rare-entity F1."
    )
    result = analyze_specificity(
        [
            {"id": "slop", "text": slop},
            {"id": "tech", "text": technical},
        ],
        "BERT pre-trains bidirectional representations on BooksCorpus.",
    )
    by_id = {row["review_id"]: row for row in result["details"]}
    assert by_id["slop"]["is_likely_slop"] is True
    assert by_id["tech"]["is_likely_slop"] is False
