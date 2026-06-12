"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, ExternalLink, ChevronDown, Music, Palette, Scissors, Wand2, Zap, Volume2, FileText } from "lucide-react";
import Sidebar from "@/components/ui/Sidebar";

const STATUS_OPTIONS = ["active", "in review", "ready", "paused", "delivered"];
const STATUS_STYLES: Record<string, string> = {
  active: "text-green-400 bg-green-400/10 border-green-400/20",
  "in review": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  ready: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  paused: "text-gray-400 bg-gray-400/5 border-gray-400/20",
  delivered: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

const DEPT_META: Record<string, { icon: React.ReactNode; accent: string; tab: string }> = {
  Sound:     { icon: <Volume2 size={13} />,  accent: "text-amber-400",  tab: "border-amber-400/30 bg-amber-400/5" },
  Score:     { icon: <Music size={13} />,    accent: "text-purple-400", tab: "border-purple-400/30 bg-purple-400/5" },
  Color:     { icon: <Palette size={13} />,  accent: "text-pink-400",   tab: "border-pink-400/30 bg-pink-400/5" },
  Edit:      { icon: <Scissors size={13} />, accent: "text-blue-400",   tab: "border-blue-400/30 bg-blue-400/5" },
  Animation: { icon: <Wand2 size={13} />,    accent: "text-green-400",  tab: "border-green-400/30 bg-green-400/5" },
  VFX:       { icon: <Zap size={13} />,      accent: "text-orange-400", tab: "border-orange-400/30 bg-orange-400/5" },
};

type Project = { id: string; name: string; client: string | null; status: string; departments: string[] };
type Version = { id: string; title: string; department: string | null; drive_url: string | null; body: string | null; created_at: string };
type Member = { id: string; role: string | null; profiles: { id: string; full_name: string | null; email: string | null } | null };

function DepartmentFolder({ dept, files, projectId, onFileAdded }: {
  dept: string;
  files: Version[];
  projectId: string;
  onFileAdded: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const meta = DEPT_META[dept] ?? { icon: <FileText size={13} />, accent: "text-white/40", tab: "border-white/10 bg-white/5" };

  async function addFile(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await fetch(`/api/projects/${projectId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), department: dept, drive_url: url.trim() || null, body: notes.trim() || null }),
    });
    setTitle(""); setUrl(""); setNotes("");
    setLoading(false);
    setAdding(false);
    onFileAdded();
  }

  return (
    <div className="flex flex-col">
      {/* Folder tab */}
      <div className="flex items-end gap-0 ml-5">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-t-lg border border-b-0 text-xs tracking-widest uppercase ${meta.tab} ${meta.accent}`}>
          {meta.icon}
          <span>{dept}</span>
          <span className="text-white/20 normal-case tracking-normal ml-1">{files.length}</span>
        </div>
      </div>

      {/* Folder body */}
      <div className="border border-white/8 rounded-b-xl rounded-tr-xl bg-white/[0.02] overflow-hidden">
        {/* Folder top bar */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-5 py-3 border-b border-white/5 hover:bg-white/3 transition-colors"
        >
          <span className="text-white/20 text-[10px] tracking-widest uppercase">
            {files.length === 0 ? "Empty" : `${files.length} ${files.length === 1 ? "file" : "files"}`}
          </span>
          <ChevronDown size={12} className={`text-white/20 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
        </button>

        {open && (
          <>
            {/* File rows */}
            {files.length === 0 && !adding ? (
              <div className="px-5 py-6 flex flex-col items-center gap-2">
                <p className="text-white/15 text-xs">No files yet</p>
              </div>
            ) : (
              files.map((v, i) => (
                <div key={v.id} className={`flex items-center justify-between px-5 py-3.5 ${i < files.length - 1 || adding ? "border-b border-white/5" : ""} hover:bg-white/3 transition-colors group`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-1 h-1 rounded-full shrink-0 ${meta.accent.replace("text-", "bg-")}`} />
                    <div className="min-w-0">
                      <p className="text-white/80 text-sm leading-none">{v.title}</p>
                      {v.body && <p className="text-white/25 text-xs mt-1 truncate">{v.body}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-white/15 text-[10px]">
                      {new Date(v.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                    {v.drive_url && (
                      <a href={v.drive_url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-white/20 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Add file inline form */}
            {adding && (
              <form onSubmit={addFile} className="px-5 py-4 flex flex-col gap-2.5 border-t border-white/5 bg-white/[0.02]">
                <input autoFocus placeholder="File title (e.g. Score v2 — Final)"
                  value={title} onChange={e => setTitle(e.target.value)} required
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 w-full transition-colors"
                />
                <input placeholder="Drive / Dropbox link (optional)"
                  value={url} onChange={e => setUrl(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 w-full transition-colors"
                />
                <textarea placeholder="Notes (optional)" rows={2}
                  value={notes} onChange={e => setNotes(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 w-full resize-none transition-colors"
                />
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={loading || !title.trim()}
                    className="bg-white text-black rounded-lg px-4 py-2 text-xs font-medium hover:bg-white/90 disabled:opacity-40 transition-all">
                    {loading ? "Adding..." : "Add File"}
                  </button>
                  <button type="button" onClick={() => setAdding(false)}
                    className="text-white/25 hover:text-white/50 text-xs transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Add file button */}
            {!adding && (
              <button onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-5 py-3 text-white/20 hover:text-white/50 hover:bg-white/3 text-xs transition-colors border-t border-white/5">
                <Plus size={11} />
                <span>Add file to {dept}</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ProjectClient({ project, versions, members, currentUserId }: {
  project: Project; versions: Version[]; members: Member[]; currentUserId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(project.status);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"files" | "team">("files");

  const departments = project.departments ?? [];

  async function updateStatus(s: string) {
    setStatus(s); setShowStatusMenu(false);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar active="dashboard" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">

          {/* Back */}
          <a href="/dashboard" className="inline-flex items-center gap-2 text-white/20 hover:text-white/50 text-xs tracking-widest uppercase transition-colors mb-8">
            <ArrowLeft size={12} /> Dashboard
          </a>

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              {project.client && <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase mb-1">{project.client}</p>}
              <h1 className="text-white text-2xl font-light tracking-wide">{project.name}</h1>
            </div>

            <div className="relative">
              <button onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border tracking-widest uppercase ${STATUS_STYLES[status] ?? "text-white/30 bg-white/5 border-white/10"}`}>
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

          {/* Tabs */}
          <div className="flex gap-1 mb-8 p-1 rounded-xl bg-white/5 w-fit">
            {(["files", "team"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-xs tracking-widest uppercase transition-all ${activeTab === tab ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"}`}>
                {tab === "files" ? "Files & Versions" : "Team"}
              </button>
            ))}
          </div>

          {/* Department Folders */}
          {activeTab === "files" && (
            <div className="flex flex-col gap-6">
              {departments.length === 0 ? (
                <p className="text-white/20 text-sm py-16 text-center">No departments assigned to this project.</p>
              ) : (
                departments.map(dept => (
                  <DepartmentFolder
                    key={dept}
                    dept={dept}
                    files={versions.filter(v => v.department === dept)}
                    projectId={project.id}
                    onFileAdded={() => router.refresh()}
                  />
                ))
              )}
            </div>
          )}

          {/* Team Tab */}
          {activeTab === "team" && (
            <div>
              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <p className="text-white/20 text-sm">No team members yet</p>
                  <p className="text-white/10 text-xs">Invites coming soon</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {members.map(m => (
                    <div key={m.id} className="glass rounded-xl px-5 py-4">
                      <p className="text-white text-sm">{m.profiles?.full_name || m.profiles?.email || "Unknown"}</p>
                      {m.role && <p className="text-white/30 text-xs mt-0.5 capitalize">{m.role}</p>}
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
