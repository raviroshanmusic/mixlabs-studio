"use client";
import { useState } from "react";
import { Check, LogOut, Music, Palette, Scissors, Wand2, Zap, Volume2 } from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";

// ─── Types ───────────────────────────────────────────────────────────────────

type Profile = { id: string; full_name: string | null; email: string | null; company: string | null };
type Project = { id: string; name: string; client: string | null; status: string; departments: string[] };
type MemberRow = { project_id: string; role: string | null; department: string | null };

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400", "in review": "bg-amber-400",
  ready: "bg-blue-400", paused: "bg-zinc-500", delivered: "bg-violet-400",
};

const DEPT_META: Record<string, { icon: React.ReactNode; accent: string }> = {
  Sound:     { icon: <Volume2 size={11} />,  accent: "#F59E0B" },
  Score:     { icon: <Music size={11} />,    accent: "#A855F7" },
  Color:     { icon: <Palette size={11} />,  accent: "#EC4899" },
  Edit:      { icon: <Scissors size={11} />, accent: "#3B82F6" },
  Animation: { icon: <Wand2 size={11} />,    accent: "#22C55E" },
  VFX:       { icon: <Zap size={11} />,      accent: "#F97316" },
};

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/60 font-light shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {initials || "?"}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, role, badge }: { project: Project; role?: string | null; badge?: string }) {
  const dot = STATUS_DOT[project.status] ?? "bg-zinc-600";
  return (
    <a href={`/project/${project.id}`}
      className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-white/[0.04] transition-colors group border border-white/[0.05] hover:border-white/10">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
          <p className="text-white/80 text-sm truncate group-hover:text-white transition-colors">{project.name}</p>
          {badge && (
            <span className="shrink-0 text-[9px] tracking-widest uppercase text-white/25 border border-white/8 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 pl-3.5">
          {project.client && <span className="text-white/25 text-xs">{project.client}</span>}
          {project.departments?.slice(0, 3).map(d => {
            const m = DEPT_META[d];
            return m ? (
              <span key={d} style={{ color: m.accent }} className="opacity-60">{m.icon}</span>
            ) : null;
          })}
          {(project.departments?.length ?? 0) > 3 && (
            <span className="text-white/20 text-[10px]">+{project.departments.length - 3}</span>
          )}
        </div>
      </div>
      {role && (
        <span className="shrink-0 ml-4 text-[10px] tracking-widest uppercase text-white/20 border border-white/8 px-2.5 py-1 rounded-full capitalize">
          {role}
        </span>
      )}
    </a>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function MemberClient({ user, profile: initialProfile, ownedProjects, memberProjects, memberRows }: {
  user: { id: string; email: string };
  profile: Profile;
  ownedProjects: Project[];
  memberProjects: Project[];
  memberRows: MemberRow[];
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [fullName, setFullName] = useState(initialProfile.full_name ?? "");
  const [company, setCompany] = useState(initialProfile.company ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  const displayName = profile.full_name || user.email.split("@")[0];
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName.trim(), company: company.trim() }),
    });
    if (res.ok) {
      setProfile(p => ({ ...p, full_name: fullName.trim() || null, company: company.trim() || null }));
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  function getMemberRole(projectId: string) {
    return memberRows.find(r => r.project_id === projectId)?.role ?? null;
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar active="member" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-12">

          {/* ── Profile Header ── */}
          <div className="flex items-start gap-5 mb-12">
            <Avatar name={displayName} size={64} />
            <div className="flex-1 min-w-0">
              <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase mb-1">Your Profile</p>
              <h1 className="text-white text-2xl font-light tracking-wide truncate">{displayName}</h1>
              <p className="text-white/30 text-sm mt-0.5">{user.email}</p>
              {profile.company && (
                <p className="text-white/20 text-xs mt-1">{profile.company}</p>
              )}
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-white/20 hover:text-white/50 border border-white/8 hover:border-white/15 px-3 py-2 rounded-xl transition-all">
              <LogOut size={12} />
              Sign out
            </button>
          </div>

          {/* ── Edit Profile ── */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase">Profile Info</p>
              {!editing && (
                <button onClick={() => setEditing(true)}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors">
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div>
                  <label className="text-white/25 text-xs mb-1.5 block">Full name</label>
                  <input
                    value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-white/25 text-xs mb-1.5 block">Company</label>
                  <input
                    value={company} onChange={e => setCompany(e.target.value)}
                    placeholder="Your company or studio"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-white/25 text-xs mb-1.5 block">Email</label>
                  <input
                    value={user.email} disabled
                    className="w-full bg-white/[0.02] border border-white/6 rounded-xl px-4 py-3 text-sm text-white/30 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 bg-white text-black text-xs font-medium px-5 py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-40 transition-all">
                    {saved ? <><Check size={12} /> Saved</> : saving ? "Saving…" : "Save changes"}
                  </button>
                  <button type="button" onClick={() => { setEditing(false); setFullName(profile.full_name ?? ""); setCompany(profile.company ?? ""); }}
                    className="text-white/25 hover:text-white/50 text-xs transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                {[
                  { label: "Name", value: profile.full_name || "—" },
                  { label: "Company", value: profile.company || "—" },
                  { label: "Email", value: user.email },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-white/30 text-xs">{label}</span>
                    <span className="text-white/70 text-sm">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Owned Projects ── */}
          {ownedProjects.length > 0 && (
            <section className="mb-10">
              <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-4">
                Your Projects <span className="ml-2 text-white/15">{ownedProjects.length}</span>
              </p>
              <div className="flex flex-col gap-2">
                {ownedProjects.map(p => (
                  <ProjectCard key={p.id} project={p} badge="owner" />
                ))}
              </div>
            </section>
          )}

          {/* ── Member Of ── */}
          {memberProjects.length > 0 && (
            <section className="mb-10">
              <p className="text-white/20 text-[9px] tracking-[0.25em] uppercase mb-4">
                Shared With Me <span className="ml-2 text-white/15">{memberProjects.length}</span>
              </p>
              <div className="flex flex-col gap-2">
                {memberProjects.map(p => (
                  <ProjectCard key={p.id} project={p} role={getMemberRole(p.id)} />
                ))}
              </div>
            </section>
          )}

          {ownedProjects.length === 0 && memberProjects.length === 0 && (
            <p className="text-white/15 text-sm py-10 text-center">No projects yet.</p>
          )}

        </div>
      </main>
    </div>
  );
}
