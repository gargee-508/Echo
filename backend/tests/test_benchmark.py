"""Benchmark evaluation smoke tests."""

import os

os.environ["USE_FALLBACK_EMBEDDER"] = "true"

from evaluation.benchmark import run_full_validation_report, run_labeled_benchmark


def test_labeled_benchmark_returns_confusion_matrix():
    report = run_labeled_benchmark()
    assert report["dataset"]["n_samples"] >= 20
    for engine in ("stylometry", "specificity"):
        block = report[engine]
        matrix = block["confusion_matrix"]
        assert set(matrix.keys()) == {"tp", "fp", "tn", "fn"}
        assert "f1" in block["metrics"]
        assert block["metrics"]["f1"] > 0.3


def test_full_validation_includes_spotcheck():
    report = run_full_validation_report()
    assert "external_spotcheck" in report
    assert report["external_spotcheck"]["agreement_summary"]["total_samples"] == 5
    assert "embedder" in report
