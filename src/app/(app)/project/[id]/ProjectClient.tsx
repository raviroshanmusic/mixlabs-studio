"use client";
import { useState, useEffect } from "react";
import {
  ArrowLeft, Plus, ExternalLink, ChevronDown,
  Music, Palette, Scissors, Wand2, Zap, Volume2,
  Settings, Users, FileText, Trash2, Check, Link,
  PlayCircle, Calendar, X, Clock, TrendingUp,
  FolderOpen, Activity, MoreHorizontal, ChevronRight,
} from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";
import Timeline, { Milestone } from "./Timeline";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["active", "in review", "ready", "paused", "delivered"];
const STATUS_STYLES: Record<string, { dot: string; label: string; border: string; glow: string }> = {
  "active":     { dot: "bg-emerald-400",  label: "text-emerald-400",  border: "border-emerald-400/30", glow: "shadow-emerald-500/10" },
  "in review":  { dot: "bg-amber-400",    label: "text-amber-400",    border: "border-amber-400/30",   glow: "shadow-amber-500/10"   },
  "ready":      { dot: "bg-blue-400",     label: "text-blue-400",     border: "border-blue-400/30",    glow: "shadow-blue-500/10"    },
  "paused":     { dot: "bg-zinc-500",     label: "text-zinc-400",     border: "border-zinc-600",       glow: "shadow-zinc-500/5"     },
  "delivered":  { dot: "bg-violet-400",   label: "text-violet-400",   border: "border-violet-400/30",  glow: "shadow-violet-500/10"  },
};

const STATUS_BG: Record<string, string> = {
  "active":    "rgba(16,185,129,0.04)",
  "in review": "rgba(245,158,11,0.04)",
  "ready":     "rgba(59,130,246,0.04)",
  "paused":    "rgba(113,113,122,0.03)",
  "delivered": "rgba(139,92,246,0.04)",
};

const DEPT_META: Record<string, { icon: React.ReactNode; accent: string; bg: string; hex: string }> = {
  Sound:     { icon: <Volume2 size={13} />,  accent: "#F59E0B", bg: "rgba(245,158,11,0.08)",  hex: "#F59E0B" },
  Score:     { icon: <Music size={13} />,    accent: "#A855F7", bg: "rgba(168,85,247,0.08)",  hex: "#A855F7" },
  Color:     { icon: <Palette size={13} />,  accent: "#EC4899", bg: "rgba(236,72,153,0.08)",  hex: "#EC4899" },
  Edit:      { icon: <Scissors size={13} />, accent: "#3B82F6", bg: "rgba(59,130,246,0.08)",  hex: "#3B82F6" },
  Animation: { icon: <Wand2 size={13} />,    accent: "#22C55E", bg: "rgba(34,197,94,0.08)",   hex: "#22C55E" },
  VFX:       { icon: <Zap size={13} />,      accent: "#F97316", bg: "rgba(249,115,22,0.08)",  hex: "#F97316" },
};

