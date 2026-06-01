"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Command,
  Database,
  Eye,
  FileSearch,
  Fingerprint,
  History,
  LayoutDashboard,
  LineChart,
  Lock,
  Network,
  Radar,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as ReLineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.65, ease: "easeOut" },
} as const;

const riskData = [
  { name: "Stylometry", score: 84, fill: "#06B6D4" },
  { name: "Specificity", score: 68, fill: "#8B5CF6" },
  { name: "Collusion", score: 76, fill: "#EF4444" },
  { name: "Quality", score: 42, fill: "#F59E0B" },
  { name: "Diversity", score: 57, fill: "#22C55E" },
];

const timelineData = [
  { t: "09:00", risk: 28, reviews: 12 },
  { t: "10:00", risk: 36, reviews: 18 },
  { t: "11:00", risk: 34, reviews: 16 },
  { t: "12:00", risk: 62, reviews: 32 },
  { t: "13:00", risk: 79, reviews: 41 },
  { t: "14:00", risk: 74, reviews: 38 },
  { t: "15:00", risk: 86, reviews: 46 },
];

const similarityData = [
  { reviewer: "R1", score: 88 },
  { reviewer: "R2", score: 51 },
  { reviewer: "R3", score: 73 },
  { reviewer: "R4", score: 91 },
  { reviewer: "R5", score: 39 },
];

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Reports", icon: FileSearch },
  { label: "History", icon: History },
  { label: "Analytics", icon: BarChart3 },
  { label: "Saved Papers", icon: BookOpen },
  { label: "Alerts", icon: Bell },
  { label: "Settings", icon: Settings },
];

const riskIcons = [Fingerprint, Eye, Network, BrainCircuit, Database];

