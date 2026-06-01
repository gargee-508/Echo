from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import logging
from typing import Any
import base64
import io
import requests
import urllib.request
import uuid

from fetchers.openreview import fetch_paper_and_reviews, fetch_venue_collusion_context
from fetchers.arxiv import fetch_arxiv_metadata
from analyzers.config import (
    SPECIFICITY_SLOP_THRESHOLD,
    STYLOMETRY_SIMILARITY_THRESHOLD,
)
from analyzers.stylometry import analyze_stylometry
from analyzers.specificity import analyze_specificity
from analyzers.collusion import build_collusion_graph
from evaluation.benchmark import (
    run_external_spotcheck,
    run_full_validation_report,
    run_labeled_benchmark,
)
from models.embedder import get_embedder_mode
from storage import get_stats, init_db, list_recent_analyses, save_analysis

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
except Exception:
    letter = None
    canvas = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ECHO API",
    description="Peer Review Manipulation Detector",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    query: str
    venue_id: str = "ICLR.cc/2024/Conference"
    include_venue_collusion: bool = True


def _is_curated_fixture(paper_id: str | None) -> bool:
    if not paper_id:
        return False
    return str(paper_id).startswith("demo_")


def _build_risk_assessment(
    stylometry_results: dict[str, Any],
    specificity_results: dict[str, Any],
    collusion_graph: dict[str, Any],
) -> dict[str, Any]:
    suspicious_matches = int(stylometry_results.get("suspicious_matches", 0))
    slop_ratio = float(specificity_results.get("slop_ratio", 0))
    ring_count = int(collusion_graph.get("ring_count", 0))
    review_count = max(
        len(stylometry_results.get("details", [])),
        len(specificity_results.get("details", [])),
        1,
    )

    stylometry_component = min((suspicious_matches / review_count) * 50, 50)
    specificity_component = min(slop_ratio * 30, 30)
    collusion_component = min(ring_count * 10, 20)
    risk_score = round(
        stylometry_component + specificity_component + collusion_component, 2
    )

    if risk_score >= 70:
        verdict = "High Risk"
    elif risk_score >= 40:
        verdict = "Medium Risk"
    else:
        verdict = "Low Risk"

    top_findings = []
    if suspicious_matches:
        top_findings.append(
            f"{suspicious_matches} review(s) show high stylometric similarity to the paper."
        )
    if slop_ratio >= 0.4:
        top_findings.append(
            f"{round(slop_ratio * 100)}% of reviews appear low-specificity or generic."
        )
    if ring_count:
        top_findings.append(f"{ring_count} potential collusion ring cycle(s) detected.")
    if not top_findings:
        top_findings.append("No major anomalies detected across current checks.")

    recommendations = [
        "Run manual spot-check on flagged reviews and compare with reviewer history.",
        "Escalate suspicious cases to area chairs for verification.",
        "ECHO is a triage tool — not an automated accept/reject verdict.",
    ]
    if verdict == "High Risk":
        recommendations.append(
            "Request additional independent reviews before final acceptance decision."
        )

    return {
        "risk_score": risk_score,
        "verdict": verdict,
        "components": {
            "stylometry": round(stylometry_component, 2),
            "specificity": round(specificity_component, 2),
            "collusion": round(collusion_component, 2),
        },
        "top_findings": top_findings,
        "recommendations": recommendations,
    }


@app.get("/")
def read_root():
    return {"status": "ECHO Backend is running", "version": "1.2.0"}


@app.on_event("startup")
def startup_event():
    init_db()


@app.get("/api/benchmark")
def get_benchmark_report(
    sweep: bool = Query(False, description="Include specificity threshold grid search"),
    full: bool = Query(
        True,
        description="Include held-out spot-check, embedder mode, and demo notes",
    ),
):
    """Run labeled-set evaluation; full=true adds external spot-check and embedder info."""
    if full:
        return run_full_validation_report(include_threshold_sweep=sweep)
    return run_labeled_benchmark(include_threshold_sweep=sweep)


