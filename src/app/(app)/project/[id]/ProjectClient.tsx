"use client";
import { useState } from "react";
import {
  ArrowLeft, Plus, ExternalLink, ChevronDown,
  Music, Palette, Scissors, Wand2, Zap, Volume2,
  X, Settings, Users, FileText, Trash2, Check, Link, PlayCircle, Calendar,
} from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";
import Timeline, { Milestone } from "./Timeline";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["active", "in review", "ready", "paused", "delivered"];
const STATUS_STYLES: Record<string, { dot: string; label: string; border: string }> = {
  "active":     { dot: "bg-emerald-400",  label: "text-emerald-400",  border: "border-emerald-400/30" },
  "in review":  { dot: "bg-amber-400",    label: "text-amber-400",    border: "border-amber-400/30"   },
  "ready":      { dot: "bg-blue-400",     label: "text-blue-400",     border: "border-blue-400/30"    },
  "paused":     { dot: "bg-zinc-500",     label: "text-zinc-400",     border: "border-zinc-600"       },
  "delivered":  { dot: "bg-violet-400",   label: "text-violet-400",   border: "border-violet-400/30"  },
};

const DEPT_META: Record<string, { icon: React.ReactNode; accent: string; bg: string }> = {
  Sound:     { icon: <Volume2 size={14} />,  accent: "#F59E0B", bg: "rgba(245,158,11,0.08)"  },
  Score:     { icon: <Music size={14} />,    accent: "#A855F7", bg: "rgba(168,85,247,0.08)"  },
  Color:     { icon: <Palette size={14} />,  accent: "#EC4899", bg: "rgba(236,72,153,0.08)"  },
  Edit:      { icon: <Scissors size={14} />, accent: "#3B82F6", bg: "rgba(59,130,246,0.08)"  },
  Animation: { icon: <Wand2 size={14} />,    accent: "#22C55E", bg: "rgba(34,197,94,0.08)"   },
  VFX:       { icon: <Zap size={14} />,      accent: "#F97316", bg: "rgba(249,115,22,0.08)"  },
};

