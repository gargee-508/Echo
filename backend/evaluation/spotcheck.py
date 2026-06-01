"""Held-out external spot-check (not used for threshold calibration)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from evaluation.benchmark import _evaluate_specificity, _evaluate_stylometry

_SPOTCHECK_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "external_spotcheck.json"
)


def _load_spotcheck() -> list[dict[str, Any]]:
    with open(_SPOTCHECK_PATH, encoding="utf-8") as handle:
        return json.load(handle)


def _sample_rows(
    samples: list[dict[str, Any]],
    stylometry_details: list[dict[str, Any]],
    specificity_details: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sty_by_id = {row["id"]: row for row in stylometry_details}
    spec_by_id = {row["id"]: row for row in specificity_details}
    rows = []
    for sample in samples:
        sid = sample["id"]
        sty = sty_by_id.get(sid, {})
        spec = spec_by_id.get(sid, {})
        rows.append(
            {
                "id": sid,
                "source": sample.get("source", ""),
                "manual": {
                    "stylometry_suspicious": sample["stylometry_suspicious"],
                    "specificity_slop": sample["specificity_slop"],
                    "rationale": sample.get("manual_rationale", ""),
                },
                "echo": {
                    "stylometry_suspicious": sty.get("predicted"),
                    "stylometry_score": sty.get("similarity_score"),
                    "specificity_slop": spec.get("predicted"),
                    "specificity_score": spec.get("specificity_score"),
                },
                "agreement": {
                    "stylometry": sample["stylometry_suspicious"] == sty.get("predicted"),
                    "specificity": sample["specificity_slop"] == spec.get("predicted"),
                },
            }
        )
    return rows


def run_external_spotcheck() -> dict[str, Any]:
    samples = _load_spotcheck()
    stylometry = _evaluate_stylometry(samples)
    specificity = _evaluate_specificity(samples)
    rows = _sample_rows(samples, stylometry["samples"], specificity["samples"])

    sty_agree = sum(1 for r in rows if r["agreement"]["stylometry"])
    spec_agree = sum(1 for r in rows if r["agreement"]["specificity"])

    return {
        "dataset": {
            "path": _SPOTCHECK_PATH.name,
            "n_samples": len(samples),
            "purpose": "Held-out manual labels — excluded from threshold calibration",
        },
        "stylometry": stylometry,
        "specificity": specificity,
        "agreement_summary": {
            "stylometry_correct": sty_agree,
            "specificity_correct": spec_agree,
            "total_samples": len(samples),
            "stylometry_agreement_rate": round(sty_agree / len(samples), 4),
            "specificity_agreement_rate": round(spec_agree / len(samples), 4),
        },
        "samples": rows,
    }
