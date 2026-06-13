"use client";
import { useState, useMemo } from "react";
import {
  Check, LogOut, Music, Palette, Scissors, Wand2, Zap, Volume2,
  FileText, MessageSquare, FolderOpen, ChevronRight,
  Eye, Edit3, Shield, KeyRound, User, Activity,
  Layers, Crown, Lock, AlertCircle, Copy,
  Briefcase, Mail, Mic, Film, Sliders, Clapperboard,
  MonitorPlay, Sparkles, Headphones, Radio, Star,
} from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile  = { id: string; full_name: string | null; email: string | null; company: string | null; profession: string | null };
type Project  = { id: string; name: string; client: string | null; status: string; departments: string[]; created_at: string; updated_at: string };
type MemberRow = { project_id: string; role: string | null; department: string | null };
type Stats    = { projects: number; comments: number; files: number };
type RecentComment = { id: string; body: string; created_at: string; project_id: string; timecode: number | null; projectName: string };
type RecentFile    = { id: string; version_name: string; department: string; created_at: string; project_id: string; projectName: string };

type Section = "overview" | "projects" | "activity" | "profile" | "security";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { dot: string; text: string; border: string; bg: string }> = {
  "active":    { dot: "bg-emerald-400", text: "text-emerald-400", border: "border-emerald-400/25", bg: "bg-emerald-400/8"  },
  "in review": { dot: "bg-amber-400",   text: "text-amber-400",   border: "border-amber-400/25",   bg: "bg-amber-400/8"    },
  "ready":     { dot: "bg-blue-400",    text: "text-blue-400",    border: "border-blue-400/25",    bg: "bg-blue-400/8"     },
  "paused":    { dot: "bg-zinc-500",    text: "text-zinc-400",    border: "border-zinc-600",       bg: "bg-zinc-400/8"     },
  "delivered": { dot: "bg-violet-400",  text: "text-violet-400",  border: "border-violet-400/25",  bg: "bg-violet-400/8"   },
};

const DEPT_META: Record<string, { icon: React.ReactNode; accent: string; bg: string; hex: string }> = {
  Sound:     { icon: <Volume2 size={11}/>,  accent: "#F59E0B", bg: "rgba(245,158,11,0.08)",  hex: "#F59E0B" },
  Score:     { icon: <Music size={11}/>,    accent: "#A855F7", bg: "rgba(168,85,247,0.08)",  hex: "#A855F7" },
  Color:     { icon: <Palette size={11}/>,  accent: "#EC4899", bg: "rgba(236,72,153,0.08)",  hex: "#EC4899" },
  Edit:      { icon: <Scissors size={11}/>, accent: "#3B82F6", bg: "rgba(59,130,246,0.08)",  hex: "#3B82F6" },
  Animation: { icon: <Wand2 size={11}/>,    accent: "#22C55E", bg: "rgba(34,197,94,0.08)",   hex: "#22C55E" },
  VFX:       { icon: <Zap size={11}/>,      accent: "#F97316", bg: "rgba(249,115,22,0.08)",  hex: "#F97316" },
};

const ROLE_META: Record<string, { icon: React.ReactNode; label: string; color: string; border: string; bg: string }> = {
  owner:  { icon: <Crown size={10}/>,    label: "Owner",  color: "text-amber-300",  border: "border-amber-400/22",  bg: "bg-amber-500/7"  },
  admin:  { icon: <Shield size={10}/>,   label: "Admin",  color: "text-violet-300", border: "border-violet-400/22", bg: "bg-violet-500/7" },
  editor: { icon: <Edit3 size={10}/>,    label: "Editor", color: "text-blue-300",   border: "border-blue-400/22",   bg: "bg-blue-500/7"   },
  viewer: { icon: <Eye size={10}/>,      label: "Viewer", color: "text-white/35",   border: "border-white/10",      bg: "bg-white/3"      },
};

const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#f97316","#14b8a6",
];

