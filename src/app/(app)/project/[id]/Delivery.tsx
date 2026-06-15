"use client";

import { useState, useMemo } from "react";
import {
  Plus, X, Check, Trash2, ExternalLink, Link2, ChevronDown,
  Package, Send, CheckCircle2, Clock, Copy, AlertCircle,
  FileText, Music, Palette, Scissors, Wand2, Zap, Volume2,
  ChevronRight, Pencil, RotateCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Delivery = {
  id: string;
  project_id: string;
  department: string;
  title: string;
  notes: string | null;
  links: { label: string; url: string }[];
  status: "preparing" | "sent" | "confirmed";
  delivered_at: string | null;
  created_at: string;
};

type Project = { id: string; departments: string[] };

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_META: Record<string, { icon: React.ReactNode; accent: string; bg: string; hex: string }> = {
  Sound:     { icon: <Volume2 size={14}/>,  accent: "#F59E0B", bg: "rgba(245,158,11,0.08)",  hex: "#F59E0B" },
  Score:     { icon: <Music size={14}/>,    accent: "#A855F7", bg: "rgba(168,85,247,0.08)",  hex: "#A855F7" },
  Color:     { icon: <Palette size={14}/>,  accent: "#EC4899", bg: "rgba(236,72,153,0.08)",  hex: "#EC4899" },
  Edit:      { icon: <Scissors size={14}/>, accent: "#3B82F6", bg: "rgba(59,130,246,0.08)",  hex: "#3B82F6" },
  Animation: { icon: <Wand2 size={14}/>,    accent: "#22C55E", bg: "rgba(34,197,94,0.08)",   hex: "#22C55E" },
  VFX:       { icon: <Zap size={14}/>,      accent: "#F97316", bg: "rgba(249,115,22,0.08)",  hex: "#F97316" },
};

const STATUS_META: Record<Delivery["status"], {
  icon: React.ReactNode; label: string; cls: string; dot: string; next: Delivery["status"] | null; nextLabel: string | null;
}> = {
  preparing: {
    icon: <Clock size={11}/>,
    label: "Preparing",
    cls: "text-white/40 bg-white/5 border-white/10",
    dot: "bg-white/25",
    next: "sent",
    nextLabel: "Mark as Sent",
  },
  sent: {
    icon: <Send size={11}/>,
    label: "Sent to Client",
    cls: "text-amber-300/80 bg-amber-500/10 border-amber-400/25",
    dot: "bg-amber-400",
    next: "confirmed",
    nextLabel: "Mark as Confirmed",
  },
  confirmed: {
    icon: <CheckCircle2 size={11}/>,
    label: "Client Confirmed",
    cls: "text-emerald-300/80 bg-emerald-500/10 border-emerald-400/25",
    dot: "bg-emerald-400",
    next: null,
    nextLabel: null,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ─── Link editor ─────────────────────────────────────────────────────────────

function LinkEditor({
  links, onChange,
}: {
  links: { label: string; url: string }[];
  onChange: (links: { label: string; url: string }[]) => void;
}) {
  function add() {
    onChange([...links, { label: "", url: "" }]);
  }
  function update(i: number, field: "label" | "url", val: string) {
    const next = [...links];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  }
  function remove(i: number) {
    onChange(links.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-2">
      {links.map((l, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            placeholder="Label - e.g. Final Mix"
            value={l.label}
            onChange={e => update(i, "label", e.target.value)}
            className="w-28 bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-xs text-white/70 placeholder-white/18 outline-none focus:border-white/18 font-light transition-colors shrink-0"
          />
          <input
            placeholder="https://drive.google.com/..."
            value={l.url}
            onChange={e => update(i, "url", e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-xs text-white/70 placeholder-white/18 outline-none focus:border-white/18 font-light transition-colors"
          />
          <button type="button" onClick={() => remove(i)}
            className="text-white/20 hover:text-white/55 transition-colors p-1 shrink-0">
            <X size={12}/>
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="flex items-center gap-1.5 text-[10px] text-white/28 hover:text-white/55 transition-colors font-light w-fit">
        <Plus size={11}/> Add link
      </button>
    </div>
  );
}

// ─── Create / Edit Panel ──────────────────────────────────────────────────────

function DeliveryForm({
  project,
  editing,
  onClose,
  onSave,
  onDelete,
}: {
  project: Project;
  editing: Delivery | null;
  onClose: () => void;
  onSave: (d: Partial<Delivery>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const isEdit = editing !== null;
  const [dept,    setDept]   = useState(editing?.department ?? project.departments[0] ?? "");
  const [title,   setTitle]  = useState(editing?.title ?? "");
  const [notes,   setNotes]  = useState(editing?.notes ?? "");
  const [links,   setLinks]  = useState<{ label: string; url: string }[]>(editing?.links ?? []);
  const [saving,  setSaving] = useState(false);
  const [error,   setError]  = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title required"); return; }
    setSaving(true); setError("");
    try {
      const validLinks = links.filter(l => l.url.trim());
      await onSave({ department: dept, title: title.trim(), notes: notes.trim() || null, links: validLinks });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm(`Delete this delivery package?`)) return;
    setSaving(true);
    await onDelete();
    onClose();
  }

  const dMeta = DEPT_META[dept];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-lg mx-4 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]"
          style={{ background: dMeta ? dMeta.hex + "08" : "transparent" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: dMeta?.bg, color: dMeta?.accent }}>
              {dMeta?.icon ?? <Package size={14}/>}
            </div>
            <div>
              <p className="text-white/70 text-sm font-light">{isEdit ? "Edit delivery" : "New delivery package"}</p>
              <p className="text-white/25 text-[10px] font-light">{isEdit ? editing.department : "Create a final delivery for your client"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/22 hover:text-white/55 transition-colors"><X size={15}/></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">

          {/* Department - only on create */}
          {!isEdit && (
            <div>
              <label className="text-white/28 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Department</label>
              <div className="flex flex-wrap gap-2">
                {project.departments.map(d => {
                  const m = DEPT_META[d];
                  const active = dept === d;
                  return (
                    <button key={d} type="button" onClick={() => setDept(d)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-light transition-all ${active ? "border-white/20 text-white/80" : "border-white/8 text-white/30 hover:border-white/15 hover:text-white/55"}`}
                      style={active ? { background: m?.bg, borderColor: m?.hex + "40", color: m?.accent } : {}}>
                      {m?.icon}{d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-white/28 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Package Title</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="e.g. Final Mix - Stereo + 5.1"
              className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/16 outline-none focus:border-white/18 transition-colors font-light"/>
          </div>

          {/* Links */}
          <div>
            <label className="text-white/28 text-[10px] tracking-[0.2em] uppercase font-light mb-2.5 block">Delivery Links</label>
            <LinkEditor links={links} onChange={setLinks}/>
          </div>

          {/* Notes */}
          <div>
            <label className="text-white/28 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Notes for Client</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Delivery specs, format info, revision notes…"
              className="w-full bg-white/[0.04] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/75 placeholder-white/16 outline-none focus:border-white/18 transition-colors font-light resize-none"/>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400/75 text-xs font-light">
              <AlertCircle size={12}/>{error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-black text-xs font-medium py-3 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
              <Package size={12}/>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create package"}
            </button>
            {isEdit && onDelete && (
              <button type="button" onClick={handleDelete} disabled={saving}
                className="w-10 h-10 flex items-center justify-center border border-rose-500/20 text-rose-400/60 hover:text-rose-400 hover:border-rose-500/40 rounded-xl transition-all">
                <Trash2 size={13}/>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delivery Card ────────────────────────────────────────────────────────────

function DeliveryCard({
  delivery,
  projectId,
  canEdit,
  onUpdate,
  onDelete,
  onEdit,
}: {
  delivery: Delivery;
  projectId: string;
  canEdit: boolean;
  onUpdate: (d: Delivery) => void;
  onDelete: (id: string) => void;
  onEdit: (d: Delivery) => void;
}) {
  const [advancing, setAdvancing] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [copied, setCopied]       = useState(false);

  const st    = STATUS_META[delivery.status];
  const dMeta = DEPT_META[delivery.department] ?? { icon: <Package size={14}/>, accent: "#6B7280", bg: "rgba(107,114,128,0.08)", hex: "#6B7280" };

  async function advanceStatus() {
    if (!st.next) return;
    setAdvancing(true);
    const res = await fetch(`/api/projects/${projectId}/deliveries/${delivery.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: st.next }),
    });
    if (res.ok) onUpdate(await res.json());
    setAdvancing(false);
  }

  async function revertToPreparing() {
    setReverting(true);
    const res = await fetch(`/api/projects/${projectId}/deliveries/${delivery.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "preparing" }),
    });
    if (res.ok) onUpdate(await res.json());
    setReverting(false);
  }

  function copyAllLinks() {
    const text = delivery.links.map(l => `${l.label ? l.label + ": " : ""}${l.url}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isConfirmed = delivery.status === "confirmed";

  return (
    <div className={`rounded-2xl border transition-all ${isConfirmed ? "border-emerald-400/15 bg-emerald-500/[0.02]" : "border-white/[0.06] bg-white/[0.015]"} overflow-hidden group`}>

      {/* Card top accent */}
      <div className="h-0.5 w-full" style={{ background: isConfirmed ? "linear-gradient(90deg,#10b98130,#10b98160,#10b98130)" : `linear-gradient(90deg,${dMeta.hex}20,${dMeta.hex}50,${dMeta.hex}20)` }}/>

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: dMeta.bg, color: dMeta.accent }}>
              {dMeta.icon}
            </div>
            <div>
              <p className="text-white/75 text-sm font-light leading-snug">{delivery.title}</p>
              <p className="text-white/22 text-[10px] font-light mt-0.5">{delivery.department}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[9px] font-light tracking-wide uppercase shrink-0 ${st.cls}`}>
            {st.icon}
            {st.label}
          </div>
        </div>

        {/* Links */}
        {delivery.links.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-4">
            {delivery.links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/14 bg-white/[0.02] hover:bg-white/[0.04] transition-all group/link">
                <Link2 size={11} className="text-white/25 group-hover/link:text-white/55 transition-colors shrink-0"/>
                <span className="text-white/55 text-[11px] font-light truncate flex-1 group-hover/link:text-white/75 transition-colors">
                  {l.label || l.url}
                </span>
                <ExternalLink size={10} className="text-white/18 group-hover/link:text-white/45 transition-colors shrink-0"/>
              </a>
            ))}
          </div>
        )}

        {/* Notes */}
        {delivery.notes && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <p className="text-white/35 text-[11px] font-light leading-relaxed">{delivery.notes}</p>
          </div>
        )}

        {/* Delivery timestamp */}
        {delivery.delivered_at && (
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-1.5 h-1.5 rounded-full ${delivery.status === "confirmed" ? "bg-emerald-400" : "bg-amber-400"}`}/>
            <p className="text-white/22 text-[10px] font-light">
              {delivery.status === "confirmed" ? "Confirmed" : "Sent"} on {formatDate(delivery.delivered_at)} at {formatTime(delivery.delivered_at)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Advance status */}
          {canEdit && st.next && (
            <button onClick={advanceStatus} disabled={advancing}
              className={`flex items-center gap-1.5 text-[10px] font-light px-3 py-2 rounded-xl border transition-all disabled:opacity-40 ${
                st.next === "sent"
                  ? "border-amber-400/25 text-amber-300/75 hover:bg-amber-500/8 hover:border-amber-400/40"
                  : "border-emerald-400/25 text-emerald-300/75 hover:bg-emerald-500/8 hover:border-emerald-400/40"
              }`}>
              {st.next === "sent" ? <Send size={11}/> : <CheckCircle2 size={11}/>}
              {advancing ? "Updating…" : st.nextLabel}
            </button>
          )}

          {/* Revert (if not preparing) */}
          {canEdit && delivery.status !== "preparing" && (
            <button onClick={revertToPreparing} disabled={reverting}
              className="flex items-center gap-1.5 text-[10px] font-light px-3 py-2 rounded-xl border border-white/8 text-white/25 hover:text-white/55 hover:border-white/18 transition-all disabled:opacity-40">
              <RotateCcw size={10}/>
              {reverting ? "…" : "Revert"}
            </button>
          )}

          {/* Copy links */}
          {delivery.links.length > 0 && (
            <button onClick={copyAllLinks}
              className={`flex items-center gap-1.5 text-[10px] font-light px-3 py-2 rounded-xl border transition-all ${copied ? "border-emerald-400/30 text-emerald-400/70" : "border-white/8 text-white/28 hover:border-white/18 hover:text-white/55"}`}>
              {copied ? <Check size={10}/> : <Copy size={10}/>}
              {copied ? "Copied!" : "Copy links"}
            </button>
          )}

          {/* Edit */}
          {canEdit && (
            <button onClick={() => onEdit(delivery)}
              className="ml-auto flex items-center gap-1.5 text-[10px] font-light text-white/20 hover:text-white/50 transition-colors">
              <Pencil size={10}/> Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Delivery Component ──────────────────────────────────────────────────

export default function DeliveryTab({
  project,
  initialDeliveries,
  canEdit,
}: {
  project: Project;
  initialDeliveries: Delivery[];
  canEdit: boolean;
}) {
  const [deliveries, setDeliveries]     = useState<Delivery[]>(initialDeliveries);
  const [activeDept, setActiveDept]     = useState<string | "all">("all");
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState<Delivery | null>(null);

  const depts = project.departments;

  // Group by dept + filter
  const filtered = useMemo(() =>
    activeDept === "all" ? deliveries : deliveries.filter(d => d.department === activeDept),
  [deliveries, activeDept]);

  // Dept summary for tab pills
  const deptSummary = useMemo(() => {
    return depts.map(d => ({
      dept: d,
      total: deliveries.filter(dl => dl.department === d).length,
      confirmed: deliveries.filter(dl => dl.department === d && dl.status === "confirmed").length,
      sent: deliveries.filter(dl => dl.department === d && dl.status === "sent").length,
    }));
  }, [deliveries, depts]);

  const totalConfirmed = deliveries.filter(d => d.status === "confirmed").length;
  const totalSent      = deliveries.filter(d => d.status === "sent").length;

  async function handleCreate(data: Partial<Delivery>) {
    const res = await fetch(`/api/projects/${project.id}/deliveries`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const created: Delivery = await res.json();
    setDeliveries(prev => [created, ...prev]);
  }

  async function handleEdit(data: Partial<Delivery>) {
    if (!editing) return;
    const res = await fetch(`/api/projects/${project.id}/deliveries/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const updated: Delivery = await res.json();
    setDeliveries(prev => prev.map(d => d.id === editing.id ? updated : d));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/projects/${project.id}/deliveries/${id}`, { method: "DELETE" });
    setDeliveries(prev => prev.filter(d => d.id !== id));
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-white/72 text-sm font-light">Final Deliveries</h2>
            <p className="text-white/22 text-[10px] font-light mt-0.5">
              {deliveries.length === 0
                ? "No packages yet"
                : `${totalConfirmed} confirmed · ${totalSent} sent · ${deliveries.length - totalConfirmed - totalSent} preparing`}
            </p>
          </div>

          {/* Overall progress dots */}
          {deliveries.length > 0 && (
            <div className="flex items-center gap-1.5">
              {deliveries.map(d => (
                <div key={d.id} title={`${d.department} - ${STATUS_META[d.status].label}`}
                  className={`w-2 h-2 rounded-full transition-all ${
                    d.status === "confirmed" ? "bg-emerald-400/70" :
                    d.status === "sent"      ? "bg-amber-400/60" : "bg-white/15"
                  }`}/>
              ))}
            </div>
          )}
        </div>

        {canEdit && (
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/72 border border-white/10 hover:border-white/22 px-3.5 py-2 rounded-xl transition-all font-light">
            <Plus size={11}/> New package
          </button>
        )}
      </div>

      {/* ── Dept filter pills ── */}
      {depts.length > 1 && (
        <div className="flex items-center gap-2 mb-6 shrink-0 flex-wrap">
          <button onClick={() => setActiveDept("all")}
            className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full border font-light transition-all ${
              activeDept === "all" ? "bg-white/8 border-white/18 text-white/75" : "border-white/8 text-white/28 hover:border-white/16 hover:text-white/52"
            }`}>
            All <span className="opacity-60">{deliveries.length}</span>
          </button>
          {deptSummary.map(({ dept, total, confirmed, sent }) => {
            const m = DEPT_META[dept];
            const active = activeDept === dept;
            return (
              <button key={dept} onClick={() => setActiveDept(dept)}
                className={`flex items-center gap-2 text-[10px] px-3 py-1.5 rounded-full border font-light transition-all`}
                style={active
                  ? { background: m?.hex + "15", borderColor: m?.hex + "40", color: m?.accent }
                  : { borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)" }}>
                <span style={{ color: active ? m?.accent : "rgba(255,255,255,0.22)" }}>{m?.icon}</span>
                {dept}
                {total > 0 && (
                  <span className={`${confirmed === total && total > 0 ? "text-emerald-400/70" : "opacity-55"}`}>
                    {confirmed}/{total}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Cards ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 border border-dashed border-white/[0.05] rounded-2xl">
            <Package size={28} className="text-white/10"/>
            <div className="text-center">
              <p className="text-white/28 text-sm font-light">No delivery packages yet</p>
              {canEdit && <p className="text-white/15 text-xs font-light mt-0.5">Create your first package to start delivering</p>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map(d => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                projectId={project.id}
                canEdit={canEdit}
                onUpdate={updated => setDeliveries(prev => prev.map(x => x.id === updated.id ? updated : x))}
                onDelete={handleDelete}
                onEdit={d => { setEditing(d); setShowForm(true); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Form modal ── */}
      {showForm && (
        <DeliveryForm
          project={project}
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={editing ? handleEdit : handleCreate}
          onDelete={editing ? () => handleDelete(editing.id) : undefined}
        />
      )}
    </div>
  );
}
