"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, animate, useInView } from "framer-motion";
import { User } from "@supabase/supabase-js";
import Sidebar from "@/components/ui/Sidebar";
import NewProjectModal from "@/components/ui/NewProjectModal";
import {
  Plus, Search, Volume2, Music, Palette, Scissors, Wand2, Zap,
  MessageSquare, FileText, Users, PlayCircle, ArrowUpRight,
  Clock, ChevronRight, Activity, CalendarClock, Radio,
  TrendingUp, TrendingDown, Minus, AlertTriangle, Layers,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

// ─── Types ───────────────────────────────────────────────────────────────────

type Project = {
  id: string; name: string; client: string | null; status: string;
  departments: string[]; created_at: string; updated_at: string;
  memberCount: number; fileCount: number;
};
type ActivityItem = {
  id: string; type: "comment" | "file"; text: string; author: string;
  projectId: string; projectName: string; date: string; timecode: number | null;
};
type Stats = { active: number; inReview: number; delivered: number; total: number };
type Profile = { id: string; full_name: string | null; email: string | null; company: string | null } | null;
type Momentum = { thisWeek: number; lastWeek: number; deltaPct: number };
type DeptLoad = { dept: string; count: number };
type Deadline = {
  id: string; title: string; department: string | null; projectId: string;
  projectName: string; status: "planned" | "active"; startDate: string; endDate: string;
  elapsed: number; daysLeft: number;
};
type Totals = { files: number; comments: number; members: number; milestones: number };

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string; border: string; label: string; hex: string }> = {
  "active":    { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/8",  border: "border-emerald-400/20", label: "Active",    hex: "#34d399" },
  "in review": { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-400/8",    border: "border-amber-400/20",   label: "In Review", hex: "#fbbf24" },
  "ready":     { dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-400/8",     border: "border-blue-400/20",    label: "Ready",     hex: "#60a5fa" },
  "paused":    { dot: "bg-zinc-500",    text: "text-zinc-400",    bg: "bg-zinc-400/5",     border: "border-zinc-600",       label: "Paused",    hex: "#71717a" },
  "delivered": { dot: "bg-violet-400",  text: "text-violet-400",  bg: "bg-violet-400/8",   border: "border-violet-400/20",  label: "Delivered", hex: "#a78bfa" },
};

const DEPT_HEX: Record<string, string> = {
  Sound: "#fbbf24", Score: "#a78bfa", Color: "#f472b6",
  Edit: "#60a5fa", Animation: "#34d399", VFX: "#fb923c",
};
const DEPT_ICON: Record<string, React.ReactNode> = {
  Sound: <Volume2 size={10} />, Score: <Music size={10} />, Color: <Palette size={10} />,
  Edit: <Scissors size={10} />, Animation: <Wand2 size={10} />, VFX: <Zap size={10} />,
};
const deptHex = (d: string | null) => (d && DEPT_HEX[d]) || "#9ca3af";

const STATUS_TABS = ["All", "Active", "In Review", "Ready", "Paused", "Delivered"] as const;
type StatusTab = typeof STATUS_TABS[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, "0");

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function fmtTimecode(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${pad2(m)}:${pad2(s)}`;
}

function urgency(daysLeft: number): { hex: string; label: string } {
  if (daysLeft < 0)  return { hex: "#f87171", label: `${Math.abs(daysLeft)}d over` };
  if (daysLeft === 0) return { hex: "#f87171", label: "due today" };
  if (daysLeft <= 3) return { hex: "#fb923c", label: `${daysLeft}d left` };
  if (daysLeft <= 7) return { hex: "#fbbf24", label: `${daysLeft}d left` };
  return { hex: "#34d399", label: `${daysLeft}d left` };
}

// ─── Motion variants ─────────────────────────────────────────────────────────

const grid = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } } };
const rise = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show:   { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
};

// ─── Live timecode clock ─────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 80);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Timecode() {
  const now = useClock();
  if (!now) return <span className="font-mono tabular-nums text-white/55">--:--:--:--</span>;
  const ff = Math.floor(now.getMilliseconds() / (1000 / 24));
  return (
    <span className="font-mono tabular-nums text-white/55">
      {pad2(now.getHours())}<span className="tc-colon text-white/30">:</span>
      {pad2(now.getMinutes())}<span className="tc-colon text-white/30">:</span>
      {pad2(now.getSeconds())}<span className="text-white/25">:</span>
      <span className="text-white/40">{pad2(ff)}</span>
    </span>
  );
}

// ─── Animated count-up ───────────────────────────────────────────────────────

function CountUp({ value, duration = 1.1 }: { value: number; duration?: number }) {
  const [d, setD] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: v => setD(v) });
    return () => controls.stop();
  }, [inView, value, duration]);
  return <span ref={ref}>{Math.round(d)}</span>;
}

// ─── Cinematic corner brackets ───────────────────────────────────────────────

function Corners() {
  const c = "absolute w-2.5 h-2.5 border-white/15 pointer-events-none";
  return (
    <>
      <span className={`${c} top-2 left-2 border-l border-t`} />
      <span className={`${c} top-2 right-2 border-r border-t`} />
      <span className={`${c} bottom-2 left-2 border-l border-b`} />
      <span className={`${c} bottom-2 right-2 border-r border-b`} />
    </>
  );
}

// ─── Panel shell ─────────────────────────────────────────────────────────────

function Panel({ title, icon, right, children, className = "" }: {
  title: string; icon?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <motion.div variants={rise}
      className={`relative rounded-2xl border border-white/[0.07] bg-[#111] overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 md:px-5 pt-4 pb-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2 text-white/40">
          {icon}
          <p className="text-[9px] tracking-[0.25em] uppercase">{title}</p>
        </div>
        {right}
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </motion.div>
  );
}

// ─── Activity Pulse (SVG sparkline) ──────────────────────────────────────────

function Pulse({ values, momentum }: { values: number[]; momentum: Momentum }) {
  const W = 240, H = 72, P = 6;
  const max = Math.max(1, ...values);
  const step = (W - P * 2) / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => [P + i * step, H - P - (v / max) * (H - P * 2)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${H} L ${pts[0][0].toFixed(1)} ${H} Z`;
  const last = pts[pts.length - 1];
  const total = values.reduce((a, b) => a + b, 0);

  const up = momentum.deltaPct > 0, flat = momentum.deltaPct === 0;
  const trendHex = flat ? "#9ca3af" : up ? "#34d399" : "#f87171";
  const TrendIcon = flat ? Minus : up ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-white text-3xl font-light tabular-nums leading-none"><CountUp value={total} /></p>
          <p className="text-white/25 text-[9px] tracking-widest uppercase mt-1.5">events · 14 days</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border"
          style={{ color: trendHex, borderColor: `${trendHex}33`, background: `${trendHex}14` }}>
          <TrendIcon size={11} />
          <span className="text-[11px] font-medium tabular-nums">{up ? "+" : ""}{momentum.deltaPct}%</span>
        </div>
      </div>

      <div className="relative text-white/10">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[72px]" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* baseline grid */}
          {[0.25, 0.5, 0.75].map(g => (
            <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} stroke="currentColor" strokeWidth={1} strokeDasharray="2 4" />
          ))}
          <motion.path d={area} fill="url(#pulseFill)"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} />
          <motion.path d={line} fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
          <motion.circle cx={last[0]} cy={last[1]} r={3.5} fill="#818cf8"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.3, type: "spring" }} />
          <circle cx={last[0]} cy={last[1]} r={3.5} fill="#818cf8" className="animate-ping" opacity={0.5} />
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-white/25 pt-1 border-t border-white/[0.05]">
        <span>This week <span className="text-white/55 tabular-nums">{momentum.thisWeek}</span></span>
        <span>Last week <span className="text-white/40 tabular-nums">{momentum.lastWeek}</span></span>
      </div>
    </div>
  );
}

// ─── Deadline Runway ─────────────────────────────────────────────────────────

function Runway({ deadlines }: { deadlines: Deadline[] }) {
  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <CalendarClock size={22} className="text-white/10" />
        <p className="text-white/25 text-xs">No upcoming milestones</p>
        <p className="text-white/15 text-[10px]">Add deadlines from a project timeline</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3.5">
      {deadlines.map((d, i) => {
        const u = urgency(d.daysLeft);
        const dh = deptHex(d.department);
        return (
          <a key={d.id} href={`/project/${d.projectId}`}
            className="group block">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dh, boxShadow: `0 0 6px ${dh}` }} />
                <p className="text-white/80 text-xs font-medium truncate group-hover:text-white transition-colors">{d.title}</p>
                <span className="text-white/20 text-[10px] truncate hidden sm:inline">· {d.projectName}</span>
              </div>
              <span className="shrink-0 text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-md"
                style={{ color: u.hex, background: `${u.hex}14` }}>{u.label}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: `linear-gradient(90deg, ${dh}88, ${dh})` }}
                initial={{ width: 0 }} animate={{ width: `${Math.round(d.elapsed * 100)}%` }}
                transition={{ duration: 1, delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }} />
            </div>
          </a>
        );
      })}
    </div>
  );
}

// ─── Department Load ─────────────────────────────────────────────────────────

function DeptLoadView({ deptLoad }: { deptLoad: DeptLoad[] }) {
  if (deptLoad.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <Layers size={20} className="text-white/10" />
        <p className="text-white/20 text-xs">No files yet</p>
      </div>
    );
  }
  const max = Math.max(...deptLoad.map(d => d.count));
  return (
    <div className="flex flex-col gap-3">
      {deptLoad.map((d, i) => {
        const hex = deptHex(d.dept);
        return (
          <div key={d.dept} className="flex items-center gap-3">
            <span className="w-16 shrink-0 flex items-center gap-1.5 text-[11px] text-white/55" style={{ color: hex }}>
              {DEPT_ICON[d.dept] ?? <FileText size={10} />}
              <span className="truncate">{d.dept}</span>
            </span>
            <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div className="h-full rounded-full"
                style={{ background: hex }}
                initial={{ width: 0 }} animate={{ width: `${(d.count / max) * 100}%` }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.07, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <span className="w-5 text-right text-[11px] text-white/40 tabular-nums shrink-0">{d.count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Activity Feed ───────────────────────────────────────────────────────────

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <Clock size={20} className="text-white/10" />
        <p className="text-white/15 text-xs">No activity yet</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <motion.a key={item.id}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.04, duration: 0.4 }}
          href={item.type === "comment" ? `/review/${item.projectId}` : `/project/${item.projectId}`}
          className={`flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-white/[0.03] transition-colors group ${i < items.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
          <div className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${item.type === "comment" ? "bg-violet-400/10" : "bg-blue-400/10"}`}>
            {item.type === "comment"
              ? <MessageSquare size={10} className="text-violet-400/60" />
              : <FileText size={10} className="text-blue-400/60" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs leading-relaxed line-clamp-1 group-hover:text-white/80 transition-colors">{item.text}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-white/20 text-[10px] truncate">{item.projectName}</span>
              {item.timecode != null && (
                <><span className="text-white/10 text-[10px]">·</span>
                <span className="text-white/20 text-[10px] font-mono">{fmtTimecode(item.timecode)}</span></>
              )}
            </div>
          </div>
          <span className="text-white/15 text-[10px] shrink-0 mt-0.5">{timeAgo(item.date)}</span>
        </motion.a>
      ))}
    </div>
  );
}

// ─── Telemetry stat tile ─────────────────────────────────────────────────────

function StatTile({ label, value, hex }: { label: string; value: number; hex: string }) {
  return (
    <motion.div variants={rise}
      whileHover={{ y: -3 }}
      className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 overflow-hidden group">
      <span className="absolute top-0 left-0 h-px w-full" style={{ background: `linear-gradient(90deg, ${hex}, transparent)` }} />
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: hex, boxShadow: `0 0 8px ${hex}` }} />
        <p className="text-3xl md:text-[2rem] font-light tabular-nums leading-none" style={{ color: hex }}>
          <CountUp value={value} />
        </p>
      </div>
      <p className="text-white/25 text-[9px] tracking-widest uppercase mt-2">{label}</p>
    </motion.div>
  );
}

// ─── Project Card ────────────────────────────────────────────────────────────

function ProjectCard({ project, isLight }: { project: Project; isLight: boolean }) {
  const st = STATUS_CONFIG[project.status] ?? STATUS_CONFIG["paused"];
  const depts = project.departments ?? [];
  const tagColor  = isLight ? "rgba(0,0,0,0.60)" : "rgba(255,255,255,0.50)";
  const tagBorder = isLight ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.10)";
  const tagBg     = isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";

  return (
    <motion.div variants={rise} whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="group relative flex flex-col rounded-2xl border border-white/[0.07] hover:border-white/14 bg-[#111] hover:bg-[#141414] transition-colors overflow-hidden">
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${st.hex}, ${st.hex}33)` }} />

      <div className="p-4 md:p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {project.client && (
              <p className="text-white/20 text-[9px] tracking-[0.2em] uppercase mb-1">{project.client}</p>
            )}
            <h3 className="text-white/85 text-sm font-medium leading-snug group-hover:text-white transition-colors line-clamp-2">
              {project.name}
            </h3>
          </div>
          <span className={`shrink-0 flex items-center gap-1 text-[9px] tracking-widest uppercase px-2 py-1 rounded-full border font-medium ${st.text} ${st.bg} ${st.border}`}>
            <span className={`w-1 h-1 rounded-full ${st.dot} ${project.status === "in review" ? "animate-pulse" : ""}`} />
            {st.label}
          </span>
        </div>

        {depts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {depts.map(d => (
              <span key={d} className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border"
                style={{ color: tagColor, borderColor: tagBorder, background: tagBg }}>
                {DEPT_ICON[d]} {d}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1 border-t border-white/[0.05]">
          {project.memberCount > 0 && (
            <span className="flex items-center gap-1 text-white/25 text-[10px]"><Users size={10} /> {project.memberCount}</span>
          )}
          {project.fileCount > 0 && (
            <span className="flex items-center gap-1 text-white/25 text-[10px]"><FileText size={10} /> {project.fileCount}</span>
          )}
          <span className="flex items-center gap-1 text-white/20 text-[10px] ml-auto"><Clock size={9} /> {timeAgo(project.updated_at)}</span>
        </div>
      </div>

      <div className="md:absolute md:inset-0 flex items-center justify-center gap-2
        md:opacity-0 md:group-hover:opacity-100 md:transition-opacity md:bg-black/60 md:backdrop-blur-sm md:rounded-2xl
        border-t border-white/[0.04] md:border-0 px-4 py-3 md:py-0 md:px-0 bg-transparent">
        <a href={`/project/${project.id}`}
          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white text-black text-xs font-medium px-4 py-2 rounded-xl hover:bg-white/90 transition-all">
          Open <ArrowUpRight size={12} />
        </a>
        <a href={`/review/${project.id}`}
          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white/[0.06] text-white/70 text-xs px-4 py-2 rounded-xl hover:bg-white/10 transition-all border border-white/10">
          <PlayCircle size={12} /> Review
        </a>
      </div>
    </motion.div>
  );
}

// ─── Telemetry ticker ────────────────────────────────────────────────────────

function Ticker({ signals }: { signals: string[] }) {
  const line = signals.join("      ·      ");
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.015] h-8 flex items-center">
      <div className="shrink-0 flex items-center gap-1.5 px-3 h-full border-r border-white/[0.06] bg-white/[0.02]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400/80 text-[9px] tracking-[0.2em] uppercase font-medium">Live</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="marquee-track text-[10px] text-white/35 tracking-wide">
          <span className="px-4">{line}</span>
          <span className="px-4">{line}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function DashboardClient({ user, projects, profile, activity, stats, pulse, momentum, deptLoad, deadlines, totals }: {
  user: User; projects: Project[]; profile: Profile; activity: ActivityItem[]; stats: Stats;
  pulse: number[]; momentum: Momentum; deptLoad: DeptLoad[]; deadlines: Deadline[]; totals: Totals;
}) {
  const [filter, setFilter] = useState<StatusTab>("All");
  const [search, setSearch] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  const { theme } = useTheme();
  const isLight = theme === "light";
  const displayName = profile?.full_name || user.email?.split("@")[0] || "there";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const filtered = useMemo(() => projects.filter(p => {
    const matchStatus = filter === "All" || p.status.toLowerCase() === filter.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [projects, filter, search]);

  const inReviewProjects = projects.filter(p => p.status === "in review");
  const topDept = deptLoad[0];
  const nextDeadline = deadlines[0];

  const signals = [
    `${stats.total} PROJECTS TRACKED`,
    `${stats.active} ACTIVE`,
    `${stats.inReview} IN REVIEW`,
    nextDeadline ? `NEXT DEADLINE — ${nextDeadline.title.toUpperCase()} ${urgency(nextDeadline.daysLeft).label.toUpperCase()}` : "NO DEADLINES SCHEDULED",
    `${totals.files} FILES`,
    `${totals.comments} NOTES`,
    topDept ? `BUSIEST DEPT — ${topDept.dept.toUpperCase()}` : "",
    activity[0] ? `LAST ACTIVITY ${timeAgo(activity[0].date).toUpperCase()}` : "",
  ].filter(Boolean);

  return (
    <div className="flex bg-[#0A0A0A] overflow-hidden grain" style={{ height: "100dvh" }}>
      <Sidebar active="dashboard" userName={displayName} userInitials={initials} />

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-9 pb-28 md:pb-10">

          {/* ── Header ── */}
          <motion.div initial="hidden" animate="show" variants={grid}
            className="flex items-start justify-between gap-4 mb-5">
            <motion.div variants={rise}>
              <div className="flex items-center gap-2 mb-1.5">
                <Radio size={11} className="text-emerald-400/70" />
                <p className="text-white/25 text-[10px] tracking-[0.3em] uppercase">{profile?.company || "MixLabs Studio"}</p>
              </div>
              <h1 className="text-white text-2xl md:text-4xl font-light tracking-wide leading-tight">
                {greeting()}, <span className="text-white/55">{displayName.split(" ")[0]}</span>
              </h1>
              <p className="text-white/25 text-xs md:text-sm mt-1">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </motion.div>

            <motion.div variants={rise} className="flex flex-col items-end gap-2.5">
              <button onClick={() => setShowNewProject(true)}
                className="flex items-center gap-1.5 bg-white text-black rounded-xl px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium hover:bg-white/90 transition-all shadow-lg shadow-white/5 shrink-0 whitespace-nowrap">
                <Plus size={13} /> <span>New Project</span>
              </button>
              <div className="hidden md:flex items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-rose-400/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> REC
                </span>
                <Timecode />
              </div>
            </motion.div>
          </motion.div>

          {/* ── Live ticker ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-6">
            <Ticker signals={signals} />
          </motion.div>

          {/* ── Telemetry strip ── */}
          <motion.div initial="hidden" animate="show" variants={grid}
            className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 mb-4 md:mb-5">
            <StatTile label="Total"     value={stats.total}     hex="#e5e7eb" />
            <StatTile label="Active"    value={stats.active}    hex="#34d399" />
            <StatTile label="In Review" value={stats.inReview}  hex="#fbbf24" />
            <StatTile label="Delivered" value={stats.delivered} hex="#a78bfa" />
          </motion.div>

          {/* ── Hero command grid ── */}
          <motion.div initial="hidden" animate="show" variants={grid}
            className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
            {/* Deadline runway */}
            <div className="lg:col-span-2">
              <Panel title="Deadline Runway" icon={<CalendarClock size={12} />}
                right={<span className="text-white/20 text-[10px] tabular-nums">{deadlines.length} upcoming</span>}>
                <Runway deadlines={deadlines} />
              </Panel>
            </div>
            {/* Activity pulse */}
            <Panel title="Activity Pulse" icon={<Activity size={12} />}>
              <Pulse values={pulse} momentum={momentum} />
            </Panel>
          </motion.div>

          {/* ── Secondary grid ── */}
          <motion.div initial="hidden" animate="show" variants={grid}
            className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-7 md:mb-9">
            {/* Department load */}
            <Panel title="Department Load" icon={<Layers size={12} />}>
              <DeptLoadView deptLoad={deptLoad} />
            </Panel>

            {/* Needs attention */}
            <Panel title="Needs Attention" icon={<AlertTriangle size={12} />}
              right={inReviewProjects.length > 0 ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> : null}>
              {inReviewProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="w-8 h-8 rounded-full border border-emerald-400/20 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <p className="text-white/25 text-xs">All clear</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {inReviewProjects.map(p => (
                    <a key={p.id} href={`/review/${p.id}`}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-400/[0.04] border border-amber-400/15 hover:bg-amber-400/[0.08] transition-all group">
                      <PlayCircle size={13} className="text-amber-400/70 shrink-0" />
                      <span className="text-white/70 text-xs truncate flex-1 group-hover:text-white transition-colors">{p.name}</span>
                      <ChevronRight size={11} className="text-white/20 group-hover:text-white/40 shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </Panel>

            {/* Recent activity */}
            <Panel title="Recent Activity" icon={<Activity size={12} />}>
              <ActivityFeed items={activity} />
            </Panel>
          </motion.div>

          {/* ── Projects ── */}
          <div className="flex flex-col gap-2.5 mb-5 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FolderGlyph />
                <h2 className="text-white/70 text-sm tracking-wide">Projects</h2>
                <span className="text-white/20 text-[10px] tabular-nums">
                  {filtered.length}{search && ` matching “${search}”`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2.5 focus-within:border-white/15 transition-colors">
              <Search size={13} className="text-white/20 shrink-0" />
              <input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-white/20 outline-none w-full min-w-0" />
            </div>
            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/8 rounded-xl p-1 overflow-x-auto scrollbar-hide">
              {STATUS_TABS.map(tab => (
                <button key={tab} onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] tracking-wide transition-all whitespace-nowrap shrink-0 ${filter === tab ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              {search ? (
                <>
                  <p className="text-white/20 text-sm">No projects match “{search}”</p>
                  <button onClick={() => setSearch("")} className="text-white/30 hover:text-white/60 text-xs transition-colors">Clear search</button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowNewProject(true)}
                    className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center hover:border-white/20 transition-all group">
                    <Plus size={20} className="text-white/20 group-hover:text-white/50 transition-colors" />
                  </button>
                  <p className="text-white/20 text-sm">Start your first project</p>
                </>
              )}
            </div>
          ) : (
            <motion.div initial="hidden" animate="show" variants={grid}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              <AnimatePresence>
                {filtered.map(p => <ProjectCard key={p.id} project={p} isLight={isLight} />)}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
    </div>
  );
}

function FolderGlyph() {
  return <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[#818cf8] to-transparent" />;
}