@app.get("/api/benchmark/spotcheck")
def get_spotcheck_report():
    """Held-out OpenReview-style reviews (manual labels, not used for calibration)."""
    return run_external_spotcheck()


@app.post("/api/analyze")
def analyze_paper(request: AnalyzeRequest):
    query = request.query
    venue_id = request.venue_id

    logger.info("Analyzing query: %s", query)

    or_data = fetch_paper_and_reviews(venue_id, query)
    data_state = "live"

    if "error" in or_data:
        logger.warning("Paper not found on OpenReview, trying arXiv...")
        arxiv_data = fetch_arxiv_metadata(query)

        if "error" in arxiv_data:
            raise HTTPException(
                status_code=404,
                detail={
                    "message": (
                        "No peer reviews found for this query on OpenReview or arXiv. "
                        "ECHO only runs forensic analysis on real review text. "
                        "Try an example query: 'Attention Is All You Need', "
                        "'Denoising Diffusion Probabilistic Models', or "
                        "'Position: The role of open source in AI'."
                    ),
                    "data_state": "unavailable",
                },
            )

        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "ArXiv preprints do not include official peer reviews. "
                    "Search the same title on OpenReview or use a reference example from the README."
                ),
                "data_state": "preprint_only",
                "paper": {
                    "title": arxiv_data.get("title", query),
                    "abstract": arxiv_data.get("abstract", ""),
                    "authors": arxiv_data.get("authors", []),
                },
            },
        )

    paper_id = or_data.get("paper_id") or or_data.get("id")
    if _is_curated_fixture(paper_id):
        data_state = "curated_fixture"

    paper_title = or_data.get("title", "")
    abstract = or_data.get("abstract", "")
    reviews = or_data.get("reviews", [])

    if not reviews:
        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "Paper metadata was found but no review text is available. "
                    "Analysis requires at least one official review."
                ),
                "data_state": "no_reviews",
                "paper": {
                    "title": paper_title,
                    "abstract": abstract,
                    "authors": or_data.get("authors", []),
                },
            },
        )

    paper_text = paper_title + " " + abstract

    stylometry_results = analyze_stylometry(paper_text, reviews)
    specificity_results = analyze_specificity(reviews, abstract)

    for rev in reviews:
        if "paper_id" not in rev:
            rev["paper_id"] = paper_id or "unknown"

    papers_for_graph = [
        {
            "id": paper_id,
            "title": paper_title,
            "abstract": abstract,
            "authors": or_data.get("authors", []),
        }
    ]
    reviews_for_graph = list(reviews)

    if request.include_venue_collusion and data_state == "live":
        venue_ctx = fetch_venue_collusion_context(venue_id)
        if venue_ctx.get("papers"):
            papers_for_graph = venue_ctx["papers"]
            reviews_for_graph = venue_ctx["reviews"]
            if not any(r.get("paper_id") == paper_id for r in reviews_for_graph):
                reviews_for_graph.extend(reviews)

    collusion_graph = build_collusion_graph(papers_for_graph, reviews_for_graph)

    risk_assessment = _build_risk_assessment(
        stylometry_results, specificity_results, collusion_graph
    )

    response = {
        "status": "success",
        "data_state": data_state,
        "analysis_valid": True,
        "paper": {
            "title": paper_title,
            "abstract": abstract,
            "authors": or_data.get("authors", []),
        },
        "results": {
            "stylometry": stylometry_results,
            "specificity": specificity_results,
            "collusion": collusion_graph,
        },
        "risk_assessment": risk_assessment,
        "thresholds": {
            "stylometry_cosine": STYLOMETRY_SIMILARITY_THRESHOLD,
            "specificity_composite": SPECIFICITY_SLOP_THRESHOLD,
            "calibration": "See GET /api/benchmark for labeled-set metrics",
        },
    }

    save_analysis(
        {
            "query": query,
            "venue_id": venue_id,
            "status": response["status"],
            "risk_score": risk_assessment["risk_score"],
            "verdict": risk_assessment["verdict"],
            "paper_title": paper_title,
            "suspicious_matches": stylometry_results.get("suspicious_matches", 0),
            "slop_ratio": specificity_results.get("slop_ratio", 0),
            "ring_count": collusion_graph.get("ring_count", 0),
        },
        response,
    )

    return response


