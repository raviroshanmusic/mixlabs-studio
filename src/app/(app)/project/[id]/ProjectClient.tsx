"use client";
import { useState, useMemo } from "react";
import {
  ArrowLeft, Plus, ExternalLink, ChevronDown,
  Music, Palette, Scissors, Wand2, Zap, Volume2,
  Settings, Users, FileText, Trash2, Check, Link,
  PlayCircle, Calendar, Clock, TrendingUp, Activity,
  ShieldCheck, Eye, Pencil, Crown, ChevronRight,
  AlertCircle, Folder, FolderOpen,
} from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";
import Timeline, { Milestone } from "./Timeline";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["active", "in review", "ready", "paused", "delivered"];
const STATUS_STYLES: Record<string, { dot: string; label: string; border: string }> = {
  "active":    { dot: "bg-emerald-400", label: "text-emerald-400", border: "border-emerald-400/30" },
  "in review": { dot: "bg-amber-400",   label: "text-amber-400",   border: "border-amber-400/30"   },
  "ready":     { dot: "bg-blue-400",    label: "text-blue-400",    border: "border-blue-400/30"    },
  "paused":    { dot: "bg-zinc-500",    label: "text-zinc-400",    border: "border-zinc-600"       },
  "delivered": { dot: "bg-violet-400",  label: "text-violet-400",  border: "border-violet-400/30"  },
};

const DEPT_META: Record<string, { icon: React.ReactNode; accent: string; bg: string; hex: string }> = {
  Sound:     { icon: <Volume2 size={13}/>,  accent: "#F59E0B", bg: "rgba(245,158,11,0.08)",  hex: "#F59E0B" },
  Score:     { icon: <Music size={13}/>,    accent: "#A855F7", bg: "rgba(168,85,247,0.08)",  hex: "#A855F7" },
  Color:     { icon: <Palette size={13}/>,  accent: "#EC4899", bg: "rgba(236,72,153,0.08)",  hex: "#EC4899" },
  Edit:      { icon: <Scissors size={13}/>, accent: "#3B82F6", bg: "rgba(59,130,246,0.08)",  hex: "#3B82F6" },
  Animation: { icon: <Wand2 size={13}/>,    accent: "#22C55E", bg: "rgba(34,197,94,0.08)",   hex: "#22C55E" },
  VFX:       { icon: <Zap size={13}/>,      accent: "#F97316", bg: "rgba(249,115,22,0.08)",  hex: "#F97316" },
};

