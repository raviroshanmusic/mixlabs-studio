"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, ExternalLink, FileVideo, FileAudio, File, Clock, ChevronDown } from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";

const STATUS_OPTIONS = ["active", "in review", "ready", "paused", "delivered"];
const STATUS_STYLES: Record<string, string> = {
  active: "text-green-400 bg-green-400/10 border-green-400/20",
  "in review": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  ready: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  paused: "text-gray-400 bg-gray-400/5 border-gray-400/20",
  delivered: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

type Project = {
  id: string;
  name: string;
  client: string | null;
  status: string;
  created_at: string;
};

type Version = {
  id: string;
  project_id: string;
  title: string;
  department: string | null;
  drive_url: string | null;
  drive_file_id: string | null;
  author_id: string | null;
  body: string | null;
  created_at: string;
};

type Member = {
  id: string;
  role: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
};

const DEPARTMENTS = ["Music", "Sound Design", "Mix", "Edit", "VFX", "Other"];

const FILE_ICONS: Record<string, React.ReactNode> = {
  Music: <FileAudio size={14} className="text-purple-400" />,
  "Sound Design": <FileAudio size={14} className="text-amber-400" />,
  Mix: <FileAudio size={14} className="text-blue-400" />,
  Edit: <FileVideo size={14} className="text-green-400" />,
  VFX: <FileVideo size={14} className="text-pink-400" />,
};

export default function ProjectClient({
  project, versions, members, currentUserId,
}: {
  project: Project;
  versions: Version[];
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(project.status);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [activeTab, setActiveTab] = useState<"versions" | "team">("versions");

  // New version form
  const [vTitle, setVTitle] = useState("");
  const [vDept, setVDept] = useState(DEPARTMENTS[0]);
  const [vUrl, setVUrl] = useState("");
  const [vNotes, setVNotes] = useState("");
  const [vLoading, setVLoading] = useState(false);

  async function updateStatus(newStatus: string) {
    setStatus(newStatus);
    setShowStatusMenu(false);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  async function addVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!vTitle.trim()) return;
    setVLoading(true);

    await fetch(`/api/projects/${project.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: vTitle.trim(), department: vDept, drive_url: vUrl.trim() || null, body: vNotes.trim() || null }),
    });

    setVTitle(""); setVUrl(""); setVNotes(""); setVLoading(false);
    setShowAddVersion(false);
    router.refresh();
  }

  const versionsByDept = DEPARTMENTS.reduce<Record<string, Version[]>>((acc, dept) => {
    acc[dept] = versions.filter(v => v.department === dept);
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar active="dashboard" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-10">

          {/* Back + Header */}
          <div className="mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/20 hover:text-white/50 text-xs tracking-widest uppercase transition-colors mb-6">
              <ArrowLeft size={12} /> Dashboard
            </Link>

            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase mb-1">
                  {project.client || "Project"}
                </p>
                <h1 className="text-white text-2xl font-light tracking-wide">{project.name}</h1>
              </div>

              {/* Status badge with dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border tracking-widest uppercase transition-all ${STATUS_STYLES[status] ?? "text-white/30 bg-white/5 border-white/10"}`}
                >
                  {status}
                  <ChevronDown size={10} />
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-8 z-10 glass-strong rounded-xl py-1 min-w-[140px]">
                    {STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(s)}
                        className={`w-full text-left px-4 py-2 text-xs tracking-widest uppercase transition-colors ${s === status ? "text-white" : "text-white/40 hover:text-white/70"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 p-1 rounded-xl bg-white/5 w-fit">
            {(["versions", "team"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-xs tracking-widest uppercase transition-all ${activeTab === tab ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}
              >
                {tab === "versions" ? "Files & Versions" : "Team"}
              </button>
            ))}
          </div>

          {/* Files & Versions Tab */}
          {activeTab === "versions" && (
            <div>
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setShowAddVersion(true)}
                  className="flex items-center gap-2 bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-white/90 transition-all"
                >
                  <Plus size={14} /> Add File
                </button>
              </div>

              {/* Add Version Form */}
              {showAddVersion && (
                <div className="glass rounded-xl p-6 mb-6">
                  <p className="text-white/30 text-[10px] tracking-widest uppercase mb-4">New File / Version</p>
                  <form onSubmit={addVersion} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        autoFocus
                        placeholder="Version title (e.g. Score v3 — Recut)"
                        value={vTitle}
                        onChange={e => setVTitle(e.target.value)}
                        required
                        className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20"
                      />
                      <select
                        value={vDept}
                        onChange={e => setVDept(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                      >
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input
                        placeholder="Google Drive / Dropbox link"
                        value={vUrl}
                        onChange={e => setVUrl(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20"
                      />
                    </div>
                    <textarea
                      placeholder="Notes for this version (optional)"
                      value={vNotes}
                      onChange={e => setVNotes(e.target.value)}
                      rows={2}
                      className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 resize-none"
                    />
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={vLoading || !vTitle.trim()}
                        className="bg-white text-black rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-white/90 disabled:opacity-40 transition-all"
                      >
                        {vLoading ? "Adding..." : "Add File"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddVersion(false)}
                        className="text-white/30 hover:text-white/60 text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Versions grouped by department */}
              {versions.length === 0 && !showAddVersion ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <button
                    onClick={() => setShowAddVersion(true)}
                    className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center hover:border-white/20 transition-all group"
                  >
                    <Plus size={20} className="text-white/20 group-hover:text-white/40" />
                  </button>
                  <p className="text-white/20 text-sm">No files yet — add the first version</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {DEPARTMENTS.map(dept => {
                    const deptVersions = versionsByDept[dept];
                    if (deptVersions.length === 0) return null;
                    return (
                      <div key={dept}>
                        <div className="flex items-center gap-3 mb-3">
                          {FILE_ICONS[dept] ?? <File size={14} className="text-white/30" />}
                          <p className="text-white/40 text-[10px] tracking-widest uppercase">{dept}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {deptVersions.map(v => (
                            <div key={v.id} className="glass rounded-xl px-5 py-4 flex items-center justify-between group">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-light">{v.title}</p>
                                {v.body && <p className="text-white/30 text-xs mt-0.5 truncate">{v.body}</p>}
                              </div>
                              <div className="flex items-center gap-4 ml-4 shrink-0">
                                <span className="text-white/20 text-[10px] flex items-center gap-1">
                                  <Clock size={10} />
                                  {new Date(v.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                </span>
                                {v.drive_url && (
                                  <a
                                    href={v.drive_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white/20 hover:text-white/60 transition-colors"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Team Tab */}
          {activeTab === "team" && (
            <div>
              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <p className="text-white/20 text-sm">No team members added yet</p>
                  <p className="text-white/10 text-xs">Team member invites coming soon</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {members.map(m => (
                    <div key={m.id} className="glass rounded-xl px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm">{m.profiles?.full_name || m.profiles?.email || "Unknown"}</p>
                        {m.role && <p className="text-white/30 text-xs mt-0.5 capitalize">{m.role}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
