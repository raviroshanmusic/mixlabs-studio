"use client";
import { useState } from "react";
import { User } from "@supabase/supabase-js";
import Sidebar from "@/components/ui/Sidebar";
import NewProjectModal from "@/components/ui/NewProjectModal";
import { Plus, Grid3X3, List } from "lucide-react";

const STATUS_TABS = ["All", "Active", "In Review", "Ready", "Paused"] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_STYLES: Record<string, string> = {
  active: "text-green-400 bg-green-400/10",
  "in review": "text-amber-400 bg-amber-400/10",
  ready: "text-blue-400 bg-blue-400/10",
  paused: "text-gray-400 bg-gray-400/10",
  delivered: "text-purple-400 bg-purple-400/10",
};

type Project = {
  id: string;
  name: string;
  client: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
} | null;

export default function DashboardClient({
  user, projects, profile,
}: {
  user: User;
  projects: Project[];
  profile: Profile;
}) {
  const [filter, setFilter] = useState<StatusTab>("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showNewProject, setShowNewProject] = useState(false);

  const filtered = projects.filter((p) => {
    if (filter === "All") return true;
    return p.status?.toLowerCase() === filter.toLowerCase();
  });

  const stats = {
    active: projects.filter((p) => p.status === "active").length,
    inReview: projects.filter((p) => p.status === "in review").length,
    openNotes: 0,
  };

  const displayName = profile?.full_name || user.email?.split("@")[0] || "MixLabs";

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar active="dashboard" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-10">

          {/* Header */}
          <div className="flex items-start justify-between mb-10">
            <div>
              <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase mb-1">Workspace</p>
              <h1 className="text-white text-2xl font-light tracking-wide">{displayName}</h1>
              {profile?.company && (
                <p className="text-white/30 text-sm mt-0.5">{profile.company}</p>
              )}
            </div>
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 bg-white text-black rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-white/90 transition-all"
            >
              <Plus size={14} />
              New Project
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Active", value: stats.active },
              { label: "In Review", value: stats.inReview },
              { label: "Open Notes", value: stats.openNotes },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-5">
                <p className="text-3xl font-light text-white mb-1">{s.value}</p>
                <p className="text-white/30 text-[10px] tracking-widest uppercase">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters + View toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-1">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs tracking-wide transition-all ${
                    filter === tab
                      ? "bg-white/10 text-white"
                      : "text-white/30 hover:text-white/60"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white/10 text-white" : "text-white/20 hover:text-white/50"}`}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white/10 text-white" : "text-white/20 hover:text-white/50"}`}
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {/* Projects grid/list */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <button
                onClick={() => setShowNewProject(true)}
                className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center hover:border-white/20 transition-all group"
              >
                <Plus size={20} className="text-white/20 group-hover:text-white/40 transition-colors" />
              </button>
              <p className="text-white/20 text-sm">Create a new film workflow</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-3 gap-4" : "flex flex-col gap-3"}>
              {filtered.map((project) => (
                <a key={project.id} href={`/project/${project.id}`}>
                  <div className="glass rounded-xl p-5 hover:bg-white/5 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-white text-sm font-medium group-hover:text-white/80 transition-colors leading-snug">
                        {project.name}
                      </h3>
                      <span className={`shrink-0 ml-2 text-[10px] px-2 py-0.5 rounded-full tracking-widest uppercase ${STATUS_STYLES[project.status?.toLowerCase()] ?? "text-white/30 bg-white/5"}`}>
                        {project.status}
                      </span>
                    </div>
                    {project.client && (
                      <p className="text-white/30 text-xs mb-3">{project.client}</p>
                    )}
                    <p className="text-white/15 text-[10px] tracking-widest uppercase">
                      {new Date(project.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>

      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} />
      )}
    </div>
  );
}
