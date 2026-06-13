"use client";
import { useState, useMemo, useRef } from "react";
import {
  ArrowLeft, Plus, ExternalLink, ChevronDown, ChevronRight,
  Music, Palette, Scissors, Wand2, Zap, Volume2,
  Settings, Users, FileText, Trash2, Check, Link,
  PlayCircle, Calendar, TrendingUp, Activity, Package,
  ShieldCheck, Eye, Pencil, Crown, AlertCircle,
  Clock, FolderOpen, RefreshCw, Dot,
} from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";
import Timeline, { Milestone } from "./Timeline";
import DeliveryTab, { Delivery } from "./Delivery";
import { useTheme } from "@/hooks/useTheme";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["active", "in review", "ready", "paused", "delivered"];
const STATUS_STYLES: Record<string, { dot: string; label: string; border: string }> = {
  "active":    { dot: "bg-emerald-400", label: "text-emerald-400", border: "border-emerald-400/30" },
  "in review": { dot: "bg-amber-400",   label: "text-amber-400",   border: "border-amber-400/30"   },
  "ready":     { dot: "bg-blue-400",    label: "text-blue-400",    border: "border-blue-400/30"    },
  "paused":    { dot: "bg-zinc-500",    label: "text-zinc-400",    border: "border-zinc-600"       },
  "delivered": { dot: "bg-violet-400",  label: "text-violet-400",  border: "border-violet-400/30"  },
};

const DEPT_META: Record<string, { icon: React.ReactNode; accent: string; bg: string; hex: string }> = {
  Sound:     { icon: <Volume2 size={13}/>,  accent: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.05)", hex: "#F59E0B" },
  Score:     { icon: <Music size={13}/>,    accent: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.05)", hex: "#A855F7" },
  Color:     { icon: <Palette size={13}/>,  accent: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.05)", hex: "#EC4899" },
  Edit:      { icon: <Scissors size={13}/>, accent: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.05)", hex: "#3B82F6" },
  Animation: { icon: <Wand2 size={13}/>,    accent: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.05)", hex: "#22C55E" },
  VFX:       { icon: <Zap size={13}/>,      accent: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.05)", hex: "#F97316" },
};

const MEMBER_ROLES = ["viewer", "editor", "admin"];

