"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, ExternalLink, ChevronDown, ChevronRight, Music, Palette, Scissors, Wand2, Zap, Volume2 } from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";

const STATUS_OPTIONS = ["active", "in review", "ready", "paused", "delivered"];
const STATUS_STYLES: Record<string, string> = {
  active: "text-green-400 bg-green-400/10 border-green-400/20",
  "in review": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  ready: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  paused: "text-gray-400 bg-gray-400/5 border-gray-400/20",
  delivered: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

const DEPT_META: Record<string, { icon: React.ReactNode; color: string }> = {
  Sound:     { icon: <Volume2 size={14} />,  color: "text-amber-400" },
  Score:     { icon: <Music size={14} />,    color: "text-purple-400" },
  Color:     { icon: <Palette size={14} />,  color: "text-pink-400" },
  Edit:      { icon: <Scissors size={14} />, color: "text-blue-400" },
  Animation: { icon: <Wand2 size={14} />,    color: "text-green-400" },
  VFX:       { icon: <Zap size={14} />,      color: "text-orange-400" },
};

type Project = {
  id: string;
  name: string;
  client: string | null;
  status: string;
  departments: string[];
  created_at: string;
};

type Version = {
  id: string;
  title: string;
  department: string | null;
  drive_url: string | null;
  body: string | null;
  created_at: string;
};

type Member = {
  id: string;
  role: string | null;
  profiles: { id: string; full_name: string | null; email: string | null } | null;
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
  const [activeTab, setActiveTab] = useState<"files" | "team">("files");
  const [openDepts, setOpenDepts] = useState<Set<string>>(new Set(project.departments));

  // Add file form state
  const [addingToDept, setAddingToDept] = useState<string | null>(null);
  const [vTitle, setVTitle] = useState("");
  const [vUrl, setVUrl] = useState("");
  const [vNotes, setVNotes] = useState("");
  const [vLoading, setVLoading] = useState(false);

  const departments = project.departments ?? [];

  function toggleDept(dept: string) {
    setOpenDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept); else next.add(dept);
      return next;
    });
  }

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

  async function addFile(e: React.FormEvent, dept: string) {
    e.preventDefault();
    if (!vTitle.trim()) return;
    setVLoading(true);
    await fetch(`/api/projects/${project.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: vTitle.trim(), department: dept, drive_url: vUrl.trim() || null, body: vNotes.trim() || null }),
    });
    setVTitle(""); setVUrl(""); setVNotes("");
    setVLoading(false);
    setAddingToDept(null);
    router.refresh();
  }

  function startAdding(dept: string) {
    setAddingToDept(dept);
    setVTitle(""); setVUrl(""); setVNotes("");
    // Make sure folder is open
    setOpenDepts(prev => new Set([...prev, dept]));
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar active="dashboard" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">

          {/* Back */}
          <a href="/dashboard" className="inline-flex items-center gap-2 text-white/20 hover:text-white/50 text-xs tracking-widest uppercase transition-colors mb-8">
            <ArrowLeft size={12} /> Dashboard
          </a>

          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase mb-1">{project.client || "Project"}</p>
              <h1 className="text-white text-2xl font-light tracking-wide">{project.name}</h1>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border tracking-widest uppercase transition-all ${STATUS_STYLES[status] ?? "text-white/30 bg-white/5 border-white/10"}`}
              >
                {status} <ChevronDown size={10} />
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 top-9 z-10 glass-strong rounded-xl py-1 min-w-[140px]">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} onClick={() => updateStatus(s)}
                      className={`w-full text-left px-4 py-2 text-xs tracking-widest uppercase transition-colors ${s === status ? "text-white" : "text-white/40 hover:text-white/70"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Department pills */}
          <div className="flex gap-2 flex-wrap mb-8">
            {departments.map(dept => {
              const meta = DEPT_META[dept];
              return (
                <span key={dept} className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 tracking-widest uppercase ${meta?.color ?? "text-white/30"}`}>
                  {meta?.icon} {dept}
                </span>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 p-1 rounded-xl bg-white/5 w-fit">
            {(["files", "team"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-xs tracking-widest uppercase transition-all ${activeTab === tab ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
                {tab === "files" ? "Files & Versions" : "Team"}
              </button>
            ))}
          </div>

          {/* Files Tab — Department Folders */}
          {activeTab === "files" && (
            <div className="flex flex-col gap-3">
              {departments.length === 0 ? (
                <p className="text-white/20 text-sm py-16 text-center">No departments assigned to this project.</p>
              ) : (
                departments.map(dept => {
                  const meta = DEPT_META[dept];
                  const deptFiles = versions.filter(v => v.department === dept);
                  const isOpen = openDepts.has(dept);
                  const isAdding = addingToDept === dept;

                  return (
                    <div key={dept} className="glass rounded-xl overflow-hidden">
                      {/* Folder header */}
                      <button
                        onClick={() => toggleDept(dept)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={meta?.color ?? "text-white/30"}>{meta?.icon}</span>
                          <span className="text-white text-sm tracking-wide">{dept}</span>
                          <span className="text-white/20 text-xs">{deptFiles.length} {deptFiles.length === 1 ? "file" : "files"}</span>
                        </div>
                        <ChevronRight size={14} className={`text-white/20 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </button>

                      {/* Folder contents */}
                      {isOpen && (
                        <div className="border-t border-white/5">
                          {deptFiles.map(v => (
                            <div key={v.id} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="text-white/80 text-sm">{v.title}</p>
                                {v.body && <p className="text-white/30 text-xs mt-0.5 truncate">{v.body}</p>}
                              </div>
                              <div className="flex items-center gap-3 ml-4 shrink-0">
                                <span className="text-white/20 text-[10px]">
                                  {new Date(v.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                </span>
                                {v.drive_url && (
                                  <a href={v.drive_url} target="_blank" rel="noopener noreferrer"
                                    className="text-white/20 hover:text-white/60 transition-colors"
                                    onClick={e => e.stopPropagation()}>
                                    <ExternalLink size={13} />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Add file form */}
                          {isAdding ? (
                            <form onSubmit={e => addFile(e, dept)} className="px-5 py-4 flex flex-col gap-3 border-t border-white/5">
                              <input autoFocus placeholder="File / version title"
                                value={vTitle} onChange={e => setVTitle(e.target.value)} required
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 w-full"
                              />
                              <input placeholder="Drive / Dropbox link (optional)"
                                value={vUrl} onChange={e => setVUrl(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 w-full"
                              />
                              <textarea placeholder="Notes (optional)" rows={2}
                                value={vNotes} onChange={e => setVNotes(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 w-full resize-none"
                              />
                              <div className="flex gap-2">
                                <button type="submit" disabled={vLoading || !vTitle.trim()}
                                  className="bg-white text-black rounded-lg px-4 py-2 text-xs font-medium hover:bg-white/90 disabled:opacity-40 transition-all">
                                  {vLoading ? "Adding..." : "Add File"}
                                </button>
                                <button type="button" onClick={() => setAddingToDept(null)}
                                  className="text-white/30 hover:text-white/60 text-xs transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button onClick={() => startAdding(dept)}
                              className="w-full flex items-center gap-2 px-5 py-3 text-white/20 hover:text-white/50 text-xs tracking-wide transition-colors border-t border-white/5">
                              <Plus size={12} /> Add file to {dept}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
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
