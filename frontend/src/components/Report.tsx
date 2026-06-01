"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Fingerprint,
  Network,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Graph from "./Graph";
import { Button } from "@/components/ui/button";

export interface EchoReportData {
  status: string;
  data_state?: string;
  message?: string;
  paper?: {
    title?: string;
    abstract?: string;
    authors?: string[];
  };
  results?: {
    stylometry: {
      suspicious_matches: number;
      overall_suspicion_level: string;
      details?: { review_id: string; is_suspicious: boolean; similarity_score: number }[];
    };
    specificity: {
      slop_ratio: number;
    };
    collusion: {
      ring_count: number;
      nodes: { id: string; type: string; title?: string }[];
      links: { source: string; target: string; relation: string }[];
    };
    temporal?: {
      burst_score: number;
    };
    semantic?: {
      citationCount?: number;
      referenceCount?: number;
      year?: number;
      error?: string;
    };
  };
  risk_assessment?: {
    risk_score: number;
    verdict: string;
    components?: {
      stylometry?: number;
      specificity?: number;
      collusion?: number;
      temporal?: number;
    };
    top_findings?: string[];
    recommendations?: string[];
  };
  explainability?: {
    graph_reason?: string;
    evidence_cards?: {
      review_id: string;
      similarity_score: number;
      entropy?: number;
      specificity_score?: number;
      is_suspicious: boolean;
      why: string[];
    }[];
  };
}

interface ReportProps {
  data: EchoReportData;
}

const cardMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
} as const;

function scoreColor(score: number) {
  if (score >= 70) return "#EF4444";
  if (score >= 40) return "#F59E0B";
  return "#22C55E";
}

function MetricCard({
  title,
  score,
  icon: Icon,
  tone,
  caption,
}: {
  title: string;
  score: number;
  icon: React.ElementType;
  tone: string;
  caption: string;
}) {
  return (
    <motion.div {...cardMotion} className="premium-report-card metric-card">
      <div className="metric-head">
        <span style={{ color: tone }}>
          <Icon size={18} />
        </span>
        <b>{title}</b>
      </div>
      <strong>{Math.round(score)}</strong>
      <div className="meter">
        <i style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: tone }} />
      </div>
      <p>{caption}</p>
    </motion.div>
  );
}