type ProfessionDef = { label: string; icon: React.ReactNode; accent: string; category: string };
const PROFESSIONS: ProfessionDef[] = [
  // Direction & Production
  { label: "Director",               icon: <Clapperboard size={14}/>,  accent: "#f43f5e", category: "Direction" },
  { label: "Producer",               icon: <Star size={14}/>,          accent: "#f59e0b", category: "Direction" },
  { label: "Executive Producer",     icon: <Crown size={14}/>,         accent: "#f59e0b", category: "Direction" },
  { label: "Post Production Supervisor", icon: <MonitorPlay size={14}/>, accent: "#f97316", category: "Direction" },
  // Music
  { label: "Composer",               icon: <Music size={14}/>,         accent: "#a855f7", category: "Music"     },
  { label: "Music Editor",           icon: <Scissors size={14}/>,      accent: "#a855f7", category: "Music"     },
  { label: "Music Supervisor",       icon: <Headphones size={14}/>,    accent: "#8b5cf6", category: "Music"     },
  // Sound
  { label: "Sound Designer",        icon: <Wand2 size={14}/>,          accent: "#f59e0b", category: "Sound"     },
  { label: "Re-recording Mixer",    icon: <Sliders size={14}/>,        accent: "#f59e0b", category: "Sound"     },
  { label: "Supervising Sound Editor", icon: <Volume2 size={14}/>,     accent: "#f59e0b", category: "Sound"     },
  { label: "Foley Artist",          icon: <Radio size={14}/>,           accent: "#fbbf24", category: "Sound"     },
  { label: "ADR / Voice Artist",    icon: <Mic size={14}/>,            accent: "#fbbf24", category: "Sound"     },
  // Picture
  { label: "Video Editor",          icon: <Film size={14}/>,            accent: "#3b82f6", category: "Picture"  },
  { label: "Colorist",              icon: <Palette size={14}/>,         accent: "#ec4899", category: "Picture"  },
  { label: "VFX Artist",            icon: <Zap size={14}/>,             accent: "#f97316", category: "Picture"  },
  { label: "Motion Designer",       icon: <Sparkles size={14}/>,        accent: "#22c55e", category: "Picture"  },
  // Other
  { label: "Client",                icon: <Briefcase size={14}/>,       accent: "#94a3b8", category: "Other"    },
  { label: "Agency",                icon: <User size={14}/>,            accent: "#94a3b8", category: "Other"    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtTimecode(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() || "?";
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const col = avatarColor(name);
  return (
    <div className="rounded-2xl flex items-center justify-center font-medium text-white shrink-0"
      style={{ width: size, height: size, background: col + "25", border: `1.5px solid ${col}35`, color: col, fontSize: size * 0.35 }}>
      {initials(name)}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, role, isOwner }: { project: Project; role?: string | null; isOwner?: boolean }) {
  const st    = STATUS_STYLES[project.status] ?? STATUS_STYLES["paused"];
  const depts = project.departments ?? [];
  const rm    = isOwner ? ROLE_META["owner"] : ROLE_META[role ?? "viewer"] ?? ROLE_META["viewer"];

  return (
    <a href={`/project/${project.id}`}
      className="group flex items-center gap-4 px-4 py-4 rounded-2xl border border-white/[0.05] hover:border-white/12 bg-white/[0.015] hover:bg-white/[0.03] transition-all">

      {/* Dept stack */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.04] relative overflow-hidden">
        {depts[0] ? (
          <span style={{ color: DEPT_META[depts[0]]?.accent ?? "#9ca3af" }}>
            {DEPT_META[depts[0]]?.icon}
          </span>
        ) : <FolderOpen size={14} className="text-white/20"/>}
        {depts.length > 1 && (
          <span className="absolute bottom-0.5 right-0.5 text-[8px] text-white/25 font-light">+{depts.length - 1}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white/75 text-[13px] font-light truncate group-hover:text-white/90 transition-colors">{project.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {project.client && <span className="text-white/22 text-[10px] font-light">{project.client}</span>}
          {project.client && depts.length > 0 && <span className="text-white/12 text-[9px]">·</span>}
          {depts.slice(0,3).map(d => (
            <span key={d} className="text-[9px] font-light" style={{ color: DEPT_META[d]?.accent + "80" }}>{d}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full border font-light ${rm.color} ${rm.border} ${rm.bg}`}>
          {rm.icon}{rm.label}
        </span>
        <span className={`flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-full border font-light ${st.text} ${st.border} ${st.bg}`}>
          <span className={`w-1 h-1 rounded-full ${st.dot}`}/>{project.status}
        </span>
        <span className="text-white/18 text-[10px] font-light w-14 text-right">{timeAgo(project.updated_at)}</span>
        <ChevronRight size={11} className="text-white/15 group-hover:text-white/40 transition-colors"/>
      </div>
    </a>
  );
}

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
  const [profile, setProfile]   = useState(initialProfile);
  const [section, setSection]   = useState<Section>("overview");

  // Profile edit
  const [fullName,   setFullName]   = useState(initialProfile.full_name ?? "");
  const [company,    setCompany]    = useState(initialProfile.company ?? "");
  const [profession, setProfession] = useState(initialProfile.profession ?? "");
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  // Password
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMsg,     setPwMsg]     = useState<{ type: "ok"|"err"; text: string } | null>(null);

  // Copy
  const [copied, setCopied] = useState(false);

  const displayName = profile.full_name || user.email.split("@")[0];
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const col = avatarColor(displayName);

  function getMemberRole(pid: string) {
    return memberRows.find(r => r.project_id === pid)?.role ?? null;
  }

  const allActivity = useMemo(() => [
    ...recentComments.map(c => ({ type: "comment" as const, id: c.id, text: c.body, sub: c.timecode != null ? `at ${fmtTimecode(c.timecode)}` : "", project: c.projectName, projectId: c.project_id, date: c.created_at })),
    ...recentFiles.map(f => ({ type: "file" as const, id: f.id, text: f.version_name, sub: f.department, project: f.projectName, projectId: f.project_id, date: f.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [recentComments, recentFiles]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName.trim(), company: company.trim(), profession: profession.trim() }),
    });
    if (res.ok) {
      setProfile(p => ({ ...p, full_name: fullName.trim() || null, company: company.trim() || null, profession: profession.trim() || null }));
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg({ type: "err", text: "Passwords don't match" }); return; }
    if (newPw.length < 6)    { setPwMsg({ type: "err", text: "Minimum 6 characters" }); return; }
    setPwSaving(true); setPwMsg(null);
    const res = await fetch("/api/profile/password", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPw }),
    });
    const data = await res.json();
    setPwMsg(res.ok ? { type: "ok", text: "Password updated" } : { type: "err", text: data.error || "Failed" });
    if (res.ok) { setNewPw(""); setConfirmPw(""); }
    setPwSaving(false);
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  function copyUserId() {
    navigator.clipboard.writeText(user.id);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "overview",  label: "Overview",  icon: <Layers size={13}/>    },
    { id: "projects",  label: "Projects",  icon: <FolderOpen size={13}/> },
    { id: "activity",  label: "Activity",  icon: <Activity size={13}/>  },
    { id: "profile",   label: "Profile",   icon: <User size={13}/>      },
    { id: "security",  label: "Security",  icon: <Lock size={13}/>      },
  ];

  const allProjects = [...ownedProjects, ...memberProjects];

  return (
    <div className="flex bg-[#0A0A0A] overflow-hidden" style={{ height: '100dvh' }}>
      <Sidebar active="member" userName={displayName} userInitials={initials} />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Fixed Header ── */}
        <div className="shrink-0 border-b border-white/[0.04]">
          <div className="px-4 md:px-9 py-4 md:py-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar name={displayName} size={40}/>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-white/82 text-base md:text-lg font-light tracking-wide truncate">{displayName}</h1>
                  {profile.profession && (() => {
                    const pd = PROFESSIONS.find(p => p.label === profile.profession);
                    return (
                      <span className="hidden sm:flex items-center gap-1 text-[9px] px-2 py-1 rounded-full border font-light shrink-0"
                        style={{ color: pd?.accent ?? "#94a3b8", borderColor: (pd?.accent ?? "#94a3b8") + "30", background: (pd?.accent ?? "#94a3b8") + "10" }}>
                        {pd?.icon}
                        {profile.profession}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white/28 text-xs font-light truncate">{user.email}</span>
                  {profile.company && (
                    <span className="hidden sm:inline text-white/22 text-xs font-light">· {profile.company}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats inline — hide on very small screens */}
            <div className="flex items-center gap-3 md:gap-6 shrink-0">
              {[
                { icon: <FolderOpen size={13}/>, value: stats.projects, label: "projects" },
                { icon: <FileText size={13}/>,   value: stats.files,    label: "files"    },
                { icon: <MessageSquare size={13}/>, value: stats.comments, label: "notes"  },
              ].map((s, i) => (
                <div key={s.label} className={`flex items-center gap-1.5 text-right ${i > 0 ? 'hidden sm:flex' : ''}`}>
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center bg-white/[0.04] text-white/25">{s.icon}</div>
                  <div>
                    <p className="text-white/70 text-sm font-light leading-none tabular-nums">{s.value}</p>
                    <p className="text-white/20 text-[9px] font-light mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}

              <div className="w-px h-8 bg-white/[0.06]"/>

              <button onClick={signOut}
                className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/55 border border-white/8 hover:border-white/16 px-3 py-2 rounded-xl transition-all font-light">
                <LogOut size={11}/> Sign out
              </button>
            </div>
          </div>

          {/* Tab nav */}
          <div className="flex items-center gap-0 px-4 md:px-9 overflow-x-auto scrollbar-hide">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setSection(n.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[11px] tracking-wide transition-all -mb-px border-b-2 font-light ${
                  section === n.id ? "text-white/80 border-white/45" : "text-white/24 border-transparent hover:text-white/50"
                }`}>
                {n.icon}{n.label}
                {n.id === "projects" && stats.projects > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${section === "projects" ? "bg-white/10 text-white/50" : "bg-white/5 text-white/20"}`}>
                    {stats.projects}
                  </span>
                )}
                {n.id === "activity" && allActivity.length > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${section === "activity" ? "bg-white/10 text-white/50" : "bg-white/5 text-white/20"}`}>
                    {allActivity.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 md:px-9 py-5 md:py-7 pb-28 md:pb-7">

          {/* ══ OVERVIEW ══ */}
          {section === "overview" && (
            <div className="flex gap-8">
              {/* Left — main content */}
              <div className="flex-1 min-w-0 flex flex-col gap-6">

                {/* Active projects */}
                <div>
                  <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-3 font-light">Active Projects</p>
                  {allProjects.filter(p => p.status !== "delivered" && p.status !== "paused").length === 0 ? (
                    <div className="flex items-center justify-center py-10 border border-dashed border-white/[0.05] rounded-2xl">
                      <p className="text-white/18 text-sm font-light">No active projects</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {allProjects.filter(p => p.status !== "delivered" && p.status !== "paused").slice(0,5).map(p => (
                        <ProjectCard key={p.id} project={p}
                          isOwner={ownedProjects.some(o => o.id === p.id)}
                          role={getMemberRole(p.id)}/>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent activity preview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase font-light">Recent Activity</p>
                    <button onClick={() => setSection("activity")}
                      className="text-[10px] text-white/22 hover:text-white/50 font-light transition-colors flex items-center gap-1">
                      See all <ChevronRight size={10}/>
                    </button>
                  </div>
                  {allActivity.length === 0 ? (
                    <p className="text-white/16 text-sm py-6 text-center font-light">No activity yet</p>
                  ) : (
                    <div className="flex flex-col gap-0">
                      {allActivity.slice(0,5).map((item, i) => (
                        <a key={item.id} href={item.type === "comment" ? `/review/${item.projectId}` : `/project/${item.projectId}`}
                          className={`flex items-start gap-3 py-3 hover:bg-white/[0.025] px-3 -mx-3 rounded-xl transition-colors group ${i < Math.min(allActivity.length,5) - 1 ? "border-b border-white/[0.03]" : ""}`}>
                          <div className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${item.type === "comment" ? "bg-violet-500/10" : "bg-blue-500/10"}`}>
                            {item.type === "comment"
                              ? <MessageSquare size={11} className="text-violet-400/70"/>
                              : <FileText size={11} className="text-blue-400/70"/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/60 text-[13px] font-light truncate group-hover:text-white/80 transition-colors">{item.text}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-white/22 text-[10px] font-light truncate">{item.project}</span>
                              {item.sub && <><span className="text-white/12 text-[9px]">·</span><span className="text-white/18 text-[10px] font-light">{item.sub}</span></>}
                            </div>
                          </div>
                          <span className="text-white/18 text-[10px] font-light shrink-0 mt-0.5">{timeAgo(item.date)}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right sidebar */}
              <div className="w-60 shrink-0 flex flex-col gap-4">

                {/* Identity card */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
                  <p className="text-white/18 text-[9px] tracking-[0.2em] uppercase font-light mb-3">Identity</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { icon: <User size={11}/>,     label: "Name",    value: profile.full_name || "—" },
                      { icon: <Mail size={11}/>,     label: "Email",   value: user.email },
                      { icon: <Briefcase size={11}/>,label: "Company", value: profile.company || "—" },
                      { icon: <Star size={11}/>,     label: "Role",    value: profile.profession || "—" },
                    ].map(r => (
                      <div key={r.label} className="flex items-center gap-2.5 py-1.5">
                        <span className="text-white/22 shrink-0">{r.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/18 text-[9px] font-light">{r.label}</p>
                          <p className="text-white/58 text-[11px] font-light truncate">{r.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setSection("profile")}
                    className="mt-3 w-full py-2 rounded-xl border border-white/7 text-[10px] text-white/28 hover:text-white/55 hover:border-white/15 transition-all font-light">
                    Edit profile
                  </button>
                </div>

                {/* Project breakdown */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
                  <p className="text-white/18 text-[9px] tracking-[0.2em] uppercase font-light mb-3">My Projects</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/30 text-[11px] font-light flex items-center gap-1.5"><Crown size={10} className="text-amber-400/50"/> Owned</span>
                      <span className="text-white/60 text-sm font-light tabular-nums">{ownedProjects.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/30 text-[11px] font-light flex items-center gap-1.5"><User size={10} className="text-blue-400/50"/> Shared</span>
                      <span className="text-white/60 text-sm font-light tabular-nums">{memberProjects.length}</span>
                    </div>
                    <div className="h-px bg-white/[0.04] my-1"/>
                    {(["active","in review","delivered"] as const).map(s => {
                      const cnt = allProjects.filter(p => p.status === s).length;
                      if (!cnt) return null;
                      const st = STATUS_STYLES[s];
                      return (
                        <div key={s} className="flex items-center justify-between">
                          <span className={`text-[10px] font-light flex items-center gap-1.5 ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{s}
                          </span>
                          <span className="text-white/40 text-[11px] font-light tabular-nums">{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Departments across all projects */}
                {allProjects.length > 0 && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
                    <p className="text-white/18 text-[9px] tracking-[0.2em] uppercase font-light mb-3">Departments</p>
                    <div className="flex flex-col gap-1.5">
                      {Object.keys(DEPT_META).map(d => {
                        const cnt = allProjects.filter(p => p.departments?.includes(d)).length;
                        if (!cnt) return null;
                        const m = DEPT_META[d];
                        return (
                          <div key={d} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ background: m.bg, color: m.accent }}>{m.icon}</span>
                            <span className="text-white/45 text-[11px] font-light flex-1">{d}</span>
                            <span className="text-white/22 text-[10px] font-light">{cnt} proj</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ══ PROJECTS ══ */}
          {section === "projects" && (
            <div className="max-w-3xl flex flex-col gap-8">
              {ownedProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown size={11} className="text-amber-400/50"/>
                    <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase font-light">Owned</p>
                    <span className="text-white/15 text-[9px] font-light ml-1">{ownedProjects.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {ownedProjects.map(p => <ProjectCard key={p.id} project={p} isOwner/>)}
                  </div>
                </div>
              )}
              {memberProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User size={11} className="text-blue-400/50"/>
                    <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase font-light">Shared With Me</p>
                    <span className="text-white/15 text-[9px] font-light ml-1">{memberProjects.length}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {memberProjects.map(p => <ProjectCard key={p.id} project={p} role={getMemberRole(p.id)}/>)}
                  </div>
                </div>
              )}
              {allProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-3 border border-dashed border-white/[0.05] rounded-2xl">
                  <FolderOpen size={28} className="text-white/10"/>
                  <p className="text-white/22 text-sm font-light">No projects yet</p>
                </div>
              )}
            </div>
          )}

          {/* ══ ACTIVITY ══ */}
          {section === "activity" && (
            <div className="max-w-2xl">
              <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-5 font-light">All Activity</p>
              {allActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 border border-dashed border-white/[0.05] rounded-2xl">
                  <Activity size={28} className="text-white/10"/>
                  <p className="text-white/22 text-sm font-light">No activity yet</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {allActivity.map((item, i) => (
                    <a key={item.id} href={item.type === "comment" ? `/review/${item.projectId}` : `/project/${item.projectId}`}
                      className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.type === "comment" ? "bg-violet-500/10" : "bg-blue-500/10"}`}>
                          {item.type === "comment"
                            ? <MessageSquare size={12} className="text-violet-400/70"/>
                            : <FileText size={12} className="text-blue-400/70"/>}
                        </div>
                        {i < allActivity.length - 1 && <div className="w-px flex-1 bg-white/[0.04] my-1.5"/>}
                      </div>
                      <div className={`flex-1 min-w-0 ${i < allActivity.length - 1 ? "pb-5" : ""}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-white/62 text-[13px] font-light group-hover:text-white/85 transition-colors truncate">{item.text}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-white/30 text-[10px] font-light">{item.type === "comment" ? "Comment on" : "File in"}</span>
                              <span className="text-white/45 text-[10px] font-light">{item.project}</span>
                              {item.sub && <><span className="text-white/12">·</span><span className="text-white/25 text-[10px] font-light">{item.sub}</span></>}
                            </div>
                          </div>
                          <span className="text-white/18 text-[10px] font-light shrink-0">{timeAgo(item.date)}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ PROFILE ══ */}
          {section === "profile" && (
            <div className="max-w-lg flex flex-col gap-8">

              {/* Avatar + identity */}
              <div className="flex items-center gap-5 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.015]">
                <Avatar name={displayName} size={56}/>
                <div>
                  <p className="text-white/72 text-base font-light">{displayName}</p>
                  <p className="text-white/28 text-xs font-light mt-0.5">{user.email}</p>
                  {profile.company && <p className="text-white/20 text-xs font-light mt-0.5">{profile.company}</p>}
                </div>
              </div>

              {/* Edit form */}
              <div>
                <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-5 font-light">Edit Profile</p>
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div>
                    <label className="text-white/28 text-xs mb-2 block font-light">Full name</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3.5 text-sm text-white/78 placeholder-white/14 outline-none focus:border-white/16 transition-colors font-light"/>
                  </div>
                  <div>
                    <label className="text-white/28 text-xs mb-2 block font-light">Company / Studio</label>
                    <input value={company} onChange={e => setCompany(e.target.value)}
                      placeholder="e.g. MixLabs Creative"
                      className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3.5 text-sm text-white/78 placeholder-white/14 outline-none focus:border-white/16 transition-colors font-light"/>
                    <p className="text-white/16 text-[10px] font-light mt-1.5">Shown on your profile and project pages</p>
                  </div>
                  {/* Profession picker — single select */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-white/28 text-xs font-light">Your role <span className="text-white/14 font-light">(pick one)</span></label>
                      {profession && (
                        <button type="button" onClick={() => setProfession("")}
                          className="text-[10px] text-white/22 hover:text-white/50 font-light transition-colors">
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
                      {(["Direction","Music","Sound","Picture","Other"] as const).map((cat, ci) => {
                        const roles = PROFESSIONS.filter(p => p.category === cat);
                        return (
                          <div key={cat}>
                            {ci > 0 && <div className="h-px bg-white/[0.04]"/>}
                            <div className="px-4 pt-3 pb-1">
                              <p className="text-white/14 text-[9px] tracking-[0.2em] uppercase font-light">{cat}</p>
                            </div>
                            {roles.map((p, ri) => {
                              const selected = profession === p.label;
                              return (
                                <button key={p.label} type="button"
                                  onClick={() => setProfession(p.label)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-left"
                                  style={selected ? { background: p.accent + "10" } : {}}>
                                  {/* Radio dot */}
                                  <span className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all"
                                    style={selected
                                      ? { borderColor: p.accent, background: p.accent + "20" }
                                      : { borderColor: "rgba(255,255,255,0.12)" }}>
                                    {selected && <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.accent }}/>}
                                  </span>
                                  {/* Icon */}
                                  <span className="shrink-0 transition-colors"
                                    style={{ color: selected ? p.accent : "rgba(255,255,255,0.2)" }}>
                                    {p.icon}
                                  </span>
                                  {/* Label */}
                                  <span className="text-[12px] font-light transition-colors flex-1"
                                    style={{ color: selected ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.38)" }}>
                                    {p.label}
                                  </span>
                                  {selected && (
                                    <span className="text-[9px] font-light px-1.5 py-0.5 rounded-full"
                                      style={{ color: p.accent, background: p.accent + "15" }}>
                                      selected
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                            <div className="pb-2"/>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-white/28 text-xs mb-2 block font-light">Email address</label>
                    <input value={user.email} disabled
                      className="w-full bg-white/[0.02] border border-white/6 rounded-2xl px-4 py-3.5 text-sm text-white/25 outline-none cursor-not-allowed font-light"/>
                    <p className="text-white/14 text-[10px] font-light mt-1.5">Email cannot be changed from here</p>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button type="submit" disabled={saving}
                      className="flex items-center gap-2 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
                      {saved ? <><Check size={11}/> Saved</> : saving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Avatar color indicator */}
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.015]">
                <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-3 font-light">Avatar</p>
                <div className="flex items-center gap-3">
                  <Avatar name={displayName} size={36}/>
                  <div>
                    <p className="text-white/45 text-xs font-light">Auto-generated from your name</p>
                    <p className="text-white/20 text-[10px] font-light mt-0.5">Changes automatically when you update your name</p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3">
                  {AVATAR_COLORS.map(c => (
                    <div key={c} className="w-5 h-5 rounded-full shrink-0 ring-1 ring-black/30 transition-transform hover:scale-110"
                      style={{ background: c, outline: c === avatarColor(displayName) ? `2px solid ${c}` : "none", outlineOffset: 2 }}/>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ══ SECURITY ══ */}
          {section === "security" && (
            <div className="max-w-lg flex flex-col gap-8">

              {/* Account details */}
              <div>
                <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-4 font-light">Account Details</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Email",    value: user.email,              mono: false },
                    { label: "User ID",  value: user.id,                 mono: true  },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between px-4 py-3.5 rounded-2xl border border-white/[0.05] bg-white/[0.015]">
                      <div className="flex items-center gap-3">
                        <span className="text-white/22 text-xs font-light w-16">{r.label}</span>
                        <span className={`text-white/58 text-sm font-light ${r.mono ? "font-mono text-xs text-white/35" : ""} truncate max-w-xs`}>{r.value}</span>
                      </div>
                      {r.label === "User ID" && (
                        <button onClick={copyUserId}
                          className={`flex items-center gap-1 text-[10px] font-light transition-colors ${copied ? "text-emerald-400/70" : "text-white/22 hover:text-white/55"}`}>
                          {copied ? <Check size={10}/> : <Copy size={10}/>}
                          {copied ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Change password */}
              <div>
                <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-4 font-light">Change Password</p>
                <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                  <div>
                    <label className="text-white/28 text-xs mb-2 block font-light">New password</label>
                    <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                      placeholder="Minimum 6 characters" required
                      className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3.5 text-sm text-white/78 placeholder-white/14 outline-none focus:border-white/16 transition-colors font-light"/>
                  </div>
                  <div>
                    <label className="text-white/28 text-xs mb-2 block font-light">Confirm password</label>
                    <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Repeat new password" required
                      className="w-full bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3.5 text-sm text-white/78 placeholder-white/14 outline-none focus:border-white/16 transition-colors font-light"/>
                  </div>

                  {/* Password strength indicator */}
                  {newPw.length > 0 && (
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => {
                        const strength = Math.min(Math.floor(newPw.length / 3), 4);
                        const colors = ["bg-red-400","bg-amber-400","bg-amber-300","bg-emerald-400"];
                        return (
                          <div key={i} className={`h-0.5 flex-1 rounded-full transition-all ${i <= strength ? colors[strength-1] : "bg-white/8"}`}/>
                        );
                      })}
                      <span className="text-white/22 text-[9px] font-light ml-2">
                        {newPw.length < 6 ? "Weak" : newPw.length < 9 ? "Fair" : newPw.length < 12 ? "Good" : "Strong"}
                      </span>
                    </div>
                  )}

                  {confirmPw.length > 0 && newPw !== confirmPw && (
                    <p className="text-amber-400/70 text-[10px] font-light flex items-center gap-1.5">
                      <AlertCircle size={10}/> Passwords don't match
                    </p>
                  )}

                  {pwMsg && (
                    <p className={`text-[10px] font-light flex items-center gap-1.5 ${pwMsg.type === "ok" ? "text-emerald-400/80" : "text-red-400/75"}`}>
                      {pwMsg.type === "ok" ? <Check size={10}/> : <AlertCircle size={10}/>}
                      {pwMsg.text}
                    </p>
                  )}

                  <button type="submit" disabled={pwSaving || !newPw || !confirmPw || newPw !== confirmPw}
                    className="self-start flex items-center gap-2 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
                    <KeyRound size={11}/>
                    {pwSaving ? "Updating…" : "Update password"}
                  </button>
                </form>
              </div>

              {/* Sessions */}
              <div>
                <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-4 font-light">Sessions</p>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-white/[0.06] bg-white/[0.015]">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                    <div>
                      <p className="text-white/58 text-sm font-light">Current session</p>
                      <p className="text-white/22 text-xs font-light">Active now · this device</p>
                    </div>
                  </div>
                  <button onClick={signOut}
                    className="flex items-center gap-1.5 text-[10px] text-white/28 hover:text-white/60 border border-white/8 hover:border-white/18 px-3 py-2 rounded-xl transition-all font-light">
                    <LogOut size={10}/> Sign out
                  </button>
                </div>
              </div>

              {/* Danger */}
              <div className="border-t border-white/[0.04] pt-6">
                <p className="text-white/18 text-[9px] tracking-[0.25em] uppercase mb-4 font-light">Danger Zone</p>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-red-500/10 bg-red-500/[0.02]">
                  <div>
                    <p className="text-white/55 text-sm font-light">Sign out everywhere</p>
                    <p className="text-white/18 text-xs font-light mt-0.5">Revokes all active sessions on all devices</p>
                  </div>
                  <button onClick={signOut}
                    className="flex items-center gap-1.5 text-red-400/65 hover:text-red-400 border border-red-500/15 hover:border-red-500/30 px-3 py-2 rounded-xl text-xs transition-all font-light">
                    <LogOut size={11}/> Sign out all
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
