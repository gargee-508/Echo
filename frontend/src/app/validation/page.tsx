"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Cpu,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EngineMetrics {
  engine: string;
  threshold: number;
  confusion_matrix: { tp: number; fp: number; tn: number; fn: number };
  metrics: {
    precision: number;
    recall: number;
    f1: number;
    false_positive_rate: number;
    accuracy: number;
  };
}

interface CalibrationReport {
  dataset: { n_samples: number; stylometry_positive: number; specificity_slop_positive: number };
  stylometry: EngineMetrics;
  specificity: EngineMetrics;
  limitations: string[];
}

interface SpotcheckSample {
  id: string;
  source: string;
  manual: { stylometry_suspicious: boolean; specificity_slop: boolean; rationale: string };
  echo: {
    stylometry_suspicious: boolean;
    stylometry_score?: number;
    specificity_slop: boolean;
    specificity_score?: number;
  };
  agreement: { stylometry: boolean; specificity: boolean };
}

interface FullValidationReport {
  embedder: { mode: string; model: string; note: string };
  calibration_set: CalibrationReport;
  external_spotcheck: {
    agreement_summary: {
      stylometry_correct: number;
      specificity_correct: number;
      total_samples: number;
      stylometry_agreement_rate: number;
      specificity_agreement_rate: number;
    };
    samples: SpotcheckSample[];
  };
  pitch_notes: { deploy_embedder: string; demo_flow: string[]; do_not: string };
}

function MatrixTable({ matrix }: { matrix: EngineMetrics["confusion_matrix"] }) {
  return (
    <table className="mono" style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "8px" }}></th>
          <th style={{ padding: "8px" }}>Pred +</th>
          <th style={{ padding: "8px" }}>Pred −</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: "8px" }}>Actual +</td>
          <td style={{ padding: "8px", color: "#22c55e" }}>TP {matrix.tp}</td>
          <td style={{ padding: "8px", color: "#ef4444" }}>FN {matrix.fn}</td>
        </tr>
        <tr>
          <td style={{ padding: "8px" }}>Actual −</td>
          <td style={{ padding: "8px", color: "#f59e0b" }}>FP {matrix.fp}</td>
          <td style={{ padding: "8px", color: "#06b6d4" }}>TN {matrix.tn}</td>
        </tr>
      </tbody>
    </table>
  );
}

function EngineCard({ block }: { block: EngineMetrics }) {
  return (
    <div className="glass-card" style={{ padding: "20px" }}>
      <h3 style={{ textTransform: "capitalize", marginTop: 0 }}>{block.engine}</h3>
      <p className="text-secondary mono" style={{ fontSize: "0.85rem" }}>
        Threshold: {block.threshold}
      </p>
      <MatrixTable matrix={block.confusion_matrix} />
      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "0.85rem",
        }}
      >
        <span>Precision: {block.metrics.precision}</span>
        <span>Recall: {block.metrics.recall}</span>
        <span>F1: {block.metrics.f1}</span>
        <span>FPR: {block.metrics.false_positive_rate}</span>
      </div>
    </div>
  );
}