@app.get("/api/history")
def get_analysis_history(limit: int = 20):
    return {"items": list_recent_analyses(limit)}


@app.get("/api/stats")
def get_analysis_stats():
    return get_stats()


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "echo-backend",
        "version": "1.2.0",
        "embedder": get_embedder_mode(),
    }


@app.get("/api/sources/health")
def sources_health_check():
    import os

    os.environ["HTTP_PROXY"] = ""
    os.environ["HTTPS_PROXY"] = ""
    os.environ["http_proxy"] = ""
    os.environ["https_proxy"] = ""
    statuses: dict[str, Any] = {}

    try:
        response = requests.get(
            "https://api2.openreview.net/notes",
            timeout=8,
            proxies={"http": "", "https": ""},
        )
        reachable = response.status_code in {200, 400, 401, 403}
        statuses["openreview"] = {
            "status": "connected" if reachable else "degraded",
            "http_code": response.status_code,
            "reason": "API reachable" if reachable else "Unexpected response code",
        }
    except Exception as exc:
        statuses["openreview"] = {"status": "disconnected", "reason": str(exc)}

    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(
            "http://export.arxiv.org/api/query?search_query=all:transformer&start=0&max_results=1",
            timeout=8,
        ) as response:
            body = response.read(64)
            statuses["arxiv"] = {
                "status": "connected" if body else "degraded",
                "http_code": response.status,
                "reason": "API reachable" if body else "Empty response body",
            }
    except Exception as exc:
        statuses["arxiv"] = {"status": "disconnected", "reason": str(exc)}

    try:
        response = requests.get(
            "https://api.semanticscholar.org/graph/v1/paper/search",
            params={"query": "transformer", "limit": 1, "fields": "title"},
            timeout=8,
            proxies={"http": "", "https": ""},
        )
        if response.status_code == 200:
            status = "connected"
            reason = "API reachable"
        elif response.status_code == 429:
            status = "degraded"
            reason = "Rate limited"
        else:
            status = "degraded"
            reason = "Unexpected response code"
        statuses["semantic_scholar"] = {
            "status": status,
            "http_code": response.status_code,
            "reason": reason,
        }
    except Exception as exc:
        statuses["semantic_scholar"] = {"status": "disconnected", "reason": str(exc)}

    return {"sources": statuses}


@app.post("/api/export/pdf")
def export_pdf_report(payload: dict[str, Any]):
    if canvas is None or letter is None:
        raise HTTPException(status_code=500, detail="PDF dependency unavailable")
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    _, height = letter
    y = height - 60
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(40, y, "ECHO Forensic Report")
    y -= 24
    pdf.setFont("Helvetica", 11)
    paper = payload.get("paper", {})
    risk = payload.get("risk_assessment", {})
    lines = [
        f"Paper: {paper.get('title', 'Unknown')}",
        f"Verdict: {risk.get('verdict', 'Unknown')}",
        f"Risk Score: {risk.get('risk_score', 'n/a')}",
        "Top Findings:",
    ]
    for line in lines:
        pdf.drawString(40, y, str(line)[:95])
        y -= 18
    for finding in risk.get("top_findings", [])[:8]:
        pdf.drawString(60, y, f"- {finding}"[:100])
        y -= 16
    pdf.showPage()
    pdf.save()
    body = buffer.getvalue()
    return {
        "filename": f"echo-report-{uuid.uuid4().hex[:8]}.pdf",
        "content_base64": base64.b64encode(body).decode("utf-8"),
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
