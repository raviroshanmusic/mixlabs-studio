"use client";
import { useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import Sidebar from "@/components/ui/Sidebar";
import NewProjectModal from "@/components/ui/NewProjectModal";
import {
  Plus, Search, Volume2, Music, Palette, Scissors, Wand2, Zap,
  MessageSquare, FileText, Users, PlayCircle, ArrowUpRight,
  Clock, ChevronRight,
} from "lucide-react";

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

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string; border: string; label: string; hex: string }> = {
  "active":    { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/8",  border: "border-emerald-400/20", label: "Active",    hex: "#34d399" },
  "in review": { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-400/8",    border: "border-amber-400/20",   label: "In Review", hex: "#fbbf24" },
  "ready":     { dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-400/8",     border: "border-blue-400/20",    label: "Ready",     hex: "#60a5fa" },
  "paused":    { dot: "bg-zinc-500",    text: "text-zinc-400",    bg: "bg-zinc-400/5",     border: "border-zinc-600",       label: "Paused",    hex: "#71717a" },
  "delivered": { dot: "bg-violet-400",  text: "text-violet-400",  bg: "bg-violet-400/8",   border: "border-violet-400/20",  label: "Delivered", hex: "#a78bfa" },
};

const DEPT_META: Record<string, { icon: React.ReactNode; accent: string; bg: string }> = {
  Sound:     { icon: <Volume2 size={10} />,  accent: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  Score:     { icon: <Music size={10} />,    accent: "#A855F7", bg: "rgba(168,85,247,0.10)" },
  Color:     { icon: <Palette size={10} />,  accent: "#EC4899", bg: "rgba(236,72,153,0.10)" },
  Edit:      { icon: <Scissors size={10} />, accent: "#3B82F6", bg: "rgba(59,130,246,0.10)" },
  Animation: { icon: <Wand2 size={10} />,    accent: "#22C55E", bg: "rgba(34,197,94,0.10)"  },
  VFX:       { icon: <Zap size={10} />,      accent: "#F97316", bg: "rgba(249,115,22,0.10)" },
};

const STATUS_TABS = ["All", "Active", "In Review", "Ready", "Paused", "Delivered"] as const;
type StatusTab = typeof STATUS_TABS[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function greeting(name: string): string {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${name.split(" ")[0]}`;
}

function fmtTimecode(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const st = STATUS_CONFIG[project.status] ?? STATUS_CONFIG["paused"];
  const depts = project.departments ?? [];

  return (
    <div className="group relative flex flex-col rounded-2xl border border-white/[0.07] hover:border-white/14 bg-[#111] hover:bg-[#141414] transition-all overflow-hidden">
      {/* Status accent bar */}
      <div className="h-px w-full" style={{ background: st.hex }} />

      <div className="p-4 md:p-5 flex flex-col gap-3 flex-1">
        {/* Top: name + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {project.client && (
              <p className="text-white/20 text-[9px] tracking-[0.2em] uppercase mb-1">{project.client}</p>
            )}
            <h3 className="text-white/85 text-sm font-medium leading-snug group-hover:text-white transition-colors line-clamp-2">
              {project.name}
            </h3>
          </div>
          <span className={`shrink-0 text-[9px] tracking-widest uppercase px-2 py-1 rounded-full border font-medium ${st.text} ${st.bg} ${st.border}`}>
            {st.label}
          </span>
        </div>

        {/* Departments */}
        {depts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {depts.map(d => {
              const m = DEPT_META[d];
              return m ? (
                <span key={d} className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border"
                  style={{ color: m.accent, borderColor: m.accent + "25", background: m.bg }}>
                  {m.icon} {d}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-1 border-t border-white/[0.05]">
          {project.memberCount > 0 && (
            <span className="flex items-center gap-1 text-white/25 text-[10px]">
              <Users size={10} /> {project.memberCount}
            </span>
          )}
          {project.fileCount > 0 && (
            <span className="flex items-center gap-1 text-white/25 text-[10px]">
              <FileText size={10} /> {project.fileCount}
            </span>
          )}
          <span className="flex items-center gap-1 text-white/20 text-[10px] ml-auto">
            <Clock size={9} /> {timeAgo(project.updated_at)}
          </span>
        </div>
      </div>

      {/* Tap/hover actions — on mobile always visible at bottom, on desktop overlay */}
      <div className="md:absolute md:inset-0 flex items-center justify-center gap-2
        md:opacity-0 md:group-hover:opacity-100 md:transition-all md:bg-black/60 md:backdrop-blur-sm md:rounded-2xl
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
    </div>
  );
}

// ─── Activity Feed ─────────────────────────────────────────────────────────────

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
        <a key={item.id}
          href={item.type === "comment" ? `/review/${item.projectId}` : `/project/${item.projectId}`}
          className={`flex items-start gap-3 py-3 px-2 -mx-2 rounded-xl hover:bg-white/[0.03] transition-colors group ${i < items.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
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
        </a>
      ))}
    </div>
  );
}

// ─── Attention Banner ─────────────────────────────────────────────────────────

function AttentionBanner({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;
  return (
    <div className="mb-5 p-4 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04]">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <p className="text-amber-400/80 text-[10px] tracking-[0.2em] uppercase font-medium">
          Needs Review — {projects.length} {projects.length === 1 ? "project" : "projects"} waiting
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {projects.map(p => (
          <a key={p.id} href={`/review/${p.id}`}
            className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white/70 hover:text-white transition-all">
            <PlayCircle size={11} className="text-amber-400/60" />
            {p.name}
            <ChevronRight size={10} className="text-white/20" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardClient({ user, projects, profile, activity, stats }: {
  user: User; projects: Project[]; profile: Profile; activity: ActivityItem[]; stats: Stats;
}) {
  const [filter, setFilter] = useState<StatusTab>("All");
  const [search, setSearch] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  const displayName = profile?.full_name || user.email?.split("@")[0] || "there";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const filtered = useMemo(() => projects.filter(p => {
    const matchStatus = filter === "All" || p.status.toLowerCase() === filter.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [projects, filter, search]);

  const inReviewProjects = projects.filter(p => p.status === "in review");

  return (
    <div className="flex bg-[#0A0A0A] overflow-hidden" style={{ height: '100dvh' }}>
      <Sidebar active="dashboard" userName={displayName} userInitials={initials} />

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Extra bottom padding on mobile so bottom nav doesn't cover content + safe area */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 pb-28 md:pb-10">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-4 mb-7 md:mb-10">
            <div>
              <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase mb-1">
                {profile?.company || "MixLabs Studio"}
              </p>
              <h1 className="text-white text-xl md:text-3xl font-light tracking-wide leading-tight">
                {greeting(displayName)}
              </h1>
              <p className="text-white/25 text-xs md:text-sm mt-1">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <button onClick={() => setShowNewProject(true)}
              className="flex items-center gap-1.5 bg-white text-black rounded-xl px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium hover:bg-white/90 transition-all shadow-lg shadow-white/5 shrink-0 whitespace-nowrap">
              <Plus size={13} />
              <span>New Project</span>
            </button>
          </div>

          {/* ── Stats Strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 mb-6 md:mb-8">
            {[
              { label: "Total",     value: stats.total,     color: "text-white"       },
              { label: "Active",    value: stats.active,    color: "text-emerald-400" },
              { label: "In Review", value: stats.inReview,  color: "text-amber-400"   },
              { label: "Delivered", value: stats.delivered, color: "text-violet-400"  },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
                <p className={`text-2xl md:text-3xl font-light tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-white/25 text-[9px] tracking-widest uppercase mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── Needs Attention ── */}
          <AttentionBanner projects={inReviewProjects} />

          {/* ── Search + Filter ── */}
          <div className="flex flex-col gap-2.5 mb-5 min-w-0">
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2.5 focus-within:border-white/15 transition-colors">
              <Search size={13} className="text-white/20 shrink-0" />
              <input
                placeholder="Search projects…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-white/20 outline-none w-full min-w-0"
              />
            </div>
            {/* Horizontal scroll filter — works on all screen sizes */}
            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/8 rounded-xl p-1 overflow-x-auto scrollbar-hide">
              {STATUS_TABS.map(tab => (
                <button key={tab} onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] tracking-wide transition-all whitespace-nowrap shrink-0 ${filter === tab ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <p className="text-white/20 text-[10px] tracking-widest uppercase mb-4">
            {filtered.length} {filtered.length === 1 ? "project" : "projects"}
            {search && ` matching "${search}"`}
          </p>

          {/* ── Main Grid: Projects + Activity ── */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Projects */}
            <div className="flex-1 min-w-0">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  {search ? (
                    <>
                      <p className="text-white/20 text-sm">No projects match &quot;{search}&quot;</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
                </div>
              )}
            </div>

            {/* Activity sidebar — full width on mobile, fixed width on desktop */}
            <div className="w-full lg:w-72 lg:shrink-0 flex flex-col gap-4 md:gap-6">

              {/* Activity feed */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 md:p-5">
                <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-4">Recent Activity</p>
                <ActivityFeed items={activity} />
              </div>

              {/* Quick access */}
              {projects.filter(p => p.status !== "delivered").length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 md:p-5">
                  <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-3">Quick Access</p>
                  <div className="flex flex-col gap-1">
                    {projects.filter(p => p.status !== "delivered").slice(0, 4).map(p => (
                      <a key={p.id} href={`/review/${p.id}`}
                        className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.05] transition-colors group">
                        <PlayCircle size={13} className="text-white/20 group-hover:text-white/50 shrink-0 transition-colors" />
                        <span className="text-white/50 text-xs truncate group-hover:text-white/80 transition-colors">{p.name}</span>
                        <ChevronRight size={10} className="text-white/10 ml-auto group-hover:text-white/30 shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
    </div>
  );
}
