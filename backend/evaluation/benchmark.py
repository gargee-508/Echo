"""
Labeled-set evaluation for ECHO detection engines.

Produces per-engine confusion matrices, precision/recall/F1, and optional
threshold sweep for the specificity composite score.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from analyzers.config import (
    SPECIFICITY_SLOP_THRESHOLD,
    STYLOMETRY_SIMILARITY_THRESHOLD,
)
from analyzers.specificity import analyze_specificity
from analyzers.stylometry import analyze_stylometry
from evaluation.metrics import confusion, rates
from models.embedder import get_embedder_mode

_LABELED_PATH = Path(__file__).resolve().parent.parent / "data" / "labeled_reviews.json"


def _load_labeled() -> list[dict[str, Any]]:
    with open(_LABELED_PATH, encoding="utf-8") as handle:
        return json.load(handle)


def _evaluate_stylometry(samples: list[dict[str, Any]]) -> dict[str, Any]:
    y_true: list[bool] = []
    y_pred: list[bool] = []
    details: list[dict[str, Any]] = []

    for sample in samples:
        paper_text = sample["paper_text"]
        review = {"id": sample["id"], "text": sample["review_text"]}
        result = analyze_stylometry(paper_text, [review])
        row = (result.get("details") or [{}])[0]
        pred = bool(row.get("is_suspicious"))
        truth = bool(sample["stylometry_suspicious"])
        y_true.append(truth)
        y_pred.append(pred)
        details.append(
            {
                "id": sample["id"],
                "ground_truth": truth,
                "predicted": pred,
                "similarity_score": row.get("similarity_score"),
            }
        )

    matrix = confusion(y_true, y_pred)
    return {
        "engine": "stylometry",
        "threshold": STYLOMETRY_SIMILARITY_THRESHOLD,
        "confusion_matrix": matrix,
        "metrics": rates(matrix),
        "samples": details,
    }


def _evaluate_specificity(samples: list[dict[str, Any]]) -> dict[str, Any]:
    y_true: list[bool] = []
    y_pred: list[bool] = []
    details: list[dict[str, Any]] = []

    for sample in samples:
        review = {"id": sample["id"], "text": sample["review_text"]}
        result = analyze_specificity([review], sample.get("paper_text", ""))
        row = (result.get("details") or [{}])[0]
        pred = bool(row.get("is_likely_slop"))
        truth = bool(sample["specificity_slop"])
        y_true.append(truth)
        y_pred.append(pred)
        details.append(
            {
                "id": sample["id"],
                "ground_truth": truth,
                "predicted": pred,
                "specificity_score": row.get("specificity_score"),
            }
        )

    matrix = confusion(y_true, y_pred)
    return {
        "engine": "specificity",
        "threshold": SPECIFICITY_SLOP_THRESHOLD,
        "confusion_matrix": matrix,
        "metrics": rates(matrix),
        "samples": details,
    }


def _sweep_specificity_threshold(samples: list[dict[str, Any]]) -> dict[str, Any]:
    """Grid search specificity threshold on labeled slop flags."""
    best: dict[str, Any] = {"threshold": SPECIFICITY_SLOP_THRESHOLD, "f1": -1.0}
    y_true = [bool(s["specificity_slop"]) for s in samples]

    for threshold_int in range(35, 85):
        threshold = threshold_int / 10.0
        y_pred = []
        for sample in samples:
            review = {"id": sample["id"], "text": sample["review_text"]}
            result = analyze_specificity([review], sample.get("paper_text", ""))
            row = (result.get("details") or [{}])[0]
            score = float(row.get("specificity_score", 0))
            y_pred.append(score < threshold)
        matrix = confusion(y_true, y_pred)
        m = rates(matrix)
        if m["f1"] > best["f1"]:
            best = {
                "threshold": threshold,
                "f1": m["f1"],
                "precision": m["precision"],
                "recall": m["recall"],
                "false_positive_rate": m["false_positive_rate"],
            }

    return {
        "recommended_threshold": best["threshold"],
        "metrics_at_recommended": {
            "f1": best["f1"],
            "precision": best.get("precision"),
            "recall": best.get("recall"),
            "false_positive_rate": best.get("false_positive_rate"),
        },
        "current_config_threshold": SPECIFICITY_SLOP_THRESHOLD,
    }


def run_labeled_benchmark(include_threshold_sweep: bool = False) -> dict[str, Any]:
    samples = _load_labeled()
    stylometry = _evaluate_stylometry(samples)
    specificity = _evaluate_specificity(samples)

    slop_pos = sum(1 for s in samples if s["specificity_slop"])
    sty_pos = sum(1 for s in samples if s["stylometry_suspicious"])

    payload: dict[str, Any] = {
        "dataset": {
            "path": str(_LABELED_PATH.name),
            "n_samples": len(samples),
            "stylometry_positive": sty_pos,
            "specificity_slop_positive": slop_pos,
        },
        "stylometry": stylometry,
        "specificity": specificity,
        "combined_triage": {
            "description": "Flag if either engine fires (OR combiner for screening)",
            "note": "Higher recall, more false positives — use for screening only",
        },
        "limitations": [
            "Labeled set is small (n=24); re-run on venue-specific data before production.",
            "Stylometry FPR rises when reviewers share narrow jargon with the abstract.",
            "ECHO is a triage assistant, not an automated accept/reject system.",
        ],
    }

    if include_threshold_sweep:
        payload["specificity_threshold_sweep"] = _sweep_specificity_threshold(samples)

    return payload


def run_full_validation_report(include_threshold_sweep: bool = False) -> dict[str, Any]:
    """Calibration set + held-out external spot-check + runtime embedder info."""
    from evaluation.spotcheck import run_external_spotcheck

    calibration = run_labeled_benchmark(include_threshold_sweep=include_threshold_sweep)
    spotcheck = run_external_spotcheck()
    return {
        "embedder": get_embedder_mode(),
        "calibration_set": calibration,
        "external_spotcheck": spotcheck,
        "pitch_notes": {
            "deploy_embedder": (
                "Production on Render uses lexical_fallback for RAM; "
                "local dev may use all-MiniLM-L6-v2. Compare stylometry only within the same mode."
            ),
            "demo_flow": [
                "Landing (/) → value prop",
                "Dashboard → analyze 'Attention Is All You Need'",
                "/validation → calibration + spot-check tables",
                "/sources → API health",
            ],
            "do_not": "Type random paper titles — expect 404/422 without OpenReview reviews.",
        },
    }
