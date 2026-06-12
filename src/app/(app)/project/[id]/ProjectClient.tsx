"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, ExternalLink, ChevronDown, Music, Palette, Scissors, Wand2, Zap, Volume2, X } from "lucide-react";
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
  Sound:     { icon: <Volume2 size={16} />,  color: "#F59E0B" },
  Score:     { icon: <Music size={16} />,    color: "#A855F7" },
  Color:     { icon: <Palette size={16} />,  color: "#EC4899" },
  Edit:      { icon: <Scissors size={16} />, color: "#3B82F6" },
  Animation: { icon: <Wand2 size={16} />,    color: "#22C55E" },
  VFX:       { icon: <Zap size={16} />,      color: "#F97316" },
};

type Project = { id: string; name: string; client: string | null; status: string; departments: string[] };
type Version = { id: string; title: string; department: string | null; drive_url: string | null; body: string | null; created_at: string };
type Member = { id: string; role: string | null; profiles: { id: string; full_name: string | null; email: string | null } | null };

function FolderCard({ dept, files, isOpen, onClick }: { dept: string; files: Version[]; isOpen: boolean; onClick: () => void }) {
  const meta = DEPT_META[dept] ?? { icon: null, color: "#6B7280" };
  const count = files.length;

  // Layout: total height = box height + amount papers poke above
  // Box starts at 22% from top. Papers start at 0, so 22% pokes above box.
  const BOX_TOP = "22%";

  return (
    <button onClick={onClick} className="group text-left w-full focus:outline-none">
      <div className="relative w-full" style={{ paddingBottom: "95%" }}>
        <div className="absolute inset-0">

          {/* ── DARK OUTER BOX ── */}
          <div className="absolute left-0 right-0 bottom-0" style={{
            top: BOX_TOP,
            borderRadius: "20px",
            background: "#111111",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)",
            border: isOpen ? "1.5px solid rgba(255,255,255,0.18)" : "1.5px solid rgba(255,255,255,0.08)",
          }} />

          {/* ── PAPER LEFT — wide, barely peeks above box, tilted left ── */}
          <div style={{
            position: "absolute",
            width: "48%",
            height: "70%",
            top: "0%",
            left: "6%",
            borderRadius: "14px",
            background: "linear-gradient(175deg, #e8e8e8 0%, #c8c8c8 100%)",
            transform: "rotate(-8deg)",
            transformOrigin: "50% 85%",
            boxShadow: "2px 4px 20px rgba(0,0,0,0.6)",
            zIndex: 2,
          }}>
            <div style={{ padding: "12px 14px 0", display: "flex", flexDirection: "column", gap: "7px" }}>
              <div style={{ height: "5px", background: "rgba(0,0,0,0.13)", borderRadius: "3px", width: "68%" }} />
              <div style={{ height: "5px", background: "rgba(0,0,0,0.08)", borderRadius: "3px", width: "50%" }} />
              <div style={{ height: "5px", background: "rgba(0,0,0,0.08)", borderRadius: "3px", width: "60%" }} />
            </div>
          </div>

          {/* ── PAPER RIGHT — wide, barely peeks above, tilted right ── */}
          <div style={{
            position: "absolute",
            width: "48%",
            height: "70%",
            top: "0%",
            right: "6%",
            borderRadius: "14px",
            background: "linear-gradient(175deg, #f5f5f5 0%, #dcdcdc 100%)",
            transform: "rotate(7deg)",
            transformOrigin: "50% 85%",
            boxShadow: "2px 4px 24px rgba(0,0,0,0.65)",
            zIndex: 3,
          }}>
            <div style={{ padding: "12px 14px 0", display: "flex", flexDirection: "column", gap: "7px" }}>
              <div style={{ height: "5px", background: "rgba(0,0,0,0.11)", borderRadius: "3px", width: "60%" }} />
              <div style={{ height: "5px", background: "rgba(0,0,0,0.07)", borderRadius: "3px", width: "75%" }} />
              <div style={{ height: "5px", background: "rgba(0,0,0,0.07)", borderRadius: "3px", width: "45%" }} />
            </div>
          </div>

          {/* ── GLASS FRONT PANEL — radial glow gradient, covers full box ── */}
          <div style={{
            position: "absolute",
            left: 0, right: 0, bottom: 0,
            top: BOX_TOP,
            borderRadius: "20px",
            background: "radial-gradient(ellipse at 45% 35%, rgba(175,175,175,0.55) 0%, rgba(100,100,100,0.35) 35%, rgba(35,35,35,0.7) 75%, rgba(15,15,15,0.85) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            zIndex: 4,
          }}>
            {/* top inner highlight */}
            <div style={{
              position: "absolute", top: "1px", left: "15%", right: "15%", height: "1px",
              background: "rgba(255,255,255,0.2)", borderRadius: "1px",
            }} />
          </div>

          {/* ── LABEL ── */}
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            padding: "0 18px 18px",
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            zIndex: 5,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: meta.color }}>{meta.icon}</span>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", fontWeight: 300, letterSpacing: "0.02em" }}>{dept}</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px" }}>
              {count} {count === 1 ? "file" : "files"}
            </span>
          </div>

        </div>
      </div>
    </button>
  );
}