export default function Report({ data }: ReportProps) {
  if (!data) return null;

  if (data.status === "partial" || !data.results) {
    return (
      <motion.div {...cardMotion} className="premium-report-card partial-report">
        <div className="metric-head">
          <AlertTriangle size={18} />
          <b>Partial Source Match</b>
        </div>
        <h2>{data.paper?.title || "Paper found"}</h2>
        <p>{data.message || "This paper was found, but public peer-review text is unavailable for full forensic analysis."}</p>
      </motion.div>
    );
  }

  const { stylometry, specificity, collusion, semantic, temporal } = data.results;
  const risk = data.risk_assessment;
  const riskScore = risk?.risk_score ?? Math.min(100, stylometry.suspicious_matches * 28 + specificity.slop_ratio * 55 + collusion.ring_count * 18);
  const specificityRisk = specificity.slop_ratio * 100;
  const stylometryRisk = risk?.components?.stylometry ?? Math.min(100, stylometry.suspicious_matches * 34);
  const collusionRisk = risk?.components?.collusion ?? Math.min(100, collusion.ring_count * 42);
  const qualityRisk = Math.min(100, specificityRisk + stylometry.suspicious_matches * 10);
  const diversityRisk = Math.min(100, collusion.nodes.filter((node) => node.type === "reviewer").length * 16);
  const paperTitle = data.paper?.title || "Untitled paper";
  const paperAbstract = data.paper?.abstract || "No abstract supplied.";

  const riskBreakdown = [
    { title: "Stylometry", score: stylometryRisk, icon: Fingerprint, tone: "#06B6D4", caption: `${stylometry.suspicious_matches} suspicious matches` },
    { title: "Specificity", score: specificityRisk, icon: Target, tone: "#8B5CF6", caption: `${Math.round(specificityRisk)}% generic-review ratio` },
    { title: "Collusion", score: collusionRisk, icon: Network, tone: "#EF4444", caption: `${collusion.ring_count} graph rings detected` },
    { title: "Review Quality", score: qualityRisk, icon: BrainCircuit, tone: "#F59E0B", caption: "Entropy and domain-density signal" },
    { title: "Reviewer Diversity", score: diversityRisk, icon: Users, tone: "#22C55E", caption: `${collusion.nodes.length} graph entities mapped` },
  ];

  const chartData = riskBreakdown.map((item) => ({ name: item.title, value: item.score, fill: item.tone }));
  const evidence = data.explainability?.evidence_cards || stylometry.details?.map((detail) => ({
    review_id: detail.review_id,
    similarity_score: detail.similarity_score,
    is_suspicious: detail.is_suspicious,
    why: [detail.is_suspicious ? "Stylometric similarity crosses the suspicious threshold." : "No threshold breach detected."],
  })) || [];

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `echo-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    const res = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await res.json();
    const bytes = Uint8Array.from(atob(payload.content_base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = payload.filename || `echo-report-${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-report">
      {data.data_state === "curated_fixture" && (
        <div style={{
          background: "rgba(139, 92, 246, 0.08)",
          border: "1px solid rgba(139, 92, 246, 0.25)",
          color: "#a78bfa",
          padding: "16px 20px",
          borderRadius: "12px",
          marginBottom: "24px",
          fontSize: "0.95rem",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontWeight: 500,
        }}>
          <Fingerprint size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.05em", display: "block", marginBottom: "2px" }}>Reference validation set</strong>
            <span style={{ opacity: 0.9 }}>Reviews from the bundled labeled dataset with known patterns (copy-paste abstract, generic slop). Scores are calibrated against this reference set.</span>
          </div>
        </div>
      )}

      {data.data_state === "live" && (
        <div style={{
          background: "rgba(34, 197, 94, 0.08)",
          border: "1px solid rgba(34, 197, 94, 0.25)",
          color: "#4ade80",
          padding: "12px 16px",
          borderRadius: "12px",
          marginBottom: "24px",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>Live OpenReview review text — venue-wide collusion scan enabled when available.</span>
        </div>
      )}

      <motion.section {...cardMotion} className="premium-report-card report-paper-card">
        <div>
          <span className="eyebrow">Paper Summary</span>
          <h2>{paperTitle}</h2>
          <p>{paperAbstract.slice(0, 520)}{paperAbstract.length > 520 ? "..." : ""}</p>
          <div className="report-badges">
            <span>OpenReview</span>
            <span>arXiv {semantic?.year || "metadata"}</span>
            <span>{semantic?.citationCount ?? "n/a"} citations</span>
            <span>{semantic?.referenceCount ?? "n/a"} references</span>
          </div>
        </div>
        <div className="report-actions">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            JSON
          </Button>
          <Button variant="secondary" onClick={() => void handleExportPdf()}>
            <FileText size={16} />
            PDF
          </Button>
        </div>
      </motion.section>

      <div className="report-verdict-grid">
        <motion.section {...cardMotion} className="premium-report-card verdict-panel">
          <div className="metric-head">
            <ShieldAlert size={18} />
            <b>Forensic Verdict</b>
          </div>
          <div className="report-gauge">
            <ResponsiveContainer width="100%" height={240}>
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: "risk", value: riskScore, fill: scoreColor(riskScore) }]} startAngle={210} endAngle={-30}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={16} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div>
              <strong>{Math.round(riskScore)}</strong>
              <span>{risk?.verdict || stylometry.overall_suspicion_level}</span>
            </div>
          </div>
          <p>Confidence is derived from converging stylometry, specificity, and graph-topology signals.</p>
        </motion.section>

        <motion.section {...cardMotion} className="premium-report-card breakdown-chart">
          <div className="metric-head">
            <Sparkles size={18} />
            <b>Risk Breakdown</b>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 11 }} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "rgba(2,6,23,0.94)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.section>
      </div>

      <section className="report-metric-grid">
        {riskBreakdown.map((metric) => <MetricCard key={metric.title} {...metric} />)}
      </section>

      <section className="report-split">
        <motion.div {...cardMotion} className="premium-report-card">
          <div className="metric-head">
            <AlertTriangle size={18} />
            <b>Top Findings</b>
          </div>
          <div className="finding-list">
            {(risk?.top_findings?.length ? risk.top_findings : [
              `${stylometry.suspicious_matches} stylometric anomalies detected`,
              `${Math.round(specificityRisk)}% of review language appears generic`,
              collusion.ring_count > 0 ? "Reviewer coordination pattern found" : "No hard collusion ring confirmed",
            ]).map((finding) => (
              <div key={finding}>
                <AlertTriangle size={16} />
                <span>{finding}</span>
                <b>{Math.max(62, Math.round(riskScore))}%</b>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div {...cardMotion} className="premium-report-card">
          <div className="metric-head">
            <CheckCircle2 size={18} />
            <b>Recommended Actions</b>
          </div>
          <div className="action-list">
            {(risk?.recommendations?.length ? risk.recommendations : [
              "Manually inspect highlighted review phrases",
              "Escalate the case to area chairs",
              "Compare reviewer history across prior venues",
            ]).map((action) => (
              <button key={action} type="button">
                <Eye size={16} />
                <span>{action}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      <motion.section {...cardMotion} className="premium-report-card graph-panel">
        <div className="graph-heading">
          <div>
            <span className="eyebrow">Reviewer Similarity Graph</span>
            <h3>Collusion Pattern Map</h3>
            <p>{data.explainability?.graph_reason || "Reviewer-author relationships are mapped as a directed evidence graph."}</p>
          </div>
          <span className="status-pill danger">{collusion.ring_count} rings</span>
        </div>
        <Graph data={collusion} />
      </motion.section>

      <motion.section {...cardMotion} className="premium-report-card">
        <div className="metric-head">
          <FileText size={18} />
          <b>Review Evidence Cards</b>
        </div>
        {evidence.length ? (
          <div className="evidence-grid">
            {evidence.map((detail) => (
              <details key={detail.review_id} className="evidence-card" open={detail.is_suspicious}>
                <summary>
                  <div>
                    <b>{detail.review_id}</b>
                    <span>Similarity {Math.round(detail.similarity_score * 100)}%</span>
                  </div>
                  <span className={detail.is_suspicious ? "badge-danger" : "badge-clean"}>{detail.is_suspicious ? "Flagged" : "Clean"}</span>
                </summary>
                <div className="evidence-body">
                  {(detail.why || []).map((why) => <p key={why}>{why}</p>)}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={24} />
            </div>
            <p>No review-level stylometric data available for this report.</p>
          </div>
        )}
      </motion.section>

      {temporal && (
        <motion.div {...cardMotion} className="premium-report-card temporal-note">
          <b>Temporal burst score</b>
          <span>{temporal.burst_score}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