const MEMBER_ROLES = ["viewer", "editor", "admin"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = {
  id: string; name: string; client: string | null;
  status: string; departments: string[]; owner_id?: string;
};
type Version = {
  id: string; version_name: string; department: string;
  drive_url: string | null; status: string; created_at: string;
};
type Member = {
  id: string; role: string | null; user_id?: string;
  profiles: { id: string; full_name: string | null; email: string | null } | null;
};
type UserRole = "owner" | "admin" | "editor" | "viewer";

// ─── Role config ─────────────────────────────────────────────────────────────

const ROLE_META: Record<UserRole, { icon: React.ReactNode; label: string; color: string; border: string; bg: string; desc: string }> = {
  owner:  { icon: <Crown size={11}/>,      label: "Owner",  color: "text-amber-300",   border: "border-amber-400/25",  bg: "bg-amber-500/8",   desc: "Full access — manage everything" },
  admin:  { icon: <ShieldCheck size={11}/>, label: "Admin",  color: "text-violet-300",  border: "border-violet-400/25", bg: "bg-violet-500/8",  desc: "Add & remove members, edit settings" },
  editor: { icon: <Pencil size={11}/>,      label: "Editor", color: "text-blue-300",    border: "border-blue-400/25",   bg: "bg-blue-500/8",    desc: "Add files and milestones" },
  viewer: { icon: <Eye size={11}/>,         label: "Viewer", color: "text-white/40",    border: "border-white/12",      bg: "bg-white/4",       desc: "Read-only access" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  const p = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#f97316","#14b8a6"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return p[h % p.length];
}

function formatDateShort(s: string): string {
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function daysFromToday(s: string): number {
  const now = new Date(); now.setHours(0,0,0,0);
  const d = new Date(s + "T00:00:00");
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, onChange, disabled }: { status: string; onChange: (s: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const style = STATUS_STYLES[status] ?? STATUS_STYLES["active"];
  return (
    <div className="relative">
      <button disabled={disabled} onClick={() => !disabled && setOpen(p => !p)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] tracking-widest uppercase font-medium transition-all ${style.label} ${style.border} bg-white/[0.03] ${disabled ? "cursor-default" : "hover:bg-white/[0.06]"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}/>
        {status}
        {!disabled && <ChevronDown size={9} className="opacity-40"/>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 top-9 z-30 w-44 rounded-2xl border border-white/10 bg-[#141414] shadow-2xl py-1.5 overflow-hidden">
            {STATUS_OPTIONS.map(s => {
              const st = STATUS_STYLES[s];
              return (
                <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[10px] tracking-widest uppercase hover:bg-white/5 transition-colors">
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                  <span className={s === status ? "text-white" : "text-white/40"}>{s}</span>
                  {s === status && <Check size={9} className="ml-auto text-white/40"/>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function ProjectSidebar({
  project, versions, members, milestones, userRole, currentUserId,
}: {
  project: Project; versions: Version[]; members: Member[];
  milestones: Milestone[]; userRole: UserRole; currentUserId: string;
}) {
  const roleMeta = ROLE_META[userRole];

  // Upcoming milestones — next 3 by end_date, not completed
  const upcoming = useMemo(() =>
    milestones
      .filter(m => m.status !== "completed")
      .sort((a, b) => a.end_date.localeCompare(b.end_date))
      .slice(0, 3),
  [milestones]);

  // Recent files — last 3
  const recentFiles = useMemo(() =>
    [...versions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4),
  [versions]);

  const completedCount = milestones.filter(m => m.status === "completed").length;
  const progressPct = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  const MILESTONE_STATUS_DOT: Record<string, string> = {
    planned:   "bg-white/20",
    active:    "bg-amber-400",
    completed: "bg-emerald-400",
  };

  const DEPT_COLOR_DOT: Record<string, string> = {
    Sound: "bg-amber-400", Score: "bg-violet-400", Color: "bg-pink-400",
    Edit: "bg-blue-400", Animation: "bg-emerald-400", VFX: "bg-orange-400",
  };

  return (
    <div className="w-64 shrink-0 flex flex-col gap-4">

      {/* ── Your Access ── */}
      <div className={`rounded-2xl border ${roleMeta.border} ${roleMeta.bg} p-4`}>
        <p className="text-white/25 text-[9px] tracking-[0.22em] uppercase font-light mb-3">Your Access</p>
        <div className="flex items-center gap-2.5 mb-2">
          <span className={`${roleMeta.color}`}>{roleMeta.icon}</span>
          <span className={`text-sm font-light ${roleMeta.color}`}>{roleMeta.label}</span>
        </div>
        <p className="text-white/28 text-[10px] font-light leading-relaxed">{roleMeta.desc}</p>

        {/* Permissions list */}
        <div className="mt-3 flex flex-col gap-1.5">
          {[
            { label: "View files & timeline", allowed: true },
            { label: "Add files & milestones", allowed: userRole !== "viewer" },
            { label: "Edit project settings",  allowed: userRole === "owner" || userRole === "admin" },
            { label: "Manage team members",    allowed: userRole === "owner" || userRole === "admin" },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${p.allowed ? "bg-emerald-500/15" : "bg-white/4"}`}>
                {p.allowed
                  ? <Check size={8} className="text-emerald-400"/>
                  : <span className="w-1 h-px bg-white/15 rounded-full"/>}
              </span>
              <span className={`text-[10px] font-light ${p.allowed ? "text-white/45" : "text-white/18"}`}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Project Health ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-white/25 text-[9px] tracking-[0.22em] uppercase font-light mb-3">Project Health</p>

        {milestones.length === 0 ? (
          <p className="text-white/20 text-[10px] font-light">No milestones yet</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-white/70 text-2xl font-light">{progressPct}<span className="text-sm text-white/30">%</span></span>
              <span className="text-white/22 text-[10px] font-light">{completedCount}/{milestones.length} done</span>
            </div>
            {/* Segmented progress */}
            <div className="flex gap-0.5 mb-3">
              {milestones.map((m, i) => (
                <div key={m.id} className={`h-1.5 flex-1 rounded-full transition-all ${
                  m.status === "completed" ? "bg-emerald-400/70" :
                  m.status === "active"    ? "bg-amber-400/60" : "bg-white/8"
                }`}/>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {(["planned","active","completed"] as const).map(s => {
                const cnt = milestones.filter(m => m.status === s).length;
                if (cnt === 0) return null;
                return (
                  <div key={s} className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${MILESTONE_STATUS_DOT[s]}`}/>
                    <span className="text-white/22 text-[9px] font-light capitalize">{cnt} {s}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Upcoming Deadlines ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-white/25 text-[9px] tracking-[0.22em] uppercase font-light mb-3">Upcoming</p>
        {upcoming.length === 0 ? (
          <p className="text-white/18 text-[10px] font-light">No upcoming milestones</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {upcoming.map(m => {
              const days = daysFromToday(m.end_date);
              const isOverdue = days < 0;
              const isSoon = days >= 0 && days <= 7;
              return (
                <div key={m.id} className="flex items-start gap-2.5 group">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${m.department ? (DEPT_COLOR_DOT[m.department] ?? "bg-white/25") : "bg-white/25"}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/55 text-[11px] font-light truncate leading-snug">{m.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-light ${isOverdue ? "text-red-400/70" : isSoon ? "text-amber-400/70" : "text-white/22"}`}>
                        {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
                      </span>
                      <span className="text-white/12 text-[9px]">·</span>
                      <span className="text-white/18 text-[9px] font-light">{formatDateShort(m.end_date)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent Files ── */}
      {recentFiles.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-white/25 text-[9px] tracking-[0.22em] uppercase font-light mb-3">Recent Files</p>
          <div className="flex flex-col gap-2">
            {recentFiles.map(f => {
              const m = DEPT_META[f.department];
              return (
                <div key={f.id} className="flex items-center gap-2.5 group">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: m?.bg ?? "rgba(255,255,255,0.04)", color: m?.accent ?? "rgba(255,255,255,0.3)" }}>
                    {m?.icon ?? <FileText size={11}/>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/55 text-[11px] font-light truncate">{f.version_name}</p>
                    <p className="text-white/18 text-[9px] font-light">{f.department}</p>
                  </div>
                  {f.drive_url && (
                    <a href={f.drive_url} target="_blank" rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 text-white/22 hover:text-white/55 transition-all">
                      <ExternalLink size={10}/>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick Links ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-white/25 text-[9px] tracking-[0.22em] uppercase font-light mb-3">Quick Links</p>
        <div className="flex flex-col gap-1.5">
          <a href={`/review/${project.id}`}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/4 transition-colors group">
            <PlayCircle size={13} className="text-white/25 group-hover:text-white/55 transition-colors"/>
            <span className="text-white/40 text-[11px] font-light group-hover:text-white/65 transition-colors">Review Room</span>
            <ChevronRight size={10} className="ml-auto text-white/15 group-hover:text-white/35 transition-colors"/>
          </a>
          {project.departments.map(d => (
            <a key={d} href={`/review/${project.id}?dept=${d}`}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/4 transition-colors group">
              <span className="text-white/22 group-hover:text-white/50 transition-colors" style={{ color: DEPT_META[d]?.accent + "80" }}>
                {DEPT_META[d]?.icon}
              </span>
              <span className="text-white/35 text-[11px] font-light group-hover:text-white/60 transition-colors">{d} Review</span>
              <ChevronRight size={10} className="ml-auto text-white/12 group-hover:text-white/30 transition-colors"/>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Files Tab ────────────────────────────────────────────────────────────────

function FilesTab({ project, versions, canEdit }: { project: Project; versions: Version[]; canEdit: boolean }) {
  const depts = project.departments ?? [];
  const [activeDept, setActiveDept] = useState(depts[0] ?? "");
  const [addingFile, setAddingFile] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [localFiles, setLocalFiles] = useState<Version[]>(versions);

  const meta = DEPT_META[activeDept] ?? { icon: null, accent: "#6B7280", bg: "transparent", hex: "#6B7280" };
  const files = localFiles.filter(v => v.department === activeDept);

  const VERSION_STATUS: Record<string, { cls: string; label: string }> = {
    draft:       { cls: "text-white/30 bg-white/5 border-white/8",               label: "Draft" },
    "in review": { cls: "text-amber-400/70 bg-amber-500/8 border-amber-400/20",   label: "In Review" },
    approved:    { cls: "text-emerald-400/70 bg-emerald-500/8 border-emerald-400/20", label: "Approved" },
    changes:     { cls: "text-rose-400/70 bg-rose-500/8 border-rose-400/20",      label: "Changes" },
  };

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
    setLocalFiles(prev => [{ id: data.id, version_name: data.version_name ?? title.trim(), department: data.department ?? activeDept, drive_url: data.drive_url ?? null, status: data.status ?? "draft", created_at: data.created_at ?? new Date().toISOString() }, ...prev]);
    setTitle(""); setUrl(""); setAddError(""); setLoading(false); setAddingFile(false);
  }

  if (depts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <FolderOpen size={28} className="text-white/10"/>
        <p className="text-white/20 text-sm font-light">No departments assigned to this project</p>
      </div>
    );
  }

  return (
    <div className="flex gap-7 min-h-[400px]">
      {/* Dept nav */}
      <div className="w-44 shrink-0 flex flex-col gap-0.5">
        <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase px-3 mb-2.5 font-light">Departments</p>
        {depts.map(dept => {
          const m = DEPT_META[dept] ?? { icon: null, accent: "#6B7280", bg: "transparent", hex: "#6B7280" };
          const count = localFiles.filter(v => v.department === dept).length;
          const active = activeDept === dept;
          return (
            <div key={dept} className="relative group/row">
              <button onClick={() => { setActiveDept(dept); setAddingFile(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${active ? "bg-white/6" : "hover:bg-white/3"}`}>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{ background: active ? m.bg : "transparent", color: active ? m.accent : "rgba(255,255,255,0.2)" }}>
                    {m.icon}
                  </span>
                  <span className={`text-[12px] font-light transition-colors ${active ? "text-white/80" : "text-white/30 group-hover/row:text-white/50"}`}>{dept}</span>
                </div>
                <span className={`text-[9px] tabular-nums px-1.5 py-0.5 rounded-md ${active ? "bg-white/8 text-white/38" : "text-white/18"}`}>{count}</span>
              </button>
              {count > 0 && (
                <a href={`/review/${project.id}?dept=${dept}`} title="Open Review Room"
                  className="absolute right-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity text-white/20 hover:text-white/50 p-1">
                  <PlayCircle size={11}/>
                </a>
              )}
            </div>
          );
        })}
        <div className="mt-3 pt-3 border-t border-white/[0.04] px-3">
          <p className="text-white/15 text-[9px] font-light">{localFiles.length} total</p>
        </div>
      </div>

      <div className="w-px bg-white/[0.04] self-stretch"/>

      {/* File list */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: meta.bg, color: meta.accent }}>{meta.icon}</span>
            <div>
              <h3 className="text-white/75 text-sm font-light">{activeDept}</h3>
              <p className="text-white/20 text-[10px] font-light">{files.length} {files.length === 1 ? "file" : "files"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <a href={`/review/${project.id}?dept=${activeDept}`}
                className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 border border-white/8 hover:border-white/16 px-3 py-1.5 rounded-lg transition-all font-light">
                <PlayCircle size={11}/> Review
              </a>
            )}
            {canEdit && (
              <button onClick={() => setAddingFile(p => !p)}
                className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 border border-white/10 hover:border-white/22 px-3 py-1.5 rounded-lg transition-all font-light">
                <Plus size={11}/> Add file
              </button>
            )}
          </div>
        </div>

        {addingFile && canEdit && (
          <form onSubmit={handleAdd} className="mb-5 p-4 rounded-2xl border border-white/8 bg-white/[0.02] flex flex-col gap-3">
            <input autoFocus placeholder="File name — e.g. Score v2 Final Mix"
              value={title} onChange={e => setTitle(e.target.value)} required
              className="bg-transparent border-b border-white/8 pb-2 text-sm text-white/75 placeholder-white/16 outline-none focus:border-white/18 transition-colors w-full font-light"/>
            <div className="flex items-center gap-2 border-b border-white/8 pb-2">
              <Link size={10} className="text-white/18 shrink-0"/>
              <input placeholder="Google Drive link (optional)" value={url} onChange={e => setUrl(e.target.value)}
                className="bg-transparent text-sm text-white/65 placeholder-white/16 outline-none w-full font-light"/>
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

        {files.length === 0 && !addingFile ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-white/[0.05] rounded-2xl">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: meta.bg }}>
              <span style={{ color: meta.accent }}>{meta.icon}</span>
            </div>
            <div className="text-center">
              <p className="text-white/28 text-sm font-light">No {activeDept} files yet</p>
              {canEdit && <p className="text-white/15 text-xs font-light mt-0.5">Add your first file above</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_90px_70px_28px] gap-4 px-3 pb-2.5 border-b border-white/[0.04]">
              {["File","Status","Added",""].map(h => (
                <span key={h} className="text-[9px] tracking-[0.2em] uppercase text-white/16 font-light">{h}</span>
              ))}
            </div>
            {files.map((f, i) => {
              const vs = VERSION_STATUS[f.status] ?? VERSION_STATUS["draft"];
              return (
                <div key={f.id}
                  className={`grid grid-cols-[1fr_90px_70px_28px] gap-4 items-center px-3 py-3.5 group hover:bg-white/[0.02] rounded-xl transition-colors ${i < files.length - 1 ? "border-b border-white/[0.03]" : ""}`}>
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-0.5 h-5 rounded-full shrink-0" style={{ background: meta.hex + "50" }}/>
                    <p className="text-white/65 text-[13px] truncate font-light">{f.version_name}</p>
                  </div>
                  <span className={`text-[9px] tracking-wide px-2 py-1 rounded-full border font-light w-fit capitalize ${vs.cls}`}>{vs.label}</span>
                  <span className="text-white/20 text-[11px] font-light">
                    {new Date(f.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <div className="flex justify-end">
                    {f.drive_url
                      ? <a href={f.drive_url} target="_blank" rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 text-white/22 hover:text-white/60 transition-all"><ExternalLink size={12}/></a>
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
  const [role, setRole] = useState("viewer");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roleColors: Record<string, string> = {
    owner:  "text-amber-300/80 border-amber-400/20 bg-amber-500/6",
    admin:  "text-violet-300/80 border-violet-400/20 bg-violet-500/6",
    editor: "text-blue-300/80 border-blue-400/20 bg-blue-500/6",
    viewer: "text-white/25 border-white/8 bg-white/3",
  };

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError("");
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to add member"); }
    else { if (data.member) setLocalMembers(prev => [...prev, data.member]); setEmail(""); setAdding(false); }
    setLoading(false);
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/55 text-sm font-light">{localMembers.length} {localMembers.length === 1 ? "member" : "members"}</p>
          <p className="text-white/18 text-xs font-light mt-0.5">Role-based access control</p>
        </div>
        {canManage && (
          <button onClick={() => setAdding(p => !p)}
            className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 border border-white/10 hover:border-white/22 px-3.5 py-2 rounded-xl transition-all font-light">
            <Plus size={11}/> Invite member
          </button>
        )}
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {(["admin","editor","viewer"] as const).map(r => {
          const rm = ROLE_META[r];
          return (
            <div key={r} className={`flex items-start gap-2.5 p-3 rounded-xl border ${rm.border} ${rm.bg}`}>
              <span className={`mt-0.5 ${rm.color}`}>{rm.icon}</span>
              <div>
                <p className={`text-[11px] font-light ${rm.color}`}>{rm.label}</p>
                <p className="text-white/20 text-[9px] font-light leading-snug mt-0.5">{rm.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {adding && canManage && (
        <form onSubmit={handleInvite} className="mb-5 p-4 rounded-2xl border border-white/8 bg-white/[0.02] flex flex-col gap-4">
          <input autoFocus type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
            className="bg-transparent border-b border-white/8 pb-2 text-sm text-white/75 placeholder-white/16 outline-none focus:border-white/18 transition-colors w-full font-light"/>
          <div>
            <p className="text-white/20 text-[9px] tracking-[0.2em] uppercase font-light mb-2">Access level</p>
            <div className="flex gap-2">
              {MEMBER_ROLES.map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-xl text-xs capitalize transition-all border font-light ${role === r ? "bg-white text-black border-white" : "border-white/8 text-white/28 hover:border-white/16 hover:text-white/50"}`}>
                  {r}
                </button>
              ))}
            </div>
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

      {localMembers.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-white/[0.05] rounded-2xl">
          <Users size={24} className="text-white/10"/>
          <p className="text-white/20 text-sm font-light">No team members yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {localMembers.map(m => {
            const name = m.profiles?.full_name || m.profiles?.email || "Unknown";
            const initials = name.slice(0, 2).toUpperCase();
            const color = avatarColor(name);
            const memberRole = (m.role ?? "viewer") as keyof typeof roleColors;
            return (
              <div key={m.id} className="flex items-center justify-between px-4 py-3.5 rounded-2xl hover:bg-white/[0.025] transition-colors border border-transparent hover:border-white/[0.04] group">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                    style={{ background: color + "20", border: `1px solid ${color}30`, color }}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-white/70 text-sm font-light">{name}</p>
                    {m.profiles?.full_name && <p className="text-white/20 text-xs font-light">{m.profiles.email}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 text-[9px] tracking-wide uppercase border px-2.5 py-1 rounded-full font-light ${roleColors[memberRole] ?? roleColors["viewer"]}`}>
                    {memberRole}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ project, onProjectUpdate, canManage }: { project: Project; onProjectUpdate: (p: Partial<Project>) => void; canManage: boolean }) {
  const [name, setName] = useState(project.name);
  const [client, setClient] = useState(project.client || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Eye size={28} className="text-white/10"/>
        <p className="text-white/25 text-sm font-light">Settings are restricted to admins and owners</p>
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), client: client.trim() }),
    });
    if (res.ok) { onProjectUpdate({ name: name.trim(), client: client.trim() || null }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    window.location.href = "/dashboard";
  }

  return (
    <div className="max-w-md flex flex-col gap-10">
      <div>
        <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-5 font-light">General</p>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="text-white/25 text-xs mb-2 block font-light">Project name</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3.5 text-sm text-white/75 outline-none focus:border-white/16 transition-colors font-light"/>
          </div>
          <div>
            <label className="text-white/25 text-xs mb-2 block font-light">Client name</label>
            <input value={client} onChange={e => setClient(e.target.value)} placeholder="Optional"
              className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3.5 text-sm text-white/75 placeholder-white/16 outline-none focus:border-white/16 transition-colors font-light"/>
          </div>
          <button type="submit" disabled={saving}
            className="self-start flex items-center gap-2 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
            {saved ? <><Check size={11}/> Saved</> : saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
      <div className="border-t border-white/[0.05] pt-8">
        <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-5 font-light">Danger Zone</p>
        <div className="flex items-center justify-between p-5 rounded-2xl border border-red-500/10 bg-red-500/[0.02]">
          <div>
            <p className="text-white/55 text-sm font-light">Delete this project</p>
            <p className="text-white/18 text-xs mt-0.5 font-light">Removes all files and data permanently</p>
          </div>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1.5 text-red-400/65 hover:text-red-400 border border-red-500/15 hover:border-red-500/30 px-3.5 py-2 rounded-xl text-xs transition-all disabled:opacity-30 font-light">
            <Trash2 size={11}/> {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "files" | "team" | "settings" | "timeline";

export default function ProjectClient({ project: initialProject, versions, members, milestones, currentUserId }: {
  project: Project; versions: Version[]; members: Member[]; milestones: Milestone[]; currentUserId: string;
}) {
  const [project, setProject] = useState(initialProject);
  const [status, setStatus] = useState(initialProject.status);
  const [activeTab, setActiveTab] = useState<Tab>("files");

  // Determine user role
  const userRole = useMemo<UserRole>(() => {
    if (project.owner_id === currentUserId) return "owner";
    const me = members.find(m => (m as any).user_id === currentUserId || m.profiles?.id === currentUserId);
    if (!me) return "viewer";
    const r = me.role ?? "viewer";
    if (r === "admin") return "admin";
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

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "files",    label: "Files",    icon: <FileText size={12}/>,  count: versions.length },
    { id: "timeline", label: "Timeline", icon: <Calendar size={12}/>,  count: milestones.length },
    { id: "team",     label: "Team",     icon: <Users size={12}/>,     count: members.length },
    { id: "settings", label: "Settings", icon: <Settings size={12}/> },
  ];

  const primaryDept  = project.departments[0];
  const primaryHex   = DEPT_META[primaryDept]?.hex ?? "#ffffff";

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar active="dashboard"/>

      <main className="flex-1 overflow-y-auto scrollbar-hide">

        {/* ── Header ── */}
        <div className="relative">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 70% 180px at 25% 0%, ${primaryHex}07 0%, transparent 70%)` }}/>

          <div className="max-w-6xl mx-auto px-10 pt-8 pb-0 relative">

            {/* Breadcrumb */}
            <a href="/dashboard"
              className="inline-flex items-center gap-1.5 text-white/18 hover:text-white/45 text-[9px] tracking-[0.28em] uppercase transition-colors mb-7 font-light group">
              <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform"/>
              Dashboard
              <ChevronRight size={9} className="text-white/12 mx-0.5"/>
              <span className="text-white/28">{project.client || project.name}</span>
            </a>

            {/* Title row */}
            <div className="flex items-start justify-between gap-6 mb-5">
              <div className="flex-1 min-w-0">
                {project.client && (
                  <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase mb-1.5 font-light">{project.client}</p>
                )}
                <h1 className="text-white/85 text-3xl font-light tracking-wide leading-tight">{project.name}</h1>
                {project.departments.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {project.departments.map(d => {
                      const m = DEPT_META[d];
                      return (
                        <span key={d} className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full border font-light"
                          style={{ color: m?.accent ?? "#9ca3af", borderColor: (m?.accent ?? "#9ca3af") + "28", background: m?.bg ?? "transparent" }}>
                          {m?.icon}{d}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2.5 shrink-0 mt-1">
                <a href={`/review/${project.id}`}
                  className="flex items-center gap-2 text-[10px] text-white/35 hover:text-white/65 border border-white/8 hover:border-white/18 px-3.5 py-2 rounded-xl transition-all font-light">
                  <PlayCircle size={12}/> Review Room
                </a>
                <StatusBadge status={status} onChange={updateStatus} disabled={!canManage}/>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-4 gap-2.5 mb-6">
              {[
                { icon: <FileText size={14}/>, label: "Files", value: versions.length, sub: `${project.departments.length} dept${project.departments.length !== 1 ? "s" : ""}` },
                { icon: <Activity size={14}/>, label: "Milestones", value: milestones.length > 0 ? `${milestones.filter(m=>m.status==="completed").length}/${milestones.length}` : "—", sub: "completed" },
                { icon: <Users size={14}/>, label: "Team", value: members.length, sub: members.length === 1 ? "member" : "members" },
                { icon: <TrendingUp size={14}/>, label: "Progress", value: milestones.length > 0 ? `${Math.round((milestones.filter(m=>m.status==="completed").length/milestones.length)*100)}%` : "—", sub: milestones.filter(m=>m.status==="active").length > 0 ? `${milestones.filter(m=>m.status==="active").length} active` : "" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.03] transition-colors group">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.04] text-white/28 group-hover:text-white/50 transition-colors shrink-0">{s.icon}</div>
                  <div className="min-w-0">
                    <p className="text-white/22 text-[9px] tracking-[0.2em] uppercase font-light">{s.label}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-white/75 text-lg font-light leading-tight">{s.value}</span>
                      {s.sub && <span className="text-white/22 text-[10px] font-light">{s.sub}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-0 border-b border-white/[0.05]">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[11px] tracking-wide transition-all relative -mb-px border-b-2 font-light ${
                    activeTab === tab.id ? "text-white/85 border-white/50" : "text-white/25 border-transparent hover:text-white/50"
                  }`}>
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/10 text-white/55" : "bg-white/5 text-white/20"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-6xl mx-auto px-10 py-7">
          {activeTab === "timeline" ? (
            <Timeline project={project} initialMilestones={milestones}/>
          ) : (
            <div className="flex gap-7">
              {/* Main content */}
              <div className="flex-1 min-w-0">
                {activeTab === "files"    && <FilesTab project={project} versions={versions} canEdit={canEdit}/>}
                {activeTab === "team"     && <TeamTab project={project} members={members} canManage={canManage}/>}
                {activeTab === "settings" && <SettingsTab project={project} onProjectUpdate={p => setProject(prev => ({...prev,...p}))} canManage={canManage}/>}
              </div>

              {/* Right sidebar */}
              <ProjectSidebar
                project={project}
                versions={versions}
                members={members}
                milestones={milestones}
                userRole={userRole}
                currentUserId={currentUserId}
              />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
