import math
import re
import logging
from collections import Counter

from analyzers.config import MIN_REVIEW_CHARS, SPECIFICITY_SLOP_THRESHOLD

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GENERIC_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "to", "of", "and", "in", "that", "it",
    "for", "on", "as", "with", "by", "this", "we", "can", "be", "which", "paper", "authors",
    "proposed", "method", "approach", "results", "show", "demonstrate", "novel", "significant",
    "important", "contribution", "well", "written", "interesting", "good", "great", "however",
}

# Template phrases common in low-effort or LLM-generated reviews
SLOP_PHRASES = (
    "well written",
    "recommend accept",
    "recommend acceptance",
    "interesting results",
    "novel method",
    "solid contribution",
    "technically sound",
    "significant impact",
    "thank you",
    "lean accept",
    "authors show",
    "paper is good",
)


def calculate_entropy(words: list[str]) -> float:
    if not words:
        return 0.0
    word_counts = Counter(words)
    total_words = sum(word_counts.values())
    entropy = 0.0
    for count in word_counts.values():
        probability = count / total_words
        entropy -= probability * math.log2(probability)
    return entropy


def _abstract_overlap_ratio(review_words: list[str], paper_abstract: str) -> float:
    abstract_words = re.findall(r"\b\w+\b", paper_abstract.lower())
    abstract_set = {w for w in abstract_words if w not in GENERIC_WORDS and len(w) > 3}
    review_set = {w for w in review_words if w not in GENERIC_WORDS and len(w) > 3}
    if not review_set or not abstract_set:
        return 0.0
    return len(review_set & abstract_set) / len(review_set)


def _slop_phrase_hits(text: str) -> int:
    return sum(1 for phrase in SLOP_PHRASES if phrase in text)


def _critique_signals(text: str) -> int:
    """Reward concrete critique markers (figures, metrics, sections)."""
    signals = 0
    if re.search(r"\b(section|appendix|table|figure)\s+\d", text):
        signals += 1
    if re.search(r"\b\d+(\.\d+)?\b", text):
        signals += 1
    if re.search(r"\b(bleu|fid|accuracy|f1|rmse|epsilon|ablation)\b", text, re.I):
        signals += 1
    if "?" in text or "should" in text or "missing" in text or "concern" in text:
        signals += 1
    return signals


def analyze_specificity(reviews: list[dict], paper_abstract: str = "") -> dict:
    """
    Composite specificity score: vocabulary diversity minus abstract echo and template phrases.
    Calibrated on data/labeled_reviews.json — see GET /api/benchmark.
    """
    if not reviews:
        return {"error": "No reviews provided"}

    results = []

    for review in reviews:
        text = review.get("text", "").lower()
        if len(text) < MIN_REVIEW_CHARS:
            continue

        words = re.findall(r"\b\w+\b", text)
        specific_words = [w for w in words if w not in GENERIC_WORDS and len(w) > 3]
        total_words = len(words)
        if total_words == 0:
            continue

        specificity_ratio = len(specific_words) / total_words
        vocab_entropy = calculate_entropy(specific_words)
        overlap = _abstract_overlap_ratio(words, paper_abstract)
        slop_hits = _slop_phrase_hits(text)
        critique = _critique_signals(text)

        base = (specificity_ratio * 10) + vocab_entropy
        penalties = (overlap * 9.0) + (slop_hits * 1.8)
        bonus = critique * 0.75
        score = base - penalties + bonus

        is_slop = score < SPECIFICITY_SLOP_THRESHOLD

        results.append(
            {
                "review_id": review.get("id"),
                "specificity_score": round(score, 2),
                "entropy": round(vocab_entropy, 2),
                "abstract_overlap": round(overlap, 3),
                "slop_phrase_hits": slop_hits,
                "is_likely_slop": is_slop,
            }
        )

    slop_count = sum(1 for r in results if r["is_likely_slop"])

    return {
        "slop_ratio": round(slop_count / len(results), 2) if results else 0,
        "details": results,
    }