const MEMBER_ROLES = ["viewer", "editor", "admin"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = { id: string; name: string; client: string | null; status: string; departments: string[] };
type Version = { id: string; version_name: string; department: string; drive_url: string | null; status: string; created_at: string };
type Member = { id: string; role: string | null; profiles: { id: string; full_name: string | null; email: string | null } | null };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  const palette = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#f97316","#14b8a6"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return palette[h % palette.length];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const style = STATUS_STYLES[status] ?? STATUS_STYLES["active"];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] tracking-widest uppercase font-medium transition-all ${style.label} ${style.border} bg-white/[0.03] hover:bg-white/[0.06]`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {status}
        <ChevronDown size={9} className="opacity-40" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-30 w-40 rounded-xl border border-white/10 bg-[#141414] shadow-2xl py-1 overflow-hidden">
            {STATUS_OPTIONS.map(s => {
              const st = STATUS_STYLES[s];
              return (
                <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[10px] tracking-widest uppercase hover:bg-white/5 transition-colors">
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  <span className={s === status ? "text-white" : "text-white/40"}>{s}</span>
                  {s === status && <Check size={9} className="ml-auto text-white/40" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center gap-3.5 px-5 py-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] transition-colors group">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] text-white/35 group-hover:text-white/55 transition-colors shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-white/28 text-[9px] tracking-[0.22em] uppercase font-light mb-0.5">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-white/80 text-lg font-light leading-none">{value}</span>
          {sub && <span className="text-white/25 text-[10px] font-light">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Files Tab ────────────────────────────────────────────────────────────────

function FilesTab({ project, versions }: { project: Project; versions: Version[] }) {
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true); setAddError("");
    const res = await fetch(`/api/projects/${project.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), department: activeDept, drive_url: url.trim() || null }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error || "Failed to add file"); setLoading(false); return; }
    setLocalFiles(prev => [{ id: data.id, version_name: data.version_name ?? title.trim(), department: data.department ?? activeDept, drive_url: data.drive_url ?? null, status: data.status ?? "draft", created_at: data.created_at ?? new Date().toISOString() }, ...prev]);
    setTitle(""); setUrl(""); setAddError(""); setLoading(false); setAddingFile(false);
  }

  if (depts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <FolderOpen size={28} className="text-white/10" />
        <p className="text-white/20 text-sm font-light">No departments assigned</p>
      </div>
    );
  }

  const VERSION_STATUS: Record<string, { cls: string }> = {
    draft:      { cls: "text-white/30 bg-white/5 border-white/8" },
    "in review":{ cls: "text-amber-400/70 bg-amber-500/8 border-amber-400/20" },
    approved:   { cls: "text-emerald-400/70 bg-emerald-500/8 border-emerald-400/20" },
    changes:    { cls: "text-rose-400/70 bg-rose-500/8 border-rose-400/20" },
  };

  return (
    <div className="flex gap-8 min-h-[480px]">
      {/* Left nav */}
      <div className="w-48 shrink-0 flex flex-col gap-0.5">
        <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase px-3 mb-3 font-light">Departments</p>
        {depts.map(dept => {
          const m = DEPT_META[dept] ?? { icon: null, accent: "#6B7280", bg: "transparent", hex: "#6B7280" };
          const count = localFiles.filter(v => v.department === dept).length;
          const active = activeDept === dept;
          return (
            <div key={dept} className="relative group/row">
              <button onClick={() => { setActiveDept(dept); setAddingFile(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${active ? "bg-white/6" : "hover:bg-white/3"}`}>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{ background: active ? m.bg : "transparent", color: active ? m.accent : "rgba(255,255,255,0.22)" }}>
                    {m.icon}
                  </span>
                  <span className={`text-sm font-light transition-colors ${active ? "text-white/85" : "text-white/35 group-hover/row:text-white/55"}`}>{dept}</span>
                </div>
                <span className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-md transition-colors ${active ? "bg-white/8 text-white/40" : "text-white/20"}`}>
                  {count}
                </span>
              </button>
              {count > 0 && (
                <a href={`/review/${project.id}?dept=${dept}`} title="Open Review Room"
                  className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity text-white/22 hover:text-white/55 p-1">
                  <PlayCircle size={12} />
                </a>
              )}
            </div>
          );
        })}

        {/* Dept total */}
        <div className="mt-4 pt-4 border-t border-white/[0.05] px-3">
          <p className="text-white/18 text-[9px] font-light">{localFiles.length} total files</p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-white/[0.05] self-stretch" />

      {/* Right content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: meta.bg, color: meta.accent }}>
              {meta.icon}
            </span>
            <div>
              <h3 className="text-white/80 text-sm font-light">{activeDept}</h3>
              <p className="text-white/22 text-[10px] font-light">{files.length} {files.length === 1 ? "file" : "files"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <a href={`/review/${project.id}?dept=${activeDept}`}
                className="flex items-center gap-1.5 text-[10px] text-white/35 hover:text-white/65 border border-white/8 hover:border-white/18 px-3 py-1.5 rounded-lg transition-all font-light">
                <PlayCircle size={11} />
                Review Room
              </a>
            )}
            <button onClick={() => setAddingFile(p => !p)}
              className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 border border-white/10 hover:border-white/22 px-3 py-1.5 rounded-lg transition-all font-light">
              <Plus size={11} />
              Add file
            </button>
          </div>
        </div>

        {/* Add form */}
        {addingFile && (
          <form onSubmit={handleAdd} className="mb-5 p-4 rounded-2xl border border-white/8 bg-white/[0.02] flex flex-col gap-3">
            <input autoFocus placeholder="File name — e.g. Score v2 Final Mix"
              value={title} onChange={e => setTitle(e.target.value)} required
              className="bg-transparent border-b border-white/8 pb-2 text-sm text-white/80 placeholder-white/18 outline-none focus:border-white/20 transition-colors w-full font-light"
            />
            <div className="flex items-center gap-2 border-b border-white/8 pb-2">
              <Link size={10} className="text-white/18 shrink-0" />
              <input placeholder="Google Drive link (optional)"
                value={url} onChange={e => setUrl(e.target.value)}
                className="bg-transparent text-sm text-white/70 placeholder-white/18 outline-none w-full font-light"
              />
            </div>
            {addError && <p className="text-red-400/70 text-xs font-light">{addError}</p>}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading || !title.trim()}
                className="bg-white text-black text-xs font-medium px-4 py-2 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
                {loading ? "Adding…" : "Add file"}
              </button>
              <button type="button" onClick={() => { setAddingFile(false); setAddError(""); }}
                className="text-white/22 hover:text-white/50 text-xs transition-colors font-light">Cancel</button>
            </div>
          </form>
        )}

        {/* File list */}
        {files.length === 0 && !addingFile ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-white/[0.06] rounded-2xl">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: meta.bg }}>
              {meta.icon && <span style={{ color: meta.accent }}>{meta.icon}</span>}
            </div>
            <div className="text-center">
              <p className="text-white/30 text-sm font-light">No files yet</p>
              <p className="text-white/15 text-xs font-light mt-0.5">Add your first {activeDept} file above</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_80px_80px_28px] gap-4 px-3 pb-2.5 border-b border-white/[0.05]">
              <span className="text-[9px] tracking-[0.22em] uppercase text-white/18 font-light">File</span>
              <span className="text-[9px] tracking-[0.22em] uppercase text-white/18 font-light">Status</span>
              <span className="text-[9px] tracking-[0.22em] uppercase text-white/18 font-light">Added</span>
              <span />
            </div>
            {files.map((f, i) => {
              const vs = VERSION_STATUS[f.status] ?? VERSION_STATUS["draft"];
              return (
                <div key={f.id}
                  className={`grid grid-cols-[1fr_80px_80px_28px] gap-4 items-center px-3 py-3.5 group hover:bg-white/[0.025] rounded-xl transition-colors ${i < files.length - 1 ? "border-b border-white/[0.03]" : ""}`}>
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className="w-1 h-6 rounded-full shrink-0" style={{ background: meta.hex + "40" }} />
                    <p className="text-white/70 text-sm truncate font-light">{f.version_name}</p>
                  </div>
                  <span className={`text-[9px] tracking-wide uppercase px-2 py-1 rounded-full border font-light w-fit ${vs.cls}`}>{f.status}</span>
                  <span className="text-white/22 text-xs font-light">
                    {new Date(f.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <div className="flex justify-end">
                    {f.drive_url ? (
                      <a href={f.drive_url} target="_blank" rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-white/65 transition-all">
                        <ExternalLink size={12} />
                      </a>
                    ) : <span />}
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

function TeamTab({ project, members }: { project: Project; members: Member[] }) {
  const [localMembers, setLocalMembers] = useState<Member[]>(members);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const roleColors: Record<string, string> = { admin: "text-violet-400/70 border-violet-400/20 bg-violet-500/5", editor: "text-blue-400/70 border-blue-400/20 bg-blue-500/5", viewer: "text-white/25 border-white/8 bg-white/3" };

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/55 text-sm font-light">{localMembers.length} {localMembers.length === 1 ? "member" : "members"}</p>
          <p className="text-white/20 text-xs font-light mt-0.5">Manage who has access to this project</p>
        </div>
        <button onClick={() => setAdding(p => !p)}
          className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/70 border border-white/10 hover:border-white/22 px-3.5 py-2 rounded-xl transition-all font-light">
          <Plus size={11} />
          Add member
        </button>
      </div>

      {adding && (
        <form onSubmit={handleInvite} className="mb-5 p-5 rounded-2xl border border-white/8 bg-white/[0.02] flex flex-col gap-4">
          <input autoFocus type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)} required
            className="bg-transparent border-b border-white/8 pb-2 text-sm text-white/80 placeholder-white/18 outline-none focus:border-white/20 transition-colors w-full font-light"
          />
          <div className="flex gap-2">
            {MEMBER_ROLES.map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-xl text-xs capitalize transition-all border font-light ${role === r ? "bg-white text-black border-white" : "border-white/8 text-white/30 hover:border-white/18 hover:text-white/55"}`}>
                {r}
              </button>
            ))}
          </div>
          {error && <p className="text-red-400/70 text-xs font-light">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading || !email.trim()}
              className="bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
              {loading ? "Adding…" : "Add member"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-white/22 hover:text-white/50 text-xs transition-colors font-light">Cancel</button>
          </div>
        </form>
      )}

      {localMembers.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-white/[0.06] rounded-2xl">
          <Users size={24} className="text-white/10" />
          <p className="text-white/20 text-sm font-light">No team members yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {localMembers.map(m => {
            const name = m.profiles?.full_name || m.profiles?.email || "Unknown";
            const initials = name.slice(0, 2).toUpperCase();
            const color = avatarColor(name);
            const roleCls = roleColors[m.role ?? "viewer"] ?? roleColors["viewer"];
            return (
              <div key={m.id} className="flex items-center justify-between px-4 py-4 rounded-2xl hover:bg-white/[0.025] transition-colors border border-transparent hover:border-white/[0.04] group">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                    style={{ background: color + "30", border: `1px solid ${color}30`, color }}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-white/75 text-sm font-light">{name}</p>
                    {m.profiles?.full_name && <p className="text-white/22 text-xs font-light">{m.profiles.email}</p>}
                  </div>
                </div>
                <span className={`text-[9px] tracking-widest uppercase border px-2.5 py-1 rounded-full font-light ${roleCls}`}>
                  {m.role || "viewer"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ project, onProjectUpdate }: { project: Project; onProjectUpdate: (p: Partial<Project>) => void }) {
  const [name, setName] = useState(project.name);
  const [client, setClient] = useState(project.client || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-5 font-light">General</p>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="text-white/28 text-xs mb-2 block font-light">Project name</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3.5 text-sm text-white/80 placeholder-white/18 outline-none focus:border-white/18 transition-colors font-light"
            />
          </div>
          <div>
            <label className="text-white/28 text-xs mb-2 block font-light">Client name</label>
            <input value={client} onChange={e => setClient(e.target.value)} placeholder="Optional"
              className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3.5 text-sm text-white/80 placeholder-white/18 outline-none focus:border-white/18 transition-colors font-light"
            />
          </div>
          <button type="submit" disabled={saving}
            className="self-start flex items-center gap-2 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
            {saved ? <><Check size={11} /> Saved</> : saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      <div className="border-t border-white/[0.05] pt-8">
        <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-5 font-light">Danger Zone</p>
        <div className="flex items-center justify-between p-5 rounded-2xl border border-red-500/10 bg-red-500/[0.02]">
          <div>
            <p className="text-white/60 text-sm font-light">Delete this project</p>
            <p className="text-white/20 text-xs mt-0.5 font-light">Permanently removes all files and data</p>
          </div>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1.5 text-red-400/70 hover:text-red-400 border border-red-500/15 hover:border-red-500/35 px-3.5 py-2 rounded-xl text-xs transition-all disabled:opacity-30 font-light">
            <Trash2 size={11} />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "files" | "team" | "settings" | "timeline";

export default function ProjectClient({ project: initialProject, versions, members, milestones, currentUserId }: {
  project: Project; versions: Version[]; members: Member[]; milestones: Milestone[]; currentUserId: string;
}) {
  const [project, setProject] = useState(initialProject);
  const [status, setStatus] = useState(initialProject.status);
  const [activeTab, setActiveTab] = useState<Tab>("files");
  const [headerVisible, setHeaderVisible] = useState(true);

  // Shrink header on scroll
  useEffect(() => {
    const el = document.getElementById("project-scroll");
    if (!el) return;
    const handler = () => setHeaderVisible(el.scrollTop < 60);
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  async function updateStatus(s: string) {
    setStatus(s);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "files",    label: "Files",    icon: <FileText size={12} />,  count: versions.length },
    { id: "timeline", label: "Timeline", icon: <Calendar size={12} />,  count: milestones.length },
    { id: "team",     label: "Team",     icon: <Users size={12} />,     count: members.length },
    { id: "settings", label: "Settings", icon: <Settings size={12} /> },
  ];

  // Stats
  const completedMilestones = milestones.filter(m => m.status === "completed").length;
  const activeMilestones = milestones.filter(m => m.status === "active").length;
  const progressPct = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES["active"];
  const statusBg = STATUS_BG[status] ?? "transparent";

  // Primary dept accent for subtle header glow
  const primaryDept = project.departments[0];
  const primaryAccent = DEPT_META[primaryDept]?.hex ?? "#ffffff";

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar active="dashboard" />

      <main id="project-scroll" className="flex-1 overflow-y-auto scrollbar-hide">

        {/* ── Hero Header ── */}
        <div className="relative">
          {/* Subtle gradient based on status */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 80% 200px at 30% 0%, ${primaryAccent}08 0%, transparent 70%)` }} />

          <div className="max-w-5xl mx-auto px-10 pt-8 pb-0 relative">

            {/* Back */}
            <a href="/dashboard"
              className="inline-flex items-center gap-1.5 text-white/18 hover:text-white/45 text-[9px] tracking-[0.28em] uppercase transition-colors mb-8 font-light group">
              <ArrowLeft size={10} className="group-hover:-translate-x-0.5 transition-transform" />
              Dashboard
              <ChevronRight size={9} className="text-white/12" />
              <span className="text-white/30">{project.client || project.name}</span>
            </a>

            {/* Project name + actions */}
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="flex-1 min-w-0">
                {project.client && (
                  <p className="text-white/22 text-[10px] tracking-[0.3em] uppercase mb-1.5 font-light">{project.client}</p>
                )}
                <h1 className="text-white/88 text-3xl font-light tracking-wide leading-tight truncate">{project.name}</h1>

                {/* Dept pills */}
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
                  className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white/70 border border-white/8 hover:border-white/18 px-3.5 py-2 rounded-xl transition-all font-light">
                  <PlayCircle size={12} />
                  Review Room
                </a>
                <StatusBadge status={status} onChange={updateStatus} />
              </div>
            </div>

            {/* ── Stats strip ── */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              <StatCard icon={<FileText size={15} />} label="Files" value={versions.length} sub={`across ${project.departments.length} dept${project.departments.length !== 1 ? "s" : ""}`} />
              <StatCard icon={<Activity size={15} />} label="Milestones" value={milestones.length > 0 ? `${completedMilestones}/${milestones.length}` : "—"} sub={milestones.length > 0 ? "completed" : "none yet"} />
              <StatCard icon={<Users size={15} />} label="Team" value={members.length} sub={members.length === 1 ? "member" : "members"} />
              <StatCard icon={<TrendingUp size={15} />} label="Progress" value={milestones.length > 0 ? `${progressPct}%` : "—"} sub={activeMilestones > 0 ? `${activeMilestones} active` : "not started"} />
            </div>

            {/* ── Progress bar (only if milestones exist) ── */}
            {milestones.length > 0 && (
              <div className="mb-6">
                <div className="h-px bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${primaryAccent}60, ${primaryAccent}90)` }} />
                </div>
              </div>
            )}

            {/* ── Tab Bar ── */}
            <div className="flex items-center gap-0 border-b border-white/[0.05]">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[11px] tracking-wide transition-all relative -mb-px border-b-2 font-light ${
                    activeTab === tab.id
                      ? "text-white border-white/60"
                      : "text-white/28 border-transparent hover:text-white/50"
                  }`}>
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/12 text-white/60" : "bg-white/5 text-white/22"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="max-w-5xl mx-auto px-10 py-8">
          {activeTab === "files"    && <FilesTab project={project} versions={versions} />}
          {activeTab === "timeline" && <Timeline project={project} initialMilestones={milestones} />}
          {activeTab === "team"     && <TeamTab project={project} members={members} />}
          {activeTab === "settings" && <SettingsTab project={project} onProjectUpdate={p => setProject(prev => ({ ...prev, ...p }))} />}
        </div>

      </main>
    </div>
  );
}
