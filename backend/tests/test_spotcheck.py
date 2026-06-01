import os

os.environ["USE_FALLBACK_EMBEDDER"] = "true"

from evaluation.spotcheck import run_external_spotcheck


def test_external_spotcheck_five_of_five_agreement():
    report = run_external_spotcheck()
    summary = report["agreement_summary"]
    assert summary["total_samples"] == 5
    assert summary["stylometry_correct"] == 5
    assert summary["specificity_correct"] == 5
