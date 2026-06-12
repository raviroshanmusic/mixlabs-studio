"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setLoading(false); return; }

    const { data, error: err } = await supabase
      .from("projects")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        name: name.trim(),
        client: client.trim() || null,
        status: "active",
        owner_id: user.id,
      } as any)
      .select()
      .single();

    if (err) { setError(err.message); setLoading(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`/project/${(data as any).id}`);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong w-full max-w-sm rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/20 text-[10px] tracking-widest uppercase mb-0.5">New Project</p>
            <h2 className="text-white font-light tracking-wide">Create Film Workflow</h2>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-3">
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

          {error && <p className="text-red-400/80 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="mt-2 w-full bg-white text-black rounded-lg py-3 text-sm font-medium hover:bg-white/90 disabled:opacity-40 transition-all"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
