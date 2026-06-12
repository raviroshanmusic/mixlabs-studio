"use client";
import { useState } from "react";
import { X } from "lucide-react";

const DEPARTMENTS = ["Sound", "Score", "Color", "Edit", "Animation", "VFX"];

export default function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleDept(dept: string) {
    setSelectedDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, client, departments: selectedDepts }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create project");
      setLoading(false);
      return;
    }

    onClose();
    window.location.href = `/project/${data.id}`;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong w-full max-w-md rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/20 text-[10px] tracking-widest uppercase mb-0.5">New Project</p>
            <h2 className="text-white font-light tracking-wide">Create Film Workflow</h2>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <input
            autoFocus
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
          />
          <input
            placeholder="Client name (optional)"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
          />

          {/* Department selection */}
          <div>
            <p className="text-white/30 text-[10px] tracking-widest uppercase mb-3">Services Delivering</p>
            <div className="grid grid-cols-3 gap-2">
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => toggleDept(dept)}
                  className={`py-2.5 rounded-lg text-xs tracking-wide border transition-all ${
                    selectedDepts.includes(dept)
                      ? "bg-white text-black border-white"
                      : "bg-white/5 text-white/40 border-white/10 hover:border-white/20 hover:text-white/60"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400/80 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim() || selectedDepts.length === 0}
            className="mt-1 w-full bg-white text-black rounded-lg py-3 text-sm font-medium hover:bg-white/90 disabled:opacity-40 transition-all"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
          {selectedDepts.length === 0 && (
            <p className="text-white/20 text-xs text-center -mt-2">Select at least one service</p>
          )}
        </form>
      </div>
    </div>
  );
}