function FileDrawer({ dept, files, projectId, onClose, onFileAdded }: {
  dept: string; files: Version[]; projectId: string; onClose: () => void; onFileAdded: () => void;
}) {
  const meta = DEPT_META[dept] ?? { icon: null, color: "#6B7280" };
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="col-span-full mt-1 mb-2 rounded-2xl border border-white/10 overflow-hidden bg-[#111111]">
      {/* Drawer header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <span style={{ color: meta.color }}>{meta.icon}</span>
          <span className="text-white text-sm font-light tracking-wide">{dept}</span>
          <span className="text-white/25 text-xs">{files.length} files</span>
        </div>
        <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* File list */}
      {files.length === 0 && !adding ? (
        <div className="py-8 text-center text-white/20 text-sm">No files yet</div>
      ) : (
        files.map((v, i) => (
          <div key={v.id} className={`flex items-center justify-between px-5 py-3.5 group hover:bg-white/3 transition-colors ${i < files.length - 1 ? "border-b border-white/5" : ""}`}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color + "80" }} />
              <div className="min-w-0">
                <p className="text-white/80 text-sm">{v.title}</p>
                {v.body && <p className="text-white/30 text-xs mt-0.5 truncate">{v.body}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4 shrink-0">
              <span className="text-white/20 text-[10px]">
                {new Date(v.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
              {v.drive_url && (
                <a href={v.drive_url} target="_blank" rel="noopener noreferrer"
                  className="text-white/20 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all">
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        ))
      )}

      {/* Add file form */}
      {adding ? (
        <form onSubmit={addFile} className="px-5 py-4 flex flex-col gap-2.5 border-t border-white/8 bg-white/[0.02]">
          <input autoFocus placeholder="File title (e.g. Score v2 — Final)"
            value={title} onChange={e => setTitle(e.target.value)} required
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 w-full"
          />
          <div className="grid grid-cols-2 gap-2.5">
            <input placeholder="Drive / Dropbox link"
              value={url} onChange={e => setUrl(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 w-full"
            />
            <input placeholder="Notes (optional)"
              value={notes} onChange={e => setNotes(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading || !title.trim()}
              className="bg-white text-black rounded-lg px-4 py-2 text-xs font-medium hover:bg-white/90 disabled:opacity-40 transition-all">
              {loading ? "Adding..." : "Add File"}
            </button>
            <button type="button" onClick={() => setAdding(false)}
              className="text-white/30 hover:text-white/60 text-xs transition-colors">Cancel</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full flex items-center gap-2 px-5 py-3.5 text-white/25 hover:text-white/50 hover:bg-white/3 text-xs transition-colors border-t border-white/8">
          <Plus size={12} /> Add file to {dept}
        </button>
      )}
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
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  const departments = project.departments ?? [];

  async function updateStatus(s: string) {
    setStatus(s); setShowStatusMenu(false);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
  }

  function toggleFolder(dept: string) {
    setOpenFolder(prev => prev === dept ? null : dept);
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

          {/* Folder grid */}
          {activeTab === "files" && (
            departments.length === 0 ? (
              <p className="text-white/20 text-sm py-16 text-center">No departments assigned.</p>
            ) : (
              <div className="grid grid-cols-3 gap-5">
                {departments.map(dept => (
                  <FolderCard
                    key={dept}
                    dept={dept}
                    files={versions.filter(v => v.department === dept)}
                    isOpen={openFolder === dept}
                    onClick={() => toggleFolder(dept)}
                  />
                ))}
                {openFolder && (
                  <FileDrawer
                    key={openFolder}
                    dept={openFolder}
                    files={versions.filter(v => v.department === openFolder)}
                    projectId={project.id}
                    onClose={() => setOpenFolder(null)}
                    onFileAdded={() => router.refresh()}
                  />
                )}
              </div>
            )
          )}

          {/* Team */}
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