const VERSION_STATUS_OPTIONS = ["draft", "in review", "approved", "changes"] as const;
type VersionStatus = typeof VERSION_STATUS_OPTIONS[number];
const VERSION_STATUS_META: Record<VersionStatus, { cls: string; label: string; dot: string }> = {
  "draft":     { cls: "text-white/30 bg-white/5 border-white/8",                   label: "Draft",     dot: "bg-white/25"     },
  "in review": { cls: "text-amber-400/80 bg-amber-500/8 border-amber-400/25",       label: "In Review", dot: "bg-amber-400"    },
  "approved":  { cls: "text-emerald-400/80 bg-emerald-500/8 border-emerald-400/25", label: "Approved",  dot: "bg-emerald-400"  },
  "changes":   { cls: "text-rose-400/80 bg-rose-500/8 border-rose-400/25",          label: "Changes",   dot: "bg-rose-400"     },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = { id: string; name: string; client: string | null; status: string; departments: string[]; owner_id?: string };
type Version = { id: string; version_name: string; department: string; drive_url: string | null; status: string; created_at: string };
type Member  = { id: string; role: string | null; user_id?: string; profiles: { id: string; full_name: string | null; email: string | null } | null };
type UserRole = "owner" | "admin" | "editor" | "viewer";

const ROLE_META: Record<UserRole, { icon: React.ReactNode; label: string; color: string; border: string; bg: string; desc: string }> = {
  owner:  { icon: <Crown size={11}/>,       label: "Owner",  color: "text-amber-300",  border: "border-amber-400/25",  bg: "bg-amber-500/8",  desc: "Full control" },
  admin:  { icon: <ShieldCheck size={11}/>, label: "Admin",  color: "text-violet-300", border: "border-violet-400/25", bg: "bg-violet-500/8", desc: "Manage team & settings" },
  editor: { icon: <Pencil size={11}/>,      label: "Editor", color: "text-blue-300",   border: "border-blue-400/25",   bg: "bg-blue-500/8",   desc: "Add files & milestones" },
  viewer: { icon: <Eye size={11}/>,         label: "Viewer", color: "text-white/35",   border: "border-white/10",      bg: "bg-white/3",      desc: "Read-only access" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  const p = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#f97316","#14b8a6"];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return p[h % p.length];
}

function daysFromToday(s: string): number {
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((new Date(s + "T00:00:00").getTime() - now.getTime()) / 86400000);
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400)return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, onChange, disabled }: { status: string; onChange: (s: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_STYLES[status] ?? STATUS_STYLES["active"];
  return (
    <div className="relative">
      <button disabled={disabled} onClick={() => !disabled && setOpen(p => !p)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] tracking-widest uppercase font-medium transition-all ${st.label} ${st.border} bg-white/[0.03] ${disabled ? "cursor-default opacity-60" : "hover:bg-white/[0.06]"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
        {status}
        {!disabled && <ChevronDown size={9} className="opacity-40"/>}
      </button>
      {open && <>
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)}/>
        <div className="absolute right-0 top-9 z-30 w-44 rounded-2xl border border-white/10 bg-[#141414] shadow-2xl py-1.5 overflow-hidden">
          {STATUS_OPTIONS.map(s => {
            const ss = STATUS_STYLES[s];
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[10px] tracking-widest uppercase hover:bg-white/5 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`}/>
                <span className={s === status ? "text-white" : "text-white/40"}>{s}</span>
                {s === status && <Check size={9} className="ml-auto text-white/40"/>}
              </button>
            );
          })}
        </div>
      </>}
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
// Constructed from versions + milestones — no extra API needed.

type ActivityItem = { id: string; type: "file" | "milestone" | "status"; text: string; sub: string; when: string; dept?: string };

function ActivityFeed({ versions, milestones, project }: { versions: Version[]; milestones: Milestone[]; project: Project }) {
  const items: ActivityItem[] = useMemo(() => {
    const list: ActivityItem[] = [];
    for (const v of versions) {
      const m = DEPT_META[v.department];
      list.push({
        id: "v-" + v.id,
        type: "file",
        text: `${v.version_name} added`,
        sub: v.department,
        when: v.created_at,
        dept: v.department,
      });
    }
    for (const m of milestones) {
      list.push({
        id: "m-" + m.id,
        type: "milestone",
        text: m.title,
        sub: `Milestone · ${m.status}`,
        when: m.created_at,
        dept: m.department ?? undefined,
      });
    }
    return list.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()).slice(0, 10);
  }, [versions, milestones]);

  const ICON: Record<string, React.ReactNode> = {
    file:      <FileText size={10}/>,
    milestone: <Calendar size={10}/>,
    status:    <Activity size={10}/>,
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 gap-1.5">
        <Activity size={18} className="text-white/10"/>
        <p className="text-white/18 text-[10px] font-light">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const dMeta = item.dept ? DEPT_META[item.dept] : null;
        return (
          <div key={item.id} className="flex gap-3 group">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-white/[0.04] text-white/25 group-hover:text-white/50 transition-colors"
                style={dMeta ? { background: dMeta.hex + "15", color: dMeta.hex + "90" } : {}}>
                {ICON[item.type]}
              </div>
              {i < items.length - 1 && <div className="w-px flex-1 bg-white/[0.04] my-1"/>}
            </div>
            {/* Content */}
            <div className={`flex-1 min-w-0 ${i < items.length - 1 ? "pb-3.5" : ""}`}>
              <p className="text-white/55 text-[11px] font-light leading-snug truncate">{item.text}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-white/18 text-[9px] font-light">{item.sub}</span>
                <span className="text-white/10 text-[9px]">·</span>
                <span className="text-white/18 text-[9px] font-light">{timeAgo(item.when)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

function ProjectSidebar({ project, versions, members, milestones, userRole }: {
  project: Project; versions: Version[]; members: Member[]; milestones: Milestone[]; userRole: UserRole;
}) {
  const roleMeta = ROLE_META[userRole];
  const completed = milestones.filter(m => m.status === "completed").length;
  const pct = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

  const upcoming = useMemo(() =>
    milestones.filter(m => m.status !== "completed")
      .sort((a, b) => a.end_date.localeCompare(b.end_date))
      .slice(0, 4),
  [milestones]);

  const DEPT_DOT: Record<string, string> = {
    Sound:"bg-amber-400", Score:"bg-violet-400", Color:"bg-pink-400",
    Edit:"bg-blue-400", Animation:"bg-emerald-400", VFX:"bg-orange-400",
  };

  return (
    <div className="w-64 shrink-0 border-l border-white/[0.04] overflow-y-auto scrollbar-hide">
      <div className="px-5 py-6 flex flex-col gap-5">

        {/* ── Your Role ── */}
        <div className={`rounded-2xl border ${roleMeta.border} ${roleMeta.bg} p-4`}>
          <p className="text-white/20 text-[9px] tracking-[0.2em] uppercase font-light mb-3">Your Access</p>
          <div className="flex items-center gap-2 mb-3">
            <span className={roleMeta.color}>{roleMeta.icon}</span>
            <span className={`text-sm font-light ${roleMeta.color}`}>{roleMeta.label}</span>
            <span className="text-white/18 text-[10px] font-light ml-auto">{roleMeta.desc}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { label: "View files & timeline",  ok: true },
              { label: "Add files & milestones", ok: userRole !== "viewer" },
              { label: "Edit settings",          ok: userRole === "owner" || userRole === "admin" },
              { label: "Manage team",            ok: userRole === "owner" || userRole === "admin" },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${p.ok ? "bg-emerald-500/15" : "bg-white/4"}`}>
                  {p.ok ? <Check size={7} className="text-emerald-400"/> : <span className="w-1 h-px bg-white/15 rounded"/>}
                </span>
                <span className={`text-[10px] font-light ${p.ok ? "text-white/40" : "text-white/16"}`}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Project Health ── */}
        {milestones.length > 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
            <p className="text-white/20 text-[9px] tracking-[0.2em] uppercase font-light mb-3">Health</p>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-white/70 text-2xl font-light tabular-nums">{pct}<span className="text-sm text-white/25">%</span></span>
              <span className="text-white/20 text-[10px] font-light">{completed}/{milestones.length}</span>
            </div>
            {/* Segmented bar */}
            <div className="flex gap-0.5 mb-3">
              {milestones.slice(0, 20).map(m => (
                <div key={m.id} className={`h-1 flex-1 rounded-full ${
                  m.status === "completed" ? "bg-emerald-400/60" :
                  m.status === "active"    ? "bg-amber-400/50" : "bg-white/8"
                }`}/>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap">
              {(["planned","active","completed"] as const).map(s => {
                const cnt = milestones.filter(m => m.status === s).length;
                if (!cnt) return null;
                const dot = s === "completed" ? "bg-emerald-400/60" : s === "active" ? "bg-amber-400/60" : "bg-white/20";
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`}/>
                    <span className="text-white/22 text-[9px] font-light capitalize">{cnt} {s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Upcoming Deadlines ── */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
          <p className="text-white/20 text-[9px] tracking-[0.2em] uppercase font-light mb-3">Deadlines</p>
          {upcoming.length === 0 ? (
            <p className="text-white/16 text-[10px] font-light">No upcoming milestones</p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map(m => {
                const days = daysFromToday(m.end_date);
                const overdue = days < 0;
                const soon    = days >= 0 && days <= 7;
                return (
                  <div key={m.id} className="flex items-start gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${m.department ? (DEPT_DOT[m.department] ?? "bg-white/25") : "bg-white/25"}`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/55 text-[11px] font-light truncate">{m.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-light ${overdue ? "text-red-400/75" : soon ? "text-amber-400/75" : "text-white/22"}`}>
                          {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
                        </span>
                        <span className="text-white/10">·</span>
                        <span className="text-white/18 text-[9px] font-light">
                          {new Date(m.end_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Activity Feed ── */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
          <p className="text-white/20 text-[9px] tracking-[0.2em] uppercase font-light mb-4">Activity</p>
          <ActivityFeed versions={versions} milestones={milestones} project={project}/>
        </div>

        {/* ── Team quick view ── */}
        {members.length > 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
            <p className="text-white/20 text-[9px] tracking-[0.2em] uppercase font-light mb-3">Team</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {members.slice(0, 8).map(m => {
                const name = m.profiles?.full_name || m.profiles?.email || "?";
                const col = avatarColor(name);
                return (
                  <div key={m.id} title={name}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium cursor-default"
                    style={{ background: col + "25", border: `1px solid ${col}30`, color: col }}>
                    {name[0].toUpperCase()}
                  </div>
                );
              })}
              {members.length > 8 && (
                <span className="text-white/20 text-[10px] font-light">+{members.length - 8}</span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Files Tab ────────────────────────────────────────────────────────────────

function FilesTab({ project, versions, canEdit }: { project: Project; versions: Version[]; canEdit: boolean }) {
  const depts = project.departments ?? [];
  const [activeDept, setActiveDept]   = useState(depts[0] ?? "");
  const [addingFile, setAddingFile]   = useState(false);
  const [title, setTitle]             = useState("");
  const [url, setUrl]                 = useState("");
  const [loading, setLoading]         = useState(false);
  const [addError, setAddError]       = useState("");
  const [localFiles, setLocalFiles]   = useState<Version[]>(versions);
  const [updatingId, setUpdatingId]   = useState<string | null>(null);
  const [statusMenu, setStatusMenu]   = useState<string | null>(null);

  const meta  = DEPT_META[activeDept] ?? { icon: null, accent: "#6B7280", bg: "transparent", hex: "#6B7280" };
  const files = localFiles.filter(v => v.department === activeDept);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true); setAddError("");
    const res = await fetch(`/api/projects/${project.id}/versions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), department: activeDept, drive_url: url.trim() || null }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error || "Failed"); setLoading(false); return; }
    setLocalFiles(prev => [{
      id: data.id, version_name: data.version_name ?? title.trim(),
      department: data.department ?? activeDept, drive_url: data.drive_url ?? null,
      status: data.status ?? "draft", created_at: data.created_at ?? new Date().toISOString(),
    }, ...prev]);
    setTitle(""); setUrl(""); setAddError(""); setLoading(false); setAddingFile(false);
  }

  async function handleStatusChange(fileId: string, newStatus: string) {
    setUpdatingId(fileId); setStatusMenu(null);
    setLocalFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: newStatus } : f));
    await fetch(`/api/projects/${project.id}/versions/${fileId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUpdatingId(null);
  }

  if (depts.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <FolderOpen size={28} className="text-white/10"/>
      <p className="text-white/20 text-sm font-light">No departments assigned</p>
    </div>
  );

  return (
    <div className="flex gap-6 h-full">
      {/* Dept nav */}
      <div className="w-40 shrink-0 flex flex-col gap-0.5 pt-0.5">
        <p className="text-white/16 text-[9px] tracking-[0.25em] uppercase px-3 mb-2.5 font-light">Departments</p>
        {depts.map(dept => {
          const m = DEPT_META[dept] ?? { icon: null, accent: "#6B7280", bg: "transparent", hex: "#6B7280" };
          const count = localFiles.filter(v => v.department === dept).length;
          const active = activeDept === dept;
          return (
            <div key={dept} className="relative group/row">
              <button onClick={() => { setActiveDept(dept); setAddingFile(false); setStatusMenu(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${active ? "bg-white/6" : "hover:bg-white/3"}`}>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{ background: active ? m.bg : "transparent", color: active ? m.accent : "rgba(255,255,255,0.2)" }}>
                    {m.icon}
                  </span>
                  <span className={`text-[12px] font-light transition-colors ${active ? "text-white/80" : "text-white/28 group-hover/row:text-white/50"}`}>{dept}</span>
                </div>
                <span className={`text-[9px] tabular-nums px-1 rounded ${active ? "text-white/35" : "text-white/16"}`}>{count}</span>
              </button>
            </div>
          );
        })}
        <div className="mt-auto pt-3 border-t border-white/[0.04] px-3">
          <p className="text-white/15 text-[9px] font-light">{localFiles.length} total</p>
        </div>
      </div>

      <div className="w-px bg-white/[0.04] self-stretch"/>

      {/* File content */}
      <div className="flex-1 min-w-0 flex flex-col" onClick={() => setStatusMenu(null)}>
        {/* Dept header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: meta.bg, color: meta.accent }}>{meta.icon}</span>
            <div>
              <h3 className="text-white/72 text-sm font-light">{activeDept}</h3>
              <p className="text-white/18 text-[10px] font-light">{files.length} {files.length === 1 ? "file" : "files"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <a href={`/review/${project.id}?dept=${activeDept}`}
                className="flex items-center gap-1.5 text-[10px] text-white/28 hover:text-white/60 border border-white/7 hover:border-white/16 px-3 py-1.5 rounded-lg transition-all font-light">
                <PlayCircle size={11}/> Review
              </a>
            )}
            {canEdit && (
              <button onClick={(e) => { e.stopPropagation(); setAddingFile(p => !p); }}
                className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 border border-white/10 hover:border-white/22 px-3 py-1.5 rounded-lg transition-all font-light">
                <Plus size={11}/> Add file
              </button>
            )}
          </div>
        </div>

        {/* Add form */}
        {addingFile && canEdit && (
          <form onSubmit={handleAdd} onClick={e => e.stopPropagation()}
            className="mb-4 p-4 rounded-2xl border border-white/8 bg-white/[0.02] flex flex-col gap-3 shrink-0">
            <input autoFocus placeholder="File name — e.g. Score v2 Final Mix"
              value={title} onChange={e => setTitle(e.target.value)} required
              className="bg-transparent border-b border-white/8 pb-2 text-sm text-white/75 placeholder-white/15 outline-none focus:border-white/18 transition-colors w-full font-light"/>
            <div className="flex items-center gap-2 border-b border-white/8 pb-2">
              <Link size={10} className="text-white/16 shrink-0"/>
              <input placeholder="Google Drive link (optional)" value={url} onChange={e => setUrl(e.target.value)}
                className="bg-transparent text-sm text-white/65 placeholder-white/14 outline-none w-full font-light"/>
            </div>
            {addError && <p className="text-red-400/70 text-xs font-light">{addError}</p>}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading || !title.trim()}
                className="bg-white text-black text-xs font-medium px-4 py-2 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
                {loading ? "Adding…" : "Add"}
              </button>
              <button type="button" onClick={() => { setAddingFile(false); setAddError(""); }}
                className="text-white/22 hover:text-white/50 text-xs font-light transition-colors">Cancel</button>
            </div>
          </form>
        )}

        {/* File list */}
        {files.length === 0 && !addingFile ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 border border-dashed border-white/[0.05] rounded-2xl">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: meta.bg }}>
              <span style={{ color: meta.accent }}>{meta.icon}</span>
            </div>
            <div className="text-center">
              <p className="text-white/28 text-sm font-light">No {activeDept} files yet</p>
              {canEdit && <p className="text-white/14 text-xs font-light mt-0.5">Add your first file above</p>}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {/* Header row */}
            <div className="grid items-center px-3 pb-2.5 border-b border-white/[0.04]"
              style={{ gridTemplateColumns: "1fr 110px 70px 32px" }}>
              {["File","Status","Added",""].map(h => (
                <span key={h} className="text-[9px] tracking-[0.2em] uppercase text-white/15 font-light">{h}</span>
              ))}
            </div>
            {files.map((f, i) => {
              const vs = VERSION_STATUS_META[f.status as VersionStatus] ?? VERSION_STATUS_META["draft"];
              return (
                <div key={f.id}
                  className={`grid items-center px-3 py-3.5 group hover:bg-white/[0.02] rounded-xl transition-colors ${i < files.length - 1 ? "border-b border-white/[0.03]" : ""}`}
                  style={{ gridTemplateColumns: "1fr 110px 70px 32px" }}>
                  {/* File name */}
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-0.5 h-5 rounded-full shrink-0 transition-opacity" style={{ background: meta.hex + "55" }}/>
                    <p className="text-white/62 text-[13px] truncate font-light">{f.version_name}</p>
                  </div>

                  {/* Status — clickable dropdown for editors+ */}
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    {canEdit ? (
                      <>
                        <button onClick={() => setStatusMenu(statusMenu === f.id ? null : f.id)}
                          className={`flex items-center gap-1.5 text-[9px] tracking-wide px-2 py-1 rounded-full border font-light w-fit hover:brightness-110 transition-all ${vs.cls} ${updatingId === f.id ? "opacity-50" : ""}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${vs.dot}`}/>
                          {vs.label}
                          <ChevronDown size={8} className="opacity-50"/>
                        </button>
                        {statusMenu === f.id && (
                          <div className="absolute top-7 left-0 z-30 w-36 rounded-xl border border-white/10 bg-[#141414] shadow-2xl py-1 overflow-hidden">
                            {VERSION_STATUS_OPTIONS.map(s => {
                              const sm = VERSION_STATUS_META[s];
                              return (
                                <button key={s} onClick={() => handleStatusChange(f.id, s)}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors">
                                  <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`}/>
                                  <span className={`text-[10px] font-light ${s === f.status ? "text-white/70" : "text-white/35"}`}>{sm.label}</span>
                                  {s === f.status && <Check size={8} className="ml-auto text-white/35"/>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className={`flex items-center gap-1.5 text-[9px] tracking-wide px-2 py-1 rounded-full border font-light w-fit ${vs.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${vs.dot}`}/>
                        {vs.label}
                      </span>
                    )}
                  </div>

                  <span className="text-white/20 text-[11px] font-light">
                    {new Date(f.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <div className="flex justify-end">
                    {f.drive_url
                      ? <a href={f.drive_url} target="_blank" rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 transition-all"><ExternalLink size={12}/></a>
                      : <span/>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab({ project, members, canManage }: { project: Project; members: Member[]; canManage: boolean }) {
  const [localMembers, setLocalMembers] = useState<Member[]>(members);
  const [email, setEmail] = useState("");
  const [role, setRole]   = useState("viewer");
  const [adding, setAdding]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const roleColors: Record<string, string> = {
    owner:  "text-amber-300/75 border-amber-400/20 bg-amber-500/6",
    admin:  "text-violet-300/75 border-violet-400/20 bg-violet-500/6",
    editor: "text-blue-300/75 border-blue-400/20 bg-blue-500/6",
    viewer: "text-white/25 border-white/8 bg-white/3",
  };

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Failed");
    else { if (data.member) setLocalMembers(p => [...p, data.member]); setEmail(""); setAdding(false); }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <p className="text-white/55 text-sm font-light">{localMembers.length} {localMembers.length === 1 ? "member" : "members"}</p>
          <p className="text-white/18 text-xs font-light mt-0.5">Role-based access control</p>
        </div>
        {canManage && (
          <button onClick={() => setAdding(p => !p)}
            className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 border border-white/10 hover:border-white/22 px-3.5 py-2 rounded-xl transition-all font-light">
            <Plus size={11}/> Invite
          </button>
        )}
      </div>

      {/* Role reference */}
      <div className="grid grid-cols-3 gap-2 mb-5 shrink-0">
        {(["admin","editor","viewer"] as const).map(r => {
          const rm = ROLE_META[r];
          return (
            <div key={r} className={`flex items-start gap-2 p-3 rounded-xl border ${rm.border} ${rm.bg}`}>
              <span className={`mt-0.5 shrink-0 ${rm.color}`}>{rm.icon}</span>
              <div>
                <p className={`text-[10px] font-light ${rm.color}`}>{rm.label}</p>
                <p className="text-white/18 text-[9px] font-light leading-snug mt-0.5">{rm.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {adding && canManage && (
        <form onSubmit={handleInvite} className="mb-4 p-4 rounded-2xl border border-white/8 bg-white/[0.02] flex flex-col gap-3 shrink-0">
          <input autoFocus type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
            className="bg-transparent border-b border-white/8 pb-2 text-sm text-white/75 placeholder-white/15 outline-none focus:border-white/18 w-full font-light"/>
          <div className="flex gap-2">
            {MEMBER_ROLES.map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-xl text-xs capitalize transition-all border font-light ${role === r ? "bg-white text-black border-white" : "border-white/8 text-white/28 hover:border-white/16"}`}>
                {r}
              </button>
            ))}
          </div>
          {error && <p className="text-red-400/70 text-xs font-light flex items-center gap-1.5"><AlertCircle size={11}/>{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading || !email.trim()}
              className="bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
              {loading ? "Adding…" : "Send invite"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-white/22 hover:text-white/50 text-xs font-light transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {localMembers.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 border border-dashed border-white/[0.05] rounded-2xl">
            <Users size={22} className="text-white/10"/>
            <p className="text-white/18 text-sm font-light">No team members yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {localMembers.map(m => {
              const name = m.profiles?.full_name || m.profiles?.email || "Unknown";
              const col  = avatarColor(name);
              const r    = (m.role ?? "viewer") as keyof typeof roleColors;
              return (
                <div key={m.id} className="flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
                      style={{ background: col + "20", border: `1px solid ${col}28`, color: col }}>
                      {name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white/65 text-[13px] font-light">{name}</p>
                      {m.profiles?.full_name && <p className="text-white/18 text-[10px] font-light">{m.profiles.email}</p>}
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 text-[9px] tracking-wide uppercase border px-2.5 py-1 rounded-full font-light ${roleColors[r] ?? roleColors["viewer"]}`}>
                    {ROLE_META[r as UserRole]?.icon}
                    {r}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const ALL_DEPARTMENTS = ["Sound", "Score", "Color", "Edit", "Animation", "VFX"] as const;

function SettingsTab({ project, onProjectUpdate, canManage }: {
  project: Project; onProjectUpdate: (p: Partial<Project>) => void; canManage: boolean;
}) {
  const [name,   setName]   = useState(project.name);
  const [client, setClient] = useState(project.client || "");
  const [depts,  setDepts]  = useState<string[]>(project.departments ?? []);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [savingDepts,   setSavingDepts]   = useState(false);
  const [savedDepts,    setSavedDepts]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [section,       setSection]       = useState<"general"|"departments"|"danger">("general");

  if (!canManage) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <Eye size={28} className="text-white/10"/>
      <p className="text-white/22 text-sm font-light">Settings restricted to admins & owners</p>
    </div>
  );

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), client: client.trim() || null }),
    });
    if (res.ok) {
      onProjectUpdate({ name: name.trim(), client: client.trim() || null });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  function toggleDept(dept: string) {
    setDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  }

  async function handleSaveDepts() {
    if (depts.length === 0) return;
    setSavingDepts(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departments: depts }),
    });
    if (res.ok) {
      onProjectUpdate({ departments: depts });
      setSavedDepts(true); setTimeout(() => setSavedDepts(false), 2000);
    }
    setSavingDepts(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    window.location.href = "/dashboard";
  }

  const deptsChanged = JSON.stringify(depts.slice().sort()) !== JSON.stringify((project.departments ?? []).slice().sort());

  const NAV = [
    { id: "general",     label: "General",     icon: <Settings size={12}/> },
    { id: "departments", label: "Departments",  icon: <FolderOpen size={12}/> },
    { id: "danger",      label: "Danger Zone",  icon: <Trash2 size={12}/> },
  ] as const;

  return (
    <div className="flex gap-8 h-full">

      {/* Left nav */}
      <div className="w-44 shrink-0 flex flex-col gap-0.5 pt-0.5">
        <p className="text-white/16 text-[9px] tracking-[0.25em] uppercase px-3 mb-3 font-light">Settings</p>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setSection(n.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-[12px] font-light ${
              section === n.id
                ? n.id === "danger" ? "bg-red-500/8 text-red-400/80" : "bg-white/6 text-white/80"
                : n.id === "danger" ? "text-red-400/40 hover:text-red-400/65 hover:bg-red-500/5" : "text-white/28 hover:bg-white/3 hover:text-white/55"
            }`}>
            <span className="opacity-70">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </div>

      <div className="w-px bg-white/[0.04] self-stretch"/>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-sm overflow-y-auto scrollbar-hide">

        {/* ── General ── */}
        {section === "general" && (
          <div>
            <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-6 font-light">General</p>
            <form onSubmit={handleSaveGeneral} className="flex flex-col gap-5">
              <div>
                <label className="text-white/28 text-xs mb-2 block font-light">Project name</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3.5 text-sm text-white/78 outline-none focus:border-white/16 transition-colors font-light"/>
              </div>
              <div>
                <label className="text-white/28 text-xs mb-2 block font-light">Client name</label>
                <input value={client} onChange={e => setClient(e.target.value)} placeholder="Optional"
                  className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3.5 text-sm text-white/78 placeholder-white/14 outline-none focus:border-white/16 transition-colors font-light"/>
                <p className="text-white/16 text-[10px] font-light mt-1.5">Shown on the project header and breadcrumb</p>
              </div>
              <div className="pt-1">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
                  {saved ? <><Check size={11}/> Saved</> : saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Departments ── */}
        {section === "departments" && (
          <div>
            <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-1.5 font-light">Departments</p>
            <p className="text-white/22 text-xs font-light mb-6">Select which departments are active on this project. Departments control which file categories and review rooms exist.</p>

            <div className="flex flex-col gap-2 mb-6">
              {ALL_DEPARTMENTS.map(dept => {
                const m = DEPT_META[dept];
                const active = depts.includes(dept);
                const hasFiles = false; // could check versions prop if passed
                return (
                  <button key={dept} type="button" onClick={() => toggleDept(dept)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all text-left group ${
                      active
                        ? "border-white/12 bg-white/[0.03]"
                        : "border-white/[0.05] bg-transparent hover:bg-white/[0.02] hover:border-white/8"
                    }`}
                    style={active ? { borderColor: m.hex + "35", background: m.hex + "08" } : {}}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all`}
                        style={active ? { background: m.bg, color: m.accent } : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.22)" }}>
                        {m.icon}
                      </span>
                      <div>
                        <p className={`text-sm font-light transition-colors ${active ? "text-white/80" : "text-white/30 group-hover:text-white/50"}`}>{dept}</p>
                        <p className="text-white/16 text-[10px] font-light mt-0.5">
                          {dept === "Sound"     && "Sound design, SFX, foley, mixing"}
                          {dept === "Score"     && "Original music composition"}
                          {dept === "Color"     && "Color grading & correction"}
                          {dept === "Edit"      && "Video editing & assembly"}
                          {dept === "Animation" && "Motion graphics & animation"}
                          {dept === "VFX"       && "Visual effects & compositing"}
                        </p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      active ? "border-transparent" : "border-white/12"
                    }`}
                      style={active ? { background: m.hex, boxShadow: `0 0 8px ${m.hex}40` } : {}}>
                      {active && <Check size={10} className="text-black"/>}
                    </div>
                  </button>
                );
              })}
            </div>

            {depts.length === 0 && (
              <p className="text-amber-400/60 text-xs font-light flex items-center gap-1.5 mb-4">
                <AlertCircle size={11}/> At least one department is required
              </p>
            )}

            <div className="flex items-center gap-3">
              <button onClick={handleSaveDepts} disabled={savingDepts || depts.length === 0 || !deptsChanged}
                className="flex items-center gap-2 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
                {savedDepts ? <><Check size={11}/> Saved</> : savingDepts ? "Saving…" : "Save departments"}
              </button>
              {deptsChanged && (
                <button onClick={() => setDepts(project.departments ?? [])}
                  className="text-white/22 hover:text-white/50 text-xs font-light transition-colors">
                  Discard changes
                </button>
              )}
            </div>

            <div className="mt-6 p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.015]">
              <p className="text-white/22 text-[10px] font-light leading-relaxed">
                Removing a department doesn't delete existing files — it just hides that department from the Files and Review tabs. You can re-add it anytime to restore access.
              </p>
            </div>
          </div>
        )}

        {/* ── Danger Zone ── */}
        {section === "danger" && (
          <div>
            <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-6 font-light">Danger Zone</p>
            <div className="flex flex-col gap-4">

              {/* Archive (placeholder, non-destructive) */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-white/[0.06] bg-white/[0.015]">
                <div>
                  <p className="text-white/58 text-sm font-light">Archive project</p>
                  <p className="text-white/18 text-xs mt-0.5 font-light">Hide from dashboard without deleting</p>
                </div>
                <button disabled className="flex items-center gap-1.5 text-white/22 border border-white/8 px-3.5 py-2 rounded-xl text-xs font-light opacity-40 cursor-not-allowed">
                  Archive
                </button>
              </div>

              {/* Transfer ownership (placeholder) */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-white/[0.06] bg-white/[0.015]">
                <div>
                  <p className="text-white/58 text-sm font-light">Transfer ownership</p>
                  <p className="text-white/18 text-xs mt-0.5 font-light">Assign a new owner to this project</p>
                </div>
                <button disabled className="flex items-center gap-1.5 text-white/22 border border-white/8 px-3.5 py-2 rounded-xl text-xs font-light opacity-40 cursor-not-allowed">
                  Transfer
                </button>
              </div>

              {/* Delete */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-red-500/12 bg-red-500/[0.02]">
                <div>
                  <p className="text-white/58 text-sm font-light">Delete project</p>
                  <p className="text-white/18 text-xs mt-0.5 font-light">Permanently removes all files, milestones, and deliveries</p>
                </div>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-1.5 text-red-400/65 hover:text-red-400 border border-red-500/15 hover:border-red-500/35 px-3.5 py-2 rounded-xl text-xs transition-all disabled:opacity-30 font-light">
                  <Trash2 size={11}/> {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "files" | "timeline" | "delivery" | "team" | "settings";

export default function ProjectClient({ project: initialProject, versions, members, milestones, deliveries: initialDeliveries, currentUserId }: {
  project: Project; versions: Version[]; members: Member[]; milestones: Milestone[]; deliveries: Delivery[]; currentUserId: string;
}) {
  const [project, setProject] = useState(initialProject);
  const [status, setStatus]   = useState(initialProject.status);
  const [activeTab, setActiveTab] = useState<Tab>("files");
  const [deliveries] = useState<Delivery[]>(initialDeliveries);

  const { theme } = useTheme();
  const isLight = theme === "light";
  const tagColor  = isLight ? "rgba(0,0,0,0.60)"  : "rgba(255,255,255,0.50)";
  const tagBorder = isLight ? "rgba(0,0,0,0.14)"  : "rgba(255,255,255,0.10)";
  const tagBg     = isLight ? "rgba(0,0,0,0.05)"  : "rgba(255,255,255,0.05)";

  const currentMember = members.find(m => (m as any).user_id === currentUserId || m.profiles?.id === currentUserId);
  const currentName = currentMember?.profiles?.full_name || currentMember?.profiles?.email || "";
  const currentInitials = currentName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  const userRole = useMemo<UserRole>(() => {
    if (project.owner_id === currentUserId) return "owner";
    const me = members.find(m => (m as any).user_id === currentUserId || m.profiles?.id === currentUserId);
    const r = me?.role ?? "viewer";
    if (r === "admin")  return "admin";
    if (r === "editor") return "editor";
    return "viewer";
  }, [project.owner_id, currentUserId, members]);

  const canEdit   = userRole !== "viewer";
  const canManage = userRole === "owner" || userRole === "admin";

  async function updateStatus(s: string) {
    setStatus(s);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number; accent?: string }[] = [
    { id: "files",    label: "Files",    icon: <FileText size={12}/>, count: versions.length },
    { id: "timeline", label: "Timeline", icon: <Calendar size={12}/>, count: milestones.length },
    { id: "delivery", label: "Delivery", icon: <Package size={12}/>,  count: deliveries.length, accent: deliveries.some(d=>d.status==="confirmed") ? "#10b981" : deliveries.some(d=>d.status==="sent") ? "#f59e0b" : undefined },
    { id: "team",     label: "Team",     icon: <Users size={12}/>,    count: members.length },
    { id: "settings", label: "Settings", icon: <Settings size={12}/> },
  ];

  const primaryHex = DEPT_META[project.departments[0]]?.hex ?? "#ffffff";
  const isTimeline = activeTab === "timeline";
  const isFullWidth = activeTab === "timeline";

  return (
    <div className="flex bg-[#0A0A0A] overflow-hidden" style={{ height: '100dvh' }}>
      <Sidebar active="project" userName={currentName} userInitials={currentInitials} />

      {/* ── Main area: fixed header + scrollable body ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ══ Fixed Header ══ */}
        <div className="shrink-0 relative border-b border-white/[0.04]">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 60% 100% at 20% 0%, ${primaryHex}06 0%, transparent 70%)` }}/>

          <div className="px-9 pt-7 pb-0 relative">
            {/* Breadcrumb */}
            <a href="/dashboard"
              className="inline-flex items-center gap-1.5 text-white/16 hover:text-white/45 text-[9px] tracking-[0.28em] uppercase transition-colors mb-5 font-light group">
              <ArrowLeft size={9} className="group-hover:-translate-x-0.5 transition-transform"/>
              Dashboard
              <ChevronRight size={8} className="text-white/10 mx-0.5"/>
              <span className="text-white/28">{project.client || project.name}</span>
            </a>

            {/* Title + actions */}
            <div className="flex items-start justify-between gap-6 mb-5">
              <div className="flex-1 min-w-0">
                {project.client && <p className="text-white/18 text-[10px] tracking-[0.3em] uppercase mb-1 font-light">{project.client}</p>}
                <h1 className="text-white/82 text-2xl font-light tracking-wide truncate">{project.name}</h1>
                {project.departments.length > 0 && (
                  <div className="flex gap-1.5 mt-2.5 flex-wrap">
                    {project.departments.map(d => {
                      const m = DEPT_META[d];
                      return (
                        <span key={d} className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full border font-light"
                          style={{ color: tagColor, borderColor: tagBorder, background: tagBg }}>
                          {m?.icon}{d}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
                <a href={`/review/${project.id}`}
                  className="flex items-center gap-2 text-[10px] text-white/32 hover:text-white/62 border border-white/7 hover:border-white/16 px-3.5 py-2 rounded-xl transition-all font-light">
                  <PlayCircle size={12}/> Review Room
                </a>
                <StatusBadge status={status} onChange={updateStatus} disabled={!canManage}/>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { icon: <FileText size={13}/>,   label: "Files",       value: versions.length,   sub: `${project.departments.length} dept${project.departments.length !== 1?"s":""}` },
                { icon: <Activity size={13}/>,    label: "Milestones",  value: milestones.length > 0 ? `${milestones.filter(m=>m.status==="completed").length}/${milestones.length}` : "—", sub: "done" },
                { icon: <Users size={13}/>,       label: "Team",        value: members.length,    sub: members.length === 1 ? "member" : "members" },
                { icon: <TrendingUp size={13}/>,  label: "Progress",    value: milestones.length > 0 ? `${Math.round(milestones.filter(m=>m.status==="completed").length/milestones.length*100)}%` : "—", sub: "" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.025] transition-colors group">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] text-white/25 group-hover:text-white/45 transition-colors shrink-0">{s.icon}</div>
                  <div className="min-w-0">
                    <p className="text-white/18 text-[9px] tracking-[0.18em] uppercase font-light">{s.label}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-white/72 text-base font-light leading-tight tabular-nums">{s.value}</span>
                      {s.sub && <span className="text-white/20 text-[9px] font-light">{s.sub}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-0">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] tracking-wide transition-all relative -mb-px border-b-2 font-light ${
                    activeTab === tab.id ? "text-white/80 border-white/45" : "text-white/24 border-transparent hover:text-white/48"
                  }`}>
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/10 text-white/50" : "bg-white/5 text-white/20"}`}>
                      {tab.count}
                    </span>
                  )}
                  {tab.accent && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tab.accent }}/>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ Scrollable Body ══ */}
        {isTimeline ? (
          <div className="flex-1 overflow-hidden px-9 py-6">
            <Timeline project={project} initialMilestones={milestones}/>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left — main tab content, scrolls independently */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-9 py-6">
              {activeTab === "files"    && <FilesTab project={project} versions={versions} canEdit={canEdit}/>}
              {activeTab === "delivery" && <DeliveryTab project={project} initialDeliveries={deliveries} canEdit={canEdit}/>}
              {activeTab === "team"     && <TeamTab project={project} members={members} canManage={canManage}/>}
              {activeTab === "settings" && <SettingsTab project={project} onProjectUpdate={p => setProject(prev => ({...prev,...p}))} canManage={canManage}/>}
            </div>

            {/* Right — sidebar, scrolls independently */}
            <ProjectSidebar
              project={project}
              versions={versions}
              members={members}
              milestones={milestones}
              userRole={userRole}
            />
          </div>
        )}

      </div>
    </div>
  );
}