export default function ValidationPage() {
  const [report, setReport] = useState<FullValidationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get<FullValidationReport>("/api/benchmark?full=true")
      .then((res) => setReport(res.data))
      .catch(() => setError("Could not load validation report from the backend."))
      .finally(() => setLoading(false));
  }, []);

  const cal = report?.calibration_set;
  const spot = report?.external_spotcheck;

  return (
    <div className="dashboard-container" style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <Link href="/dashboard" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Detection validation</h1>
          <p className="text-secondary" style={{ margin: "8px 0 0" }}>
            Calibration set (n=24) + held-out OpenReview spot-check (n=5).
          </p>
        </div>
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)" }}>
          <Loader2 className="animate-spin" size={20} />
          Running evaluation…
        </div>
      )}

      {error && <p className="text-red">{error}</p>}

      {report && (
        <>
          <div className="glass-card" style={{ padding: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
              <Cpu size={20} className="text-cyan" />
              <strong>Active embedder</strong>
            </div>
            <p className="mono text-secondary" style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>
              {report.embedder.mode} — {report.embedder.model}
            </p>
            <p className="text-secondary" style={{ margin: 0, fontSize: "0.9rem" }}>
              {report.embedder.note}
            </p>
          </div>

          {cal && (
            <>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "12px" }}>Calibration set (threshold tuning)</h2>
              <p className="text-secondary" style={{ marginBottom: "16px" }}>
                {cal.dataset.n_samples} labeled reviews — {cal.dataset.stylometry_positive} stylometry-positive,{" "}
                {cal.dataset.specificity_slop_positive} slop-positive.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "20px",
                  marginBottom: "32px",
                }}
              >
                <EngineCard block={cal.stylometry} />
                <EngineCard block={cal.specificity} />
              </div>
            </>
          )}

          {spot && (
            <>
              <h2 style={{ fontSize: "1.2rem", marginBottom: "12px" }}>External spot-check (held-out)</h2>
              <p className="text-secondary" style={{ marginBottom: "16px" }}>
                Five OpenReview-style reviews labeled <em>after</em> calibration — not in{" "}
                <code>labeled_reviews.json</code>. Manual vs ECHO agreement: stylometry{" "}
                {spot.agreement_summary.stylometry_correct}/{spot.agreement_summary.total_samples}, specificity{" "}
                {spot.agreement_summary.specificity_correct}/{spot.agreement_summary.total_samples}.
              </p>

              <div style={{ overflowX: "auto", marginBottom: "24px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", textAlign: "left" }}>
                      <th style={{ padding: "10px" }}>ID</th>
                      <th style={{ padding: "10px" }}>Source</th>
                      <th style={{ padding: "10px" }}>Manual</th>
                      <th style={{ padding: "10px" }}>ECHO</th>
                      <th style={{ padding: "10px" }}>Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spot.samples.map((row) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td className="mono" style={{ padding: "10px", verticalAlign: "top" }}>
                          {row.id}
                        </td>
                        <td style={{ padding: "10px", maxWidth: 220, verticalAlign: "top" }}>
                          {row.source}
                        </td>
                        <td style={{ padding: "10px", verticalAlign: "top" }}>
                          Sty: {row.manual.stylometry_suspicious ? "flag" : "ok"}
                          <br />
                          Spec: {row.manual.specificity_slop ? "slop" : "ok"}
                        </td>
                        <td className="mono" style={{ padding: "10px", verticalAlign: "top", fontSize: "0.8rem" }}>
                          Sty: {row.echo.stylometry_suspicious ? "flag" : "ok"} ({row.echo.stylometry_score})
                          <br />
                          Spec: {row.echo.specificity_slop ? "slop" : "ok"} ({row.echo.specificity_score})
                        </td>
                        <td style={{ padding: "10px", verticalAlign: "top" }}>
                          {row.agreement.stylometry && row.agreement.specificity ? (
                            <CheckCircle2 size={18} color="#22c55e" />
                          ) : (
                            <XCircle size={18} color="#ef4444" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="glass-card" style={{ padding: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
              <BarChart3 size={18} className="text-cyan" />
              <strong>Live demo flow</strong>
            </div>
            <ol className="text-secondary" style={{ margin: 0, paddingLeft: "20px" }}>
              {report.pitch_notes.demo_flow.map((step) => (
                <li key={step} style={{ marginBottom: "6px" }}>
                  {step}
                </li>
              ))}
            </ol>
            <p className="text-secondary" style={{ margin: "12px 0 0", fontSize: "0.9rem" }}>
              {report.pitch_notes.do_not}
            </p>
          </div>

          {cal && (
            <div className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
                <ShieldAlert size={18} className="text-amber" />
                <strong>Known limitations</strong>
              </div>
              <ul className="text-secondary" style={{ margin: 0, paddingLeft: "20px" }}>
                {cal.limitations.map((item) => (
                  <li key={item} style={{ marginBottom: "8px" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link href="/dashboard?q=Attention%20Is%20All%20You%20Need&auto=1">
              <Button variant="secondary">
                <Activity size={16} />
                Run example analysis
              </Button>
            </Link>
            <Link href="/sources">
              <Button variant="secondary">Source health</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
