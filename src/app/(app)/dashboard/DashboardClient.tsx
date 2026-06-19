"use client";
import { useState, useMemo, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import {
  Plus, Search, Volume2, Music, Palette, Scissors, Wand2, Zap,
  Users, FileText, PlayCircle, ArrowUpRight, Clock, FolderOpen,
  Activity, CalendarClock, MessageSquare, Package, Check,
} from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";
import NewProjectModal from "@/components/ui/NewProjectModal";
import { isStaffEmail } from "@/lib/staff";

// ─── Types ─────────────────────────────────────────────────────────────────────

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
type Deadline = {
  id: string; title: string; department: string | null; projectId: string;
  projectName: string; status: "planned" | "active"; startDate: string; endDate: string;
  elapsed: number; daysLeft: number;
};

// ─── Constants (aligned with project workspace) ─────────────────────────────────

const DEPT_META: Record<string, { icon: React.ReactNode; hex: string }> = {
  Sound:     { icon: <Volume2 size={11}/>,  hex: "#F59E0B" },
  Score:     { icon: <Music size={11}/>,    hex: "#A855F7" },
  Color:     { icon: <Palette size={11}/>,  hex: "#EC4899" },
  Edit:      { icon: <Scissors size={11}/>, hex: "#3B82F6" },
  Animation: { icon: <Wand2 size={11}/>,    hex: "#22C55E" },
  VFX:       { icon: <Zap size={11}/>,      hex: "#F97316" },
};
const deptHex = (d: string | null) => (d && DEPT_META[d]?.hex) || "#9ca3af";

const STATUS_STYLES: Record<string, { dot: string; label: string; border: string }> = {
  "active":    { dot: "bg-emerald-400", label: "text-emerald-400", border: "border-emerald-400/30" },
  "in review": { dot: "bg-amber-400",   label: "text-amber-400",   border: "border-amber-400/30"   },
  "ready":     { dot: "bg-blue-400",    label: "text-blue-400",    border: "border-blue-400/30"    },
  "paused":    { dot: "bg-zinc-500",    label: "text-zinc-400",    border: "border-zinc-600"       },
  "delivered": { dot: "bg-violet-400",  label: "text-violet-400",  border: "border-violet-400/30"  },
};

const STATUS_TABS = ["All", "Active", "In Review", "Ready", "Paused", "Delivered"] as const;
type StatusTab = typeof STATUS_TABS[number];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// ─── Card shell (project-workspace idiom) ───────────────────────────────────────

function Card({ label, right, children, className = "" }: {
  label: string; right?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3.5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/20 text-[9px] tracking-[0.2em] uppercase font-light">{label}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

// ─── Project Card ───────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const st = STATUS_STYLES[project.status] ?? STATUS_STYLES["paused"];
  const depts = project.departments ?? [];
  const primaryHex = DEPT_META[depts[0]]?.hex ?? "#6366f1";

  return (
    <div className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.025] hover:border-white/10 transition-all overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(ellipse 80% 70% at 0% 0%, ${primaryHex}0d 0%, transparent 65%)` }} />

      <div className="p-5 flex flex-col gap-3 relative flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {project.client && (
              <p className="text-white/18 text-[10px] tracking-[0.2em] uppercase font-light mb-1 truncate">{project.client}</p>
            )}
            <h3 className="text-white/78 text-sm font-light tracking-wide leading-snug line-clamp-2 group-hover:text-white/92 transition-colors">
              {project.name}
            </h3>
          </div>
          <span className={`shrink-0 flex items-center gap-1.5 text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full border font-light bg-white/[0.03] ${st.label} ${st.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot} ${project.status === "in review" ? "animate-pulse" : ""}`} />
            {project.status}
          </span>
        </div>

        {depts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {depts.map(d => (
              <span key={d} className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-white/50 font-light">
                {DEPT_META[d]?.icon}{d}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-3 mt-auto border-t border-white/[0.04] text-white/20 text-[10px] font-light">
          <span className="flex items-center gap-1"><FileText size={10}/> {project.fileCount}</span>
          <span className="flex items-center gap-1"><Users size={10}/> {project.memberCount}</span>
          <span className="flex items-center gap-1 ml-auto"><Clock size={9}/> {timeAgo(project.updated_at)}</span>
        </div>
      </div>

      {/* Hover actions */}
      <div className="md:absolute md:inset-x-0 md:bottom-0 flex items-center gap-2 px-5 pb-4 md:pt-12
        md:opacity-0 md:group-hover:opacity-100 md:transition-opacity
        md:bg-gradient-to-t md:from-[#0e0e0e] md:via-[#0e0e0e]/90 md:to-transparent">
        <a href={`/project/${project.id}`}
          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-white text-black text-xs font-medium px-4 py-2 rounded-xl hover:bg-white/90 transition-all">
          Open <ArrowUpRight size={12}/>
        </a>
        <a href={`/review/${project.id}`}
          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-white/55 text-xs font-light px-4 py-2 rounded-xl hover:text-white/80 border border-white/8 hover:border-white/16 transition-all">
          <PlayCircle size={12}/> Review
        </a>
      </div>
    </div>
  );
}

// ─── Deadlines (mirror project sidebar) ─────────────────────────────────────────

function Deadlines({ deadlines }: { deadlines: Deadline[] }) {
  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 gap-1.5">
        <CalendarClock size={16} className="text-white/10"/>
        <p className="text-white/18 text-[10px] font-light">No upcoming milestones</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {deadlines.slice(0, 4).map(d => {
        const overdue = d.daysLeft < 0;
        const soon = d.daysLeft >= 0 && d.daysLeft <= 7;
        const label = overdue ? `${Math.abs(d.daysLeft)}d overdue` : d.daysLeft === 0 ? "Due today" : `${d.daysLeft}d left`;
        const color = overdue ? "text-red-400/75" : soon ? "text-amber-400/75" : "text-white/22";
        return (
          <a key={d.id} href={`/project/${d.projectId}`} className="flex items-start gap-2.5 group">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: deptHex(d.department) }}/>
            <div className="flex-1 min-w-0">
              <p className="text-white/55 text-[11px] font-light truncate group-hover:text-white/78 transition-colors">{d.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] font-light ${color}`}>{label}</span>
                <span className="text-white/10 text-[9px]">·</span>
                <span className="text-white/18 text-[9px] font-light truncate">{d.projectName}</span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

// ─── Activity Feed (mirror project sidebar timeline) ────────────────────────────

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 gap-1.5">
        <Activity size={16} className="text-white/10"/>
        <p className="text-white/18 text-[10px] font-light">No activity yet</p>
      </div>
    );
  }
  const shown = items.slice(0, 5);
  return (
    <div className="flex flex-col">
      {shown.map((item, i) => (
        <a key={item.id}
          href={item.type === "comment" ? `/review/${item.projectId}` : `/project/${item.projectId}`}
          className="flex gap-3 group">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              item.type === "comment" ? "bg-violet-400/[0.08] text-violet-400/70" : "bg-blue-400/[0.08] text-blue-400/70"
            }`}>
              {item.type === "comment" ? <MessageSquare size={10}/> : <FileText size={10}/>}
            </div>
            {i < shown.length - 1 && <div className="w-px flex-1 bg-white/[0.04] my-1"/>}
          </div>
          <div className={`flex-1 min-w-0 ${i < shown.length - 1 ? "pb-3" : ""}`}>
            <p className="text-white/55 text-[11px] font-light leading-snug truncate group-hover:text-white/75 transition-colors">{item.text}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-white/18 text-[9px] font-light truncate">{item.projectName}</span>
              <span className="text-white/10 text-[9px]">·</span>
              <span className="text-white/18 text-[9px] font-light">{timeAgo(item.date)}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────

export default function DashboardClient({ user, projects, profile, activity, stats, deadlines }: {
  user: User; projects: Project[]; profile: Profile; activity: ActivityItem[];
  stats: Stats; deadlines: Deadline[];
}) {
  const [filter, setFilter] = useState<StatusTab>("All");
  const [search, setSearch] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);

  // Only MixLabs staff can create projects; clients are invited into existing ones.
  const isStaff = isStaffEmail(user.email);

  // Sidebar "New Project" / mobile FAB deep-link here via /dashboard?new=1.
  // Open the modal (staff only) and strip the param so a refresh doesn't reopen it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      if (isStaff) setShowNewProject(true);
      params.delete("new");
      const qs = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, [isStaff]);

  const displayName = profile?.full_name || user.email?.split("@")[0] || "there";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const filtered = useMemo(() => projects.filter(p => {
    const matchStatus = filter === "All" || p.status.toLowerCase() === filter.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.client?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [projects, filter, search]);

  const statCells = [
    { icon: <FolderOpen size={13}/>, label: "Total",     value: stats.total },
    { icon: <Activity size={13}/>,   label: "Active",    value: stats.active },
    { icon: <Clock size={13}/>,      label: "In Review", value: stats.inReview },
    { icon: <Package size={13}/>,    label: "Delivered", value: stats.delivered },
  ];

  return (
    <div className="flex bg-[#0A0A0A] overflow-hidden" style={{ height: "100dvh" }}>
      <Sidebar active="dashboard" userName={displayName} userInitials={initials} />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ══ Fixed Header ══ */}
        <div className="shrink-0 relative border-b border-white/[0.04]">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 55% 100% at 18% 0%, #6366f10a 0%, transparent 70%)" }} />

          <div className="px-4 md:px-9 pt-4 md:pt-7 pb-5 relative">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-6 mb-5">
              <div className="min-w-0">
                <p className="text-white/18 text-[10px] tracking-[0.3em] uppercase mb-1.5 font-light">{profile?.company || "MixLabs Workspace"}</p>
                <h1 className="text-white/82 text-2xl md:text-[1.7rem] font-light tracking-wide leading-tight">
                  {greeting()}, <span className="text-white/45">{displayName.split(" ")[0]}</span>
                </h1>
                <p className="text-white/22 text-xs font-light mt-1.5">
                  {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
              {isStaff && (
                <button onClick={() => setShowNewProject(true)}
                  className="flex items-center gap-2 bg-white text-black text-xs font-medium px-4 md:px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all shrink-0">
                  <Plus size={13}/> New Project
                </button>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {statCells.map(s => (
                <div key={s.label} className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.025] transition-colors group">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] text-white/25 group-hover:text-white/45 transition-colors shrink-0">{s.icon}</div>
                  <div className="min-w-0">
                    <p className="text-white/18 text-[9px] tracking-[0.18em] uppercase font-light">{s.label}</p>
                    <span className="text-white/72 text-base font-light leading-tight tabular-nums">{s.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ Scrollable Body ══ */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 md:px-9 py-5 md:py-6 pb-28 md:pb-10">

          {/* ── Projects ── */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-white/72 text-sm font-light tracking-wide">Projects</h2>
              <span className="text-white/18 text-[10px] font-light tabular-nums">
                {filtered.length}{search && ` · “${search}”`}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2 focus-within:border-white/16 transition-colors w-44 md:w-64">
              <Search size={12} className="text-white/20 shrink-0"/>
              <input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-[12px] text-white/75 placeholder-white/15 outline-none w-full min-w-0 font-light"/>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1 mb-5 overflow-x-auto scrollbar-hide">
            {STATUS_TABS.map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-light tracking-wide whitespace-nowrap shrink-0 transition-all ${
                  filter === tab ? "bg-white/6 text-white/80" : "text-white/28 hover:text-white/55 hover:bg-white/[0.03]"
                }`}>
                {tab}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-white/[0.05] rounded-2xl">
              {search ? (
                <>
                  <p className="text-white/22 text-sm font-light">No projects match “{search}”</p>
                  <button onClick={() => setSearch("")} className="text-white/30 hover:text-white/60 text-xs font-light transition-colors">Clear search</button>
                </>
              ) : isStaff ? (
                <>
                  <button onClick={() => setShowNewProject(true)}
                    className="w-14 h-14 rounded-2xl border border-white/10 flex items-center justify-center hover:border-white/20 transition-all group">
                    <Plus size={18} className="text-white/20 group-hover:text-white/50 transition-colors"/>
                  </button>
                  <p className="text-white/22 text-sm font-light">Start your first project</p>
                </>
              ) : (
                <p className="text-white/22 text-sm font-light">No projects yet - you&apos;ll see them here once you&apos;re added to one.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {filtered.map(p => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}

          {/* ── Insights ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-6 md:mt-7">
            <Card label="Deadlines" right={<span className="text-white/18 text-[10px] font-light tabular-nums">{deadlines.length} upcoming</span>}>
              <Deadlines deadlines={deadlines} />
            </Card>
            <Card label="Recent Activity">
              <ActivityFeed items={activity} />
            </Card>
          </div>
        </div>
      </div>

      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
    </div>
  );
}
