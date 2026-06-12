"use client";
import { useState } from "react";
import {
  Check, LogOut, Music, Palette, Scissors, Wand2, Zap, Volume2,
  FileText, MessageSquare, FolderOpen, Clock, ChevronRight,
  Eye, Edit3, Shield, AlertTriangle, KeyRound,
} from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";

// ─── Types ───────────────────────────────────────────────────────────────────

type Profile = { id: string; full_name: string | null; email: string | null; company: string | null };
type Project = { id: string; name: string; client: string | null; status: string; departments: string[]; created_at: string; updated_at: string };
type MemberRow = { project_id: string; role: string | null; department: string | null };
type Stats = { projects: number; comments: number; files: number };
type RecentComment = { id: string; body: string; created_at: string; project_id: string; timecode: number | null; projectName: string };
type RecentFile = { id: string; version_name: string; department: string; created_at: string; project_id: string; projectName: string };

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  "active":    { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/10" },
  "in review": { dot: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-400/10"   },
  "ready":     { dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-400/10"    },
  "paused":    { dot: "bg-zinc-500",    text: "text-zinc-400",    bg: "bg-zinc-400/10"    },
  "delivered": { dot: "bg-violet-400",  text: "text-violet-400",  bg: "bg-violet-400/10"  },
};

const DEPT_META: Record<string, { icon: React.ReactNode; accent: string; bg: string }> = {
  Sound:     { icon: <Volume2 size={11} />,  accent: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  Score:     { icon: <Music size={11} />,    accent: "#A855F7", bg: "rgba(168,85,247,0.1)"  },
  Color:     { icon: <Palette size={11} />,  accent: "#EC4899", bg: "rgba(236,72,153,0.1)"  },
  Edit:      { icon: <Scissors size={11} />, accent: "#3B82F6", bg: "rgba(59,130,246,0.1)"  },
  Animation: { icon: <Wand2 size={11} />,    accent: "#22C55E", bg: "rgba(34,197,94,0.1)"   },
  VFX:       { icon: <Zap size={11} />,      accent: "#F97316", bg: "rgba(249,115,22,0.1)"  },
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin:  <Shield size={10} />,
  editor: <Edit3 size={10} />,
  viewer: <Eye size={10} />,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtTimecode(sec: number | null): string {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5 py-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <span className="text-white/20">{icon}</span>
      <p className="text-white text-2xl font-light tabular-nums">{value}</p>
      <p className="text-white/25 text-[10px] tracking-widest uppercase">{label}</p>
    </div>
  );
}

function ProjectCard({ project, role, isOwner }: { project: Project; role?: string | null; isOwner?: boolean }) {
  const st = STATUS_STYLES[project.status] ?? STATUS_STYLES["paused"];
  const depts = project.departments ?? [];
  const lastUpdated = timeAgo(project.updated_at);

  return (
    <a href={`/project/${project.id}`}
      className="group flex flex-col gap-3 p-4 rounded-2xl border border-white/[0.06] hover:border-white/12 bg-white/[0.02] hover:bg-white/[0.04] transition-all">

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-white/80 text-sm font-medium group-hover:text-white transition-colors truncate">
            {project.name}
          </p>
          {project.client && (
            <p className="text-white/25 text-xs mt-0.5">{project.client}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && (
            <span className="text-[9px] tracking-widest uppercase text-white/20 border border-white/8 px-2 py-0.5 rounded-full">
              Owner
            </span>
          )}
          {role && !isOwner && (
            <span className="flex items-center gap-1 text-[9px] tracking-widest uppercase text-white/20 border border-white/8 px-2 py-0.5 rounded-full">
              {ROLE_ICONS[role] ?? null} {role}
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full ${st.text} ${st.bg}`}>
            <span className={`w-1 h-1 rounded-full ${st.dot}`} />
            {project.status}
          </span>
        </div>
      </div>

      {/* Department pills */}
      {depts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {depts.map(d => {
            const m = DEPT_META[d];
            return m ? (
              <span key={d}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border"
                style={{ color: m.accent, borderColor: m.accent + "30", background: m.bg }}>
                {m.icon} {d}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-white/15 text-[10px]">Updated {lastUpdated}</span>
        <ChevronRight size={12} className="text-white/15 group-hover:text-white/40 transition-colors" />
      </div>
    </a>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "projects" | "security";

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MemberClient({ user, profile: initialProfile, ownedProjects, memberProjects, memberRows, stats, recentComments, recentFiles }: {
  user: { id: string; email: string };
  profile: Profile;
  ownedProjects: Project[];
  memberProjects: Project[];
  memberRows: MemberRow[];
  stats: Stats;
  recentComments: RecentComment[];
  recentFiles: RecentFile[];
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [tab, setTab] = useState<Tab>("overview");

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(initialProfile.full_name ?? "");
  const [company, setCompany] = useState(initialProfile.company ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const displayName = profile.full_name || user.email.split("@")[0];
  const avatarInitials = initials(displayName);

  function getMemberRole(projectId: string) {
    return memberRows.find(r => r.project_id === projectId)?.role ?? null;
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName.trim(), company: company.trim() }),
    });
    if (res.ok) {
      setProfile(p => ({ ...p, full_name: fullName.trim() || null, company: company.trim() || null }));
      setSaved(true); setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg({ type: "err", text: "Passwords don't match" }); return; }
    if (newPw.length < 6) { setPwMsg({ type: "err", text: "Password must be at least 6 characters" }); return; }
    setPwSaving(true); setPwMsg(null);
    const res = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPw }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwMsg({ type: "ok", text: "Password updated successfully" });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } else {
      setPwMsg({ type: "err", text: data.error || "Failed to update password" });
    }
    setPwSaving(false);
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  const allActivity = [
    ...recentComments.map(c => ({ type: "comment" as const, id: c.id, text: c.body, sub: c.timecode != null ? `at ${fmtTimecode(c.timecode)}` : "", project: c.projectName, projectId: c.project_id, date: c.created_at })),
    ...recentFiles.map(f => ({ type: "file" as const, id: f.id, text: f.version_name, sub: f.department, project: f.projectName, projectId: f.project_id, date: f.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "projects", label: `Projects (${stats.projects})` },
    { id: "security", label: "Security" },
  ];

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar active="member" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-12">

          {/* ── Profile Header ── */}
          <div className="flex items-start gap-5 mb-10">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center text-xl text-white/50 font-light shrink-0">
              {avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase mb-1">Account</p>
              <h1 className="text-white text-2xl font-light tracking-wide">{displayName}</h1>
              <p className="text-white/30 text-sm">{user.email}</p>
              {profile.company && <p className="text-white/20 text-xs mt-0.5">{profile.company}</p>}
            </div>
            <button onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-white/20 hover:text-white/50 border border-white/8 hover:border-white/15 px-3 py-2 rounded-xl transition-all">
              <LogOut size={12} /> Sign out
            </button>
          </div>

          {/* ── Stats ── */}
          <div className="flex gap-3 mb-10">
            <StatCard icon={<FolderOpen size={16} />} label="Projects" value={stats.projects} />
            <StatCard icon={<FileText size={16} />}   label="Files Added" value={stats.files} />
            <StatCard icon={<MessageSquare size={16} />} label="Notes Posted" value={stats.comments} />
          </div>

          {/* ── Tab Bar ── */}
          <div className="flex gap-1 mb-8 border-b border-white/6 pb-0">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-xs tracking-wide transition-all relative -mb-px border-b-2 ${
                  tab === t.id ? "text-white border-white" : "text-white/30 border-transparent hover:text-white/55"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ══ OVERVIEW TAB ══ */}
          {tab === "overview" && (
            <div className="flex flex-col gap-8">

              {/* Profile info */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase">Profile Info</p>
                  {!editing && (
                    <button onClick={() => setEditing(true)}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors">Edit</button>
                  )}
                </div>

                {editing ? (
                  <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
                    {[
                      { label: "Full name", value: fullName, set: setFullName, placeholder: "Your name" },
                      { label: "Company / Studio", value: company, set: setCompany, placeholder: "e.g. MixLabs Creative" },
                    ].map(({ label, value, set, placeholder }) => (
                      <div key={label}>
                        <label className="text-white/25 text-xs mb-1.5 block">{label}</label>
                        <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
                      </div>
                    ))}
                    <div>
                      <label className="text-white/25 text-xs mb-1.5 block">Email</label>
                      <input value={user.email} disabled
                        className="w-full bg-white/[0.02] border border-white/6 rounded-xl px-4 py-3 text-sm text-white/25 outline-none cursor-not-allowed" />
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button type="submit" disabled={saving}
                        className="flex items-center gap-2 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-40 transition-all">
                        {saved ? <><Check size={12} /> Saved</> : saving ? "Saving…" : "Save changes"}
                      </button>
                      <button type="button"
                        onClick={() => { setEditing(false); setFullName(profile.full_name ?? ""); setCompany(profile.company ?? ""); }}
                        className="text-white/25 hover:text-white/50 text-xs transition-colors">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-2">
                    {[
                      { label: "Name",    value: profile.full_name || "—" },
                      { label: "Company", value: profile.company    || "—" },
                      { label: "Email",   value: user.email },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <span className="text-white/30 text-xs w-24">{label}</span>
                        <span className="text-white/70 text-sm">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent activity */}
              <section>
                <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-4">Recent Activity</p>
                {allActivity.length === 0 ? (
                  <p className="text-white/15 text-sm py-8 text-center">No activity yet.</p>
                ) : (
                  <div className="flex flex-col">
                    {allActivity.map((item, i) => (
                      <a key={item.id} href={item.type === "comment" ? `/review/${item.projectId}` : `/project/${item.projectId}`}
                        className={`flex items-start gap-3 py-3 hover:bg-white/[0.03] px-2 -mx-2 rounded-xl transition-colors group ${i < allActivity.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                        <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${item.type === "comment" ? "bg-violet-400/10" : "bg-blue-400/10"}`}>
                          {item.type === "comment"
                            ? <MessageSquare size={12} className="text-violet-400/70" />
                            : <FileText size={12} className="text-blue-400/70" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/70 text-sm truncate group-hover:text-white/90 transition-colors">{item.text}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-white/25 text-xs truncate">{item.project}</span>
                            {item.sub && <>
                              <span className="text-white/15 text-xs">·</span>
                              <span className="text-white/20 text-xs font-mono">{item.sub}</span>
                            </>}
                          </div>
                        </div>
                        <span className="text-white/20 text-[10px] shrink-0 mt-0.5">{timeAgo(item.date)}</span>
                      </a>
                    ))}
                  </div>
                )}
              </section>

            </div>
          )}

          {/* ══ PROJECTS TAB ══ */}
          {tab === "projects" && (
            <div className="flex flex-col gap-8">
              {ownedProjects.length > 0 && (
                <section>
                  <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-4">
                    Owned <span className="ml-1.5 text-white/15">{ownedProjects.length}</span>
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {ownedProjects.map(p => <ProjectCard key={p.id} project={p} isOwner />)}
                  </div>
                </section>
              )}
              {memberProjects.length > 0 && (
                <section>
                  <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-4">
                    Shared With Me <span className="ml-1.5 text-white/15">{memberProjects.length}</span>
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {memberProjects.map(p => <ProjectCard key={p.id} project={p} role={getMemberRole(p.id)} />)}
                  </div>
                </section>
              )}
              {ownedProjects.length === 0 && memberProjects.length === 0 && (
                <p className="text-white/15 text-sm py-16 text-center">No projects yet.</p>
              )}
            </div>
          )}

          {/* ══ SECURITY TAB ══ */}
          {tab === "security" && (
            <div className="flex flex-col gap-8">

              {/* Change password */}
              <section>
                <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-5">Change Password</p>
                <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
                  {[
                    { label: "New password", value: newPw, set: setNewPw, placeholder: "Min. 6 characters" },
                    { label: "Confirm password", value: confirmPw, set: setConfirmPw, placeholder: "Repeat new password" },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label}>
                      <label className="text-white/25 text-xs mb-1.5 block">{label}</label>
                      <input type="password" value={value} onChange={e => set(e.target.value)} placeholder={placeholder} required
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
                    </div>
                  ))}
                  {pwMsg && (
                    <p className={`text-xs ${pwMsg.type === "ok" ? "text-emerald-400/80" : "text-red-400/80"}`}>
                      {pwMsg.text}
                    </p>
                  )}
                  <button type="submit" disabled={pwSaving || !newPw || !confirmPw}
                    className="self-start flex items-center gap-2 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-40 transition-all">
                    <KeyRound size={12} />
                    {pwSaving ? "Updating…" : "Update password"}
                  </button>
                </form>
              </section>

              {/* Account info */}
              <section>
                <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-4">Account</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-white/30 text-xs">User ID</span>
                    <span className="text-white/30 text-xs font-mono">{user.id.slice(0, 8)}…</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-white/30 text-xs">Email</span>
                    <span className="text-white/50 text-sm">{user.email}</span>
                  </div>
                </div>
              </section>

              {/* Danger zone */}
              <section className="border-t border-white/6 pt-8">
                <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-4">Danger Zone</p>
                <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/15 bg-red-500/[0.03]">
                  <div>
                    <p className="text-white/60 text-sm">Sign out of all devices</p>
                    <p className="text-white/25 text-xs mt-0.5">Revokes all active sessions</p>
                  </div>
                  <button onClick={signOut}
                    className="flex items-center gap-1.5 text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 px-3 py-2 rounded-lg text-xs transition-all">
                    <LogOut size={12} /> Sign out
                  </button>
                </div>
              </section>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