const MEMBER_ROLES = ["viewer", "editor", "admin"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = { id: string; name: string; client: string | null; status: string; departments: string[] };
type Version = { id: string; version_name: string; department: string; drive_url: string | null; status: string; created_at: string };
type Member = { id: string; role: string | null; profiles: { id: string; full_name: string | null; email: string | null } | null };

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const style = STATUS_STYLES[status] ?? STATUS_STYLES["active"];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs tracking-widest uppercase font-medium transition-all ${style.label} ${style.border} bg-white/[0.03] hover:bg-white/[0.06]`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {status}
        <ChevronDown size={10} className="opacity-50" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-40 rounded-xl border border-white/10 bg-[#141414] shadow-2xl py-1 overflow-hidden">
          {STATUS_OPTIONS.map(s => {
            const st = STATUS_STYLES[s];
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs tracking-widest uppercase hover:bg-white/5 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                <span className={s === status ? "text-white" : "text-white/40"}>{s}</span>
                {s === status && <Check size={10} className="ml-auto text-white/40" />}
              </button>
            );
          })}
        </div>
      )}
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
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [localFiles, setLocalFiles] = useState<Version[]>(versions);

  const meta = DEPT_META[activeDept] ?? { icon: null, accent: "#6B7280", bg: "transparent" };
  const files = localFiles.filter(v => v.department === activeDept);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setAddError("");
    const res = await fetch(`/api/projects/${project.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), department: activeDept, drive_url: url.trim() || null, body: notes.trim() || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error || "Failed to add file");
      setLoading(false);
      return;
    }
    const newFile: Version = {
      id: data.id,
      version_name: data.version_name ?? title.trim(),
      department: data.department ?? activeDept,
      drive_url: data.drive_url ?? null,
      status: data.status ?? "draft",
      created_at: data.created_at ?? new Date().toISOString(),
    };
    setLocalFiles(prev => [newFile, ...prev]);
    setTitle(""); setUrl(""); setNotes(""); setAddError("");
    setLoading(false);
    setAddingFile(false);
  }

  if (depts.length === 0) {
    return <p className="text-white/20 text-sm py-20 text-center">No departments assigned to this project.</p>;
  }

  return (
    <div className="flex gap-6 min-h-[520px]">

      {/* ── Left: Department nav ── */}
      <div className="w-52 shrink-0 flex flex-col gap-1">
        <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase px-3 mb-2">Departments</p>
        {depts.map(dept => {
          const m = DEPT_META[dept] ?? { icon: null, accent: "#6B7280", bg: "transparent" };
          const count = localFiles.filter(v => v.department === dept).length;
          const active = activeDept === dept;
          return (
            <div key={dept} className="relative group/row">
              <button onClick={() => { setActiveDept(dept); setAddingFile(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${active ? "bg-white/8" : "hover:bg-white/4"}`}>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all"
                    style={{ background: active ? m.bg : "transparent", color: active ? m.accent : "rgba(255,255,255,0.25)" }}>
                    {m.icon}
                  </span>
                  <span className={`text-sm font-light transition-colors ${active ? "text-white" : "text-white/40 group-hover/row:text-white/60"}`}>
                    {dept}
                  </span>
                </div>
                {count > 0 && (
                  <span className="text-[10px] tabular-nums px-1.5 py-0.5 rounded-md bg-white/6 text-white/30">
                    {count}
                  </span>
                )}
              </button>
              {/* Review Room shortcut — appears on hover */}
              {count > 0 && (
                <a href={`/review/${project.id}?dept=${dept}`}
                  title="Open in Review Room"
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity text-white/25 hover:text-white/60 p-1">
                  <PlayCircle size={13} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Divider ── */}
      <div className="w-px bg-white/6 self-stretch" />

      {/* ── Right: File list ── */}
      <div className="flex-1 min-w-0">

        {/* Dept header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: meta.bg, color: meta.accent }}>
              {meta.icon}
            </span>
            <div>
              <h3 className="text-white text-sm font-medium">{activeDept}</h3>
              <p className="text-white/25 text-[10px]">{files.length} {files.length === 1 ? "file" : "files"}</p>
            </div>
          </div>
          <button onClick={() => setAddingFile(p => !p)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all">
            <Plus size={12} />
            Add file
          </button>
        </div>

        {/* Add file form */}
        {addingFile && (
          <form onSubmit={handleAdd} className="mb-4 p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-3">
            <input autoFocus placeholder="File name  (e.g. Score v2 — Final Mix)"
              value={title} onChange={e => setTitle(e.target.value)} required
              className="bg-transparent border-b border-white/10 pb-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/25 transition-colors w-full"
            />
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <Link size={11} className="text-white/20 shrink-0" />
              <input placeholder="Google Drive link (optional)"
                value={url} onChange={e => setUrl(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-white/20 outline-none w-full"
              />
            </div>
            {addError && <p className="text-red-400/80 text-xs">{addError}</p>}
            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={loading || !title.trim()}
                className="bg-white text-black text-xs font-medium px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-all">
                {loading ? "Adding…" : "Add file"}
              </button>
              <button type="button" onClick={() => { setAddingFile(false); setAddError(""); }}
                className="text-white/25 hover:text-white/50 text-xs transition-colors">Cancel</button>
            </div>
          </form>
        )}

        {/* File rows */}
        {files.length === 0 && !addingFile ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <FileText size={24} className="text-white/10" />
            <p className="text-white/20 text-sm">No files in {activeDept} yet</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_90px_32px] gap-4 px-3 pb-2 border-b border-white/6">
              <span className="text-[9px] tracking-[0.2em] uppercase text-white/20">File</span>
              <span className="text-[9px] tracking-[0.2em] uppercase text-white/20">Added</span>
              <span />
            </div>
            {files.map((f, i) => (
              <div key={f.id}
                className={`grid grid-cols-[1fr_90px_32px] gap-4 items-center px-3 py-3.5 group hover:bg-white/[0.03] rounded-lg transition-colors ${i < files.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                <div className="min-w-0">
                  <p className="text-white/80 text-sm truncate">{f.version_name}</p>
                  <p className="text-white/25 text-xs mt-0.5 capitalize">{f.status}</p>
                </div>
                <span className="text-white/25 text-xs">
                  {new Date(f.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                <div className="flex justify-end">
                  {f.drive_url ? (
                    <a href={f.drive_url} target="_blank" rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-all">
                      <ExternalLink size={13} />
                    </a>
                  ) : <span />}
                </div>
              </div>
            ))}
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to add member"); }
    else {
      if (data.member) setLocalMembers(prev => [...prev, data.member]);
      setEmail(""); setAdding(false);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase">Team Members</p>
        <button onClick={() => setAdding(p => !p)}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all">
          <Plus size={12} />
          Add member
        </button>
      </div>

      {/* Invite form */}
      {adding && (
        <form onSubmit={handleInvite} className="mb-5 p-4 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-3">
          <input autoFocus type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)} required
            className="bg-transparent border-b border-white/10 pb-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/25 transition-colors w-full"
          />
          <div className="flex items-center gap-2">
            {MEMBER_ROLES.map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all border ${role === r ? "bg-white text-black border-white" : "border-white/10 text-white/35 hover:border-white/20 hover:text-white/55"}`}>
                {r}
              </button>
            ))}
          </div>
          {error && <p className="text-red-400/80 text-xs">{error}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading || !email.trim()}
              className="bg-white text-black text-xs font-medium px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-all">
              {loading ? "Adding…" : "Add member"}
            </button>
            <button type="button" onClick={() => setAdding(false)}
              className="text-white/25 hover:text-white/50 text-xs transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Member list */}
      {localMembers.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <Users size={24} className="text-white/10" />
          <p className="text-white/20 text-sm">No team members yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {localMembers.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-white/[0.03] transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-xs text-white/50 font-medium">
                  {(m.profiles?.full_name || m.profiles?.email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-white/80 text-sm">{m.profiles?.full_name || m.profiles?.email || "Unknown"}</p>
                  {m.profiles?.full_name && <p className="text-white/25 text-xs">{m.profiles.email}</p>}
                </div>
              </div>
              <span className="text-[10px] tracking-widest uppercase text-white/25 border border-white/8 px-2.5 py-1 rounded-full">
                {m.role || "viewer"}
              </span>
            </div>
          ))}
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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), client: client.trim() }),
    });
    if (res.ok) {
      onProjectUpdate({ name: name.trim(), client: client.trim() || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    window.location.href = "/dashboard";
  }

  return (
    <div className="max-w-md flex flex-col gap-8">

      {/* General */}
      <div>
        <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-5">General</p>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="text-white/30 text-xs mb-1.5 block">Project name</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <div>
            <label className="text-white/30 text-xs mb-1.5 block">Client name</label>
            <input value={client} onChange={e => setClient(e.target.value)} placeholder="Optional"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <button type="submit" disabled={saving}
            className="self-start flex items-center gap-2 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-40 transition-all">
            {saved ? <><Check size={12} /> Saved</> : saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="border-t border-white/6 pt-8">
        <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-5">Danger Zone</p>
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/15 bg-red-500/[0.03]">
          <div>
            <p className="text-white/70 text-sm">Delete this project</p>
            <p className="text-white/25 text-xs mt-0.5">Permanently removes all files and data</p>
          </div>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1.5 text-red-400/80 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-40">
            <Trash2 size={12} />
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

  async function updateStatus(s: string) {
    setStatus(s);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
  }

  function handleProjectUpdate(updates: Partial<Project>) {
    setProject(prev => ({ ...prev, ...updates }));
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "files",    label: "Files & Versions", icon: <FileText size={13} /> },
    { id: "timeline", label: "Timeline",         icon: <Calendar size={13} /> },
    { id: "team",     label: "Team",              icon: <Users size={13} /> },
    { id: "settings", label: "Settings",          icon: <Settings size={13} /> },
  ];

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar active="dashboard" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-10 py-10">

          {/* Back */}
          <a href="/dashboard"
            className="inline-flex items-center gap-1.5 text-white/20 hover:text-white/50 text-[10px] tracking-[0.25em] uppercase transition-colors mb-10">
            <ArrowLeft size={11} /> Dashboard
          </a>

          {/* ── Project Header ── */}
          <div className="flex items-start justify-between mb-10">
            <div>
              {project.client && (
                <p className="text-white/25 text-[10px] tracking-[0.3em] uppercase mb-1.5">{project.client}</p>
              )}
              <h1 className="text-white text-3xl font-light tracking-wide">{project.name}</h1>

              {/* Department pills */}
              {project.departments.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {project.departments.map(d => {
                    const m = DEPT_META[d];
                    return (
                      <span key={d} className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border"
                        style={{ color: m?.accent ?? "#9ca3af", borderColor: (m?.accent ?? "#9ca3af") + "30", background: m?.bg ?? "transparent" }}>
                        {m?.icon}
                        {d}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <a href={`/review/${project.id}`}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 px-3.5 py-2 rounded-xl transition-all">
                <PlayCircle size={13} />
                Review Room
              </a>
              <StatusBadge status={status} onChange={updateStatus} />
            </div>
          </div>

          {/* ── Tab Bar ── */}
          <div className="flex items-center gap-1 mb-8 border-b border-white/6 pb-0">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs tracking-wide transition-all relative -mb-px border-b-2 ${
                  activeTab === tab.id
                    ? "text-white border-white"
                    : "text-white/30 border-transparent hover:text-white/55"
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          <div className="pt-2">
            {activeTab === "files" && (
              <FilesTab project={project} versions={versions} />
            )}
            {activeTab === "timeline" && (
              <Timeline project={project} initialMilestones={milestones} />
            )}
            {activeTab === "team" && (
              <TeamTab project={project} members={members} />
            )}
            {activeTab === "settings" && (
              <SettingsTab project={project} onProjectUpdate={handleProjectUpdate} />
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