function AmbientStage() {
  return (
    <div className="echo-ambient" aria-hidden>
      <div className="echo-grid" />
      <div className="echo-scanline" />
      <div className="echo-particles">
        {Array.from({ length: 34 }).map((_, index) => (
          <span
            key={index}
            style={
              {
                "--x": `${(index * 37) % 100}%`,
                "--y": `${(index * 53) % 100}%`,
                "--delay": `${(index % 9) * 0.45}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className={`premium-card ${className}`}>
      {children}
    </motion.div>
  );
}

function Navbar() {
  return (
    <header className="premium-nav">
      <Link href="/" className="brand-mark" aria-label="ECHO home">
        <span className="brand-icon">
          <Radar size={18} />
        </span>
        <span>ECHO</span>
      </Link>
      <nav className="nav-links" aria-label="Primary navigation">
        <Link href="#intelligence">Docs</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/validation">Validation</Link>
        <Link href="/dashboard?q=Attention%20Is%20All%20You%20Need&auto=1">Reports</Link>
        <Link href="#findings">About</Link>
      </nav>
      <div className="nav-actions">
        <Button asChild variant="secondary" size="sm">
          <Link href="https://github.com/Geetansh-12/ECHO" target="_blank">
            <Code2 size={15} />
            GitHub
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/login">Login</Link>
        </Button>
      </div>
    </header>
  );
}

function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 36, rotateX: 8 }}
      animate={{ opacity: 1, x: 0, rotateX: 0 }}
      transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
      className="hero-console"
    >
      <div className="console-top">
        <div>
          <span className="eyebrow">Live Forensic Report</span>
          <h3>OpenReview anomaly cluster</h3>
        </div>
        <span className="status-pill danger">Elevated risk</span>
      </div>

      <div className="console-grid">
        <div className="verdict-module">
          <div className="gauge-shell">
            <ResponsiveContainer width="100%" height={174}>
              <RadialBarChart
                innerRadius="72%"
                outerRadius="100%"
                data={[{ name: "risk", score: 82, fill: "#06B6D4" }]}
                startAngle={210}
                endAngle={-30}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="score" cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="gauge-value">
              <strong>82</strong>
              <span>risk index</span>
            </div>
          </div>
          <div className="mini-caption">
            Confidence <strong>94%</strong>
          </div>
        </div>

        <div className="signal-stack">
          {riskData.slice(0, 4).map((item) => (
            <div key={item.name} className="signal-row">
              <span>{item.name}</span>
              <div className="signal-track">
                <motion.i
                  initial={{ width: 0 }}
                  animate={{ width: `${item.score}%` }}
                  transition={{ duration: 0.9, delay: 0.3 }}
                  style={{ background: item.fill }}
                />
              </div>
              <b>{item.score}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-module">
        <div className="module-heading">
          <span>Activity timeline</span>
          <LineChart size={15} />
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis hide />
            <Tooltip contentStyle={{ background: "rgba(2,6,23,0.9)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
            <Area type="monotone" dataKey="risk" stroke="#06B6D4" strokeWidth={2} fill="url(#riskFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="floating-widget widget-a">
        <Fingerprint size={16} />
        0.91 stylometry match
      </motion.div>
      <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="floating-widget widget-b">
        <Network size={16} />
        ring candidate found
      </motion.div>
    </motion.div>
  );
}

function SearchExperience() {
  return (
    <motion.div {...fadeUp} className="search-lab">
      <div className="search-shell">
        <Search className="text-cyan-300" size={22} />
        <div className="typing-text">Analyze &quot;Attention Is All You Need&quot; across OpenReview...</div>
        <kbd>
          <Command size={12} /> K
        </kbd>
        <Button asChild size="lg">
          <Link href="/dashboard?q=Attention%20Is%20All%20You%20Need&auto=1">
            <Sparkles size={18} />
            Analyze
          </Link>
        </Button>
      </div>
      <div className="thinking-panel">
        {["Resolving arXiv metadata", "Embedding review fingerprints", "Scanning specificity entropy", "Mapping reviewer graph"].map((step, index) => (
          <div key={step} className="thinking-step">
            <span className={index < 3 ? "complete" : "active"} />
            <p>{step}</p>
            <div className="waveform">
              {Array.from({ length: 12 }).map((_, i) => (
                <i key={i} style={{ animationDelay: `${i * 0.06}s` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function IntelligenceDashboard() {
  return (
    <section id="intelligence" className="product-section">
      <motion.div {...fadeUp} className="section-heading">
        <span className="eyebrow">Intelligence Dashboard</span>
        <h2>A forensic operating system for scientific integrity.</h2>
        <p>ECHO turns peer reviews into evidence: signals, timelines, reviewer graphs, phrase-level explanations, and chair-ready actions.</p>
      </motion.div>

      <div className="dashboard-shell">
        <aside className="side-rail">
          <div className="rail-collapse">
            <ShieldAlert size={18} />
          </div>
          {sidebarItems.map((item, index) => (
            <Link key={item.label} className={index === 0 ? "active" : ""} href="/dashboard">
              <item.icon size={17} />
              <span>{item.label}</span>
            </Link>
          ))}
        </aside>

        <div className="dashboard-main">
          <div className="report-header">
            <div>
              <span className="eyebrow">Paper Summary</span>
              <h3>Attention Is All You Need</h3>
              <p>Transformer architecture review cluster from OpenReview, enriched with arXiv and Semantic Scholar metadata.</p>
            </div>
            <div className="source-badges">
              <span>OpenReview</span>
              <span>arXiv</span>
              <span>Semantic Scholar</span>
            </div>
          </div>

          <div className="report-grid">
            <GlassCard className="verdict-card">
              <div className="card-title">
                <AlertTriangle size={18} />
                Forensic Verdict
              </div>
              <strong className="verdict-text">Suspicious</strong>
              <div className="meter">
                <i style={{ width: "82%" }} />
              </div>
              <div className="meta-row">
                <span>Confidence</span>
                <b>94%</b>
              </div>
            </GlassCard>

            {riskData.map((item, index) => {
              const Icon = riskIcons[index];
              return (
                <GlassCard key={item.name} className="risk-card">
                  <div className="risk-top">
                    <Icon size={18} color={item.fill} />
                    <span>{item.name}</span>
                  </div>
                  <strong>{item.score}</strong>
                  <div className="sparkline">
                    <ResponsiveContainer width="100%" height={42}>
                      <ReLineChart data={timelineData.map((d, i) => ({ x: i, y: Math.max(8, d.risk - index * 7 + i * 2) }))}>
                        <Line type="monotone" dataKey="y" stroke={item.fill} strokeWidth={2} dot={false} />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="meter">
                    <i style={{ width: `${item.score}%`, background: item.fill }} />
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <div className="analytics-grid">
            <GlassCard className="wide-card">
              <div className="card-title">
                <Activity size={18} />
                Suspicious Activity Timeline
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                  <XAxis dataKey="t" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip contentStyle={{ background: "rgba(2,6,23,0.92)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="risk" stroke="#8B5CF6" strokeWidth={2} fill="url(#timelineFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard>
              <div className="card-title">
                <Fingerprint size={18} />
                Reviewer Similarity
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={similarityData}>
                  <XAxis dataKey="reviewer" stroke="#64748B" />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "rgba(2,6,23,0.92)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                    {similarityData.map((entry) => (
                      <Cell key={entry.reviewer} fill={entry.score > 80 ? "#EF4444" : "#06B6D4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function FindingsAndActions() {
  const findings = [
    { title: "50% of reviews appear generic", meta: "High - 88% confidence", icon: AlertTriangle },
    { title: "High linguistic similarity detected", meta: "Critical - 94% confidence", icon: Fingerprint },
    { title: "Possible reviewer coordination", meta: "Medium - 76% confidence", icon: Network },
  ];

  const actions = [
    { title: "Manual inspection", body: "Send phrase-level evidence to area chairs.", icon: Eye, href: "/dashboard?q=Attention%20Is%20All%20You%20Need&auto=1" },
    { title: "Escalate to chairs", body: "Open a structured integrity review workflow.", icon: ShieldAlert, href: "/dashboard" },
    { title: "Compare history", body: "Cross-check reviewer behavior across prior venues.", icon: History, href: "/sources" },
  ];

  return (
    <section id="findings" className="product-section final-band">
      <div className="insight-columns">
        <motion.div {...fadeUp}>
          <span className="eyebrow">Top Findings</span>
          <h2>Signal, severity, confidence.</h2>
          <div className="insight-list">
            {findings.map((finding) => (
              <GlassCard key={finding.title}>
                <div className="insight-card">
                  <finding.icon size={20} />
                  <div>
                    <b>{finding.title}</b>
                    <span>{finding.meta}</span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>
        <motion.div {...fadeUp}>
          <span className="eyebrow">Recommended Actions</span>
          <h2>From anomaly to next step.</h2>
          <div className="insight-list">
            {actions.map((action) => (
              <GlassCard key={action.title}>
                <div className="action-card">
                  <action.icon size={20} />
                  <div>
                    <b>{action.title}</b>
                    <p>{action.body}</p>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={action.href}>Open</Link>
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="premium-page">
      <AmbientStage />
      <Navbar />

      <section className="hero-section">
        <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: "easeOut" }} className="hero-copy">
          <span className="hero-badge">
            <Lock size={14} />
            AI-native scientific integrity platform
          </span>
          <h1>Know What&apos;s Real.</h1>
          <p>AI-powered forensic analysis for scientific peer reviews across OpenReview, arXiv, and Semantic Scholar.</p>
          <div className="feature-bullets">
            {[
              "Generic and low-specificity review detection",
              "Stylometry similarity and collusion graph analysis",
              "Suspicious reviewer behavior with explainable evidence",
            ].map((item) => (
              <span key={item}>
                <CheckCircle2 size={16} />
                {item}
              </span>
            ))}
          </div>
          <div className="hero-actions">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Open Command Center <ArrowRight size={18} />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="#intelligence">
                View Report System <Zap size={18} />
              </Link>
            </Button>
          </div>
        </motion.div>

        <HeroPreview />
      </section>

      <SearchExperience />
      <IntelligenceDashboard />
      <FindingsAndActions />
    </main>
  );
}
