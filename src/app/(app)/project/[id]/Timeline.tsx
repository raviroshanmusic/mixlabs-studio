"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plus, ChevronLeft, ChevronRight, X, Check, Trash2,
  Calendar, ZoomIn, ZoomOut, RefreshCw, AlertCircle, Link2, GripVertical,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Milestone = {
  id: string;
  title: string;
  department: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  status: "planned" | "active" | "completed";
  progress: number;                 // 0–100
  linked_version_id: string | null; // → project_versions.id
  created_at: string;
};

type Project = { id: string; departments: string[] };
type VersionLite = { id: string; version_name: string; department: string | null };

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_PX: Record<"month" | "week", number> = { month: 32, week: 64 };
const ROW_H    = 56;
const HEAD_H   = 66;   // month band (26) + day band (40)
const MONTH_H  = 26;
const SIDE_W   = 188;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WD      = ["S","M","T","W","T","F","S"];

const DEPT_COLOR: Record<string, { bar: string; fill: string; border: string; text: string; dot: string }> = {
  Sound:     { bar: "rgba(245,158,11,0.16)",  fill: "rgba(245,158,11,0.45)",  border: "rgba(251,191,36,0.45)",  text: "#fcd34d", dot: "#fbbf24" },
  Score:     { bar: "rgba(139,92,246,0.16)",   fill: "rgba(139,92,246,0.45)",  border: "rgba(167,139,250,0.45)", text: "#c4b5fd", dot: "#a78bfa" },
  Color:     { bar: "rgba(236,72,153,0.16)",   fill: "rgba(236,72,153,0.45)",  border: "rgba(244,114,182,0.45)", text: "#f9a8d4", dot: "#f472b6" },
  Edit:      { bar: "rgba(59,130,246,0.16)",   fill: "rgba(59,130,246,0.45)",  border: "rgba(96,165,250,0.45)",  text: "#93c5fd", dot: "#60a5fa" },
  Animation: { bar: "rgba(16,185,129,0.16)",   fill: "rgba(16,185,129,0.45)",  border: "rgba(52,211,153,0.45)",  text: "#6ee7b7", dot: "#34d399" },
  VFX:       { bar: "rgba(249,115,22,0.16)",   fill: "rgba(249,115,22,0.45)",  border: "rgba(251,146,60,0.45)",  text: "#fdba74", dot: "#fb923c" },
};
const FALLBACK = { bar: "rgba(255,255,255,0.06)", fill: "rgba(255,255,255,0.28)", border: "rgba(255,255,255,0.22)", text: "rgba(255,255,255,0.65)", dot: "rgba(255,255,255,0.45)" };
const OVERDUE  = { bar: "rgba(244,63,94,0.16)",  fill: "rgba(244,63,94,0.5)",   border: "rgba(251,113,133,0.55)", text: "#fda4af", dot: "#fb7185" };

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  planned:   { label: "Planned",   cls: "bg-white/5 border-white/10 text-white/40" },
  active:    { label: "Active",    cls: "bg-amber-500/15 border-amber-400/30 text-amber-300" },
  completed: { label: "Completed", cls: "bg-emerald-500/15 border-emerald-400/30 text-emerald-300" },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function today0(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function parseD(s: string): Date { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function toISO(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function daysBetween(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / 86400000); }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function isWeekend(d: Date): boolean { const w = d.getDay(); return w === 0 || w === 6; }
function fmtDisplay(s: string): string { const d = parseD(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

// "health" of a milestone relative to today
function health(m: Milestone): "completed" | "overdue" | "soon" | "normal" {
  if (m.status === "completed") return "completed";
  const end = parseD(m.end_date), t = today0();
  if (end < t) return "overdue";
  if (daysBetween(t, end) <= 3) return "soon";
  return "normal";
}

// ─── Compute visible range ────────────────────────────────────────────────────

function computeRange(milestones: Milestone[]): { start: Date; end: Date; totalDays: number } {
  const t = today0();
  let start = startOfMonth(addDays(t, -30));
  let end   = endOfMonth(addDays(t, 150));
  for (const m of milestones) {
    const s = parseD(m.start_date), e = parseD(m.end_date);
    if (s < start) start = startOfMonth(addDays(s, -7));
    if (e > end)   end   = endOfMonth(addDays(e, 7));
  }
  return { start, end, totalDays: daysBetween(start, end) + 1 };
}

// ─── Add / Edit / View panel ────────────────────────────────────────────────────

function MilestonePanel({
  project, versions, editing, readOnly, onClose, onSave, onDelete,
}: {
  project: Project;
  versions: VersionLite[];
  editing: Milestone | null; // null = add mode
  readOnly: boolean;
  onClose: () => void;
  onSave: (m: Omit<Milestone, "id" | "created_at">) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const isEdit = editing !== null;
  const [title,   setTitle]   = useState(editing?.title ?? "");
  const [dept,    setDept]    = useState(editing?.department ?? "");
  const [start,   setStart]   = useState(editing?.start_date ?? toISO(today0()));
  const [end,     setEnd]     = useState(editing?.end_date   ?? toISO(addDays(today0(), 14)));
  const [status,  setStatus]  = useState<Milestone["status"]>(editing?.status ?? "planned");
  const [progress,setProgress]= useState<number>(editing?.progress ?? 0);
  const [linked,  setLinked]  = useState<string>(editing?.linked_version_id ?? "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!title.trim()) { setError("Title is required"); return; }
    if (new Date(end) < new Date(start)) { setError("End date must be after start date"); return; }
    setSaving(true); setError("");
    try {
      await onSave({
        title: title.trim(), department: dept || null, start_date: start, end_date: end,
        status, progress: status === "completed" ? 100 : progress, linked_version_id: linked || null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!editing || !onDelete) return;
    if (!confirm(`Delete "${editing.title}"?`)) return;
    setSaving(true);
    await onDelete(editing.id);
    onClose();
  }

  const dur = daysBetween(parseD(start), parseD(end)) + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-[#111] border border-white/12 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <Calendar size={14} className="text-white/35" />
            <p className="text-white/70 text-sm font-light">{readOnly ? "Milestone" : isEdit ? "Edit milestone" : "Add milestone"}</p>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors"><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Milestone</label>
            <input
              autoFocus={!readOnly} value={title} onChange={e => setTitle(e.target.value)} required disabled={readOnly}
              placeholder="e.g. Score composition complete"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/18 outline-none focus:border-white/22 transition-colors font-light disabled:opacity-70"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Start</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} required disabled={readOnly}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-3 text-sm text-white/70 outline-none focus:border-white/22 transition-colors font-light [color-scheme:dark] disabled:opacity-70" />
            </div>
            <div>
              <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">End</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} required disabled={readOnly}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-3 text-sm text-white/70 outline-none focus:border-white/22 transition-colors font-light [color-scheme:dark] disabled:opacity-70" />
            </div>
          </div>

          <div>
            <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Department</label>
            <select value={dept} onChange={e => setDept(e.target.value)} disabled={readOnly}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 outline-none focus:border-white/22 transition-colors font-light [color-scheme:dark] disabled:opacity-70">
              <option value="">No department</option>
              {project.departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Linked deliverable / version */}
          <div>
            <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Linked file</label>
            <select value={linked} onChange={e => setLinked(e.target.value)} disabled={readOnly}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 outline-none focus:border-white/22 transition-colors font-light [color-scheme:dark] disabled:opacity-70">
              <option value="">None</option>
              {versions.map(v => <option key={v.id} value={v.id}>{v.version_name}{v.department ? ` · ${v.department}` : ""}</option>)}
            </select>
          </div>

          <div>
            <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Status</label>
            <div className="flex gap-2">
              {(["planned", "active", "completed"] as const).map(s => (
                <button key={s} type="button" disabled={readOnly} onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-light border transition-all capitalize disabled:opacity-70 ${
                    status === s ? STATUS_STYLE[s].cls : "border-white/8 text-white/28 hover:border-white/15"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Progress */}
          {status !== "completed" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light">Progress</label>
                <span className="text-white/55 text-xs font-light tabular-nums">{progress}%</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={progress} disabled={readOnly}
                onChange={e => setProgress(Number(e.target.value))}
                className="w-full accent-amber-400 disabled:opacity-50" />
            </div>
          )}

          {start && end && new Date(end) >= new Date(start) && (
            <p className="text-white/25 text-xs font-light text-center">
              {dur} day{dur !== 1 ? "s" : ""} · {fmtDisplay(start)} → {fmtDisplay(end)}
            </p>
          )}

          {error && (
            <div className="flex items-center gap-2 text-rose-400/80 text-xs font-light">
              <AlertCircle size={12} /> {error}
            </div>
          )}

          {!readOnly && (
            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-black text-xs font-medium py-3 rounded-xl hover:bg-white/90 disabled:opacity-30 transition-all">
                <Check size={12} />
                {saving ? "Saving…" : isEdit ? "Save changes" : "Add milestone"}
              </button>
              {isEdit && onDelete && (
                <button type="button" onClick={handleDelete} disabled={saving}
                  className="w-10 h-10 flex items-center justify-center border border-rose-500/20 text-rose-400/60 hover:text-rose-400 hover:border-rose-500/40 rounded-xl transition-all disabled:opacity-30">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ m, versionName }: { m: Milestone; versionName?: string }) {
  const c = DEPT_COLOR[m.department ?? ""] ?? FALLBACK;
  const days = daysBetween(parseD(m.start_date), parseD(m.end_date)) + 1;
  const st = STATUS_STYLE[m.status];
  const h = health(m);
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 pointer-events-none min-w-[190px]">
      <div className="bg-[#1a1a1a] border border-white/12 rounded-xl px-3.5 py-3 shadow-2xl shadow-black/60">
        <p className="text-xs font-medium mb-1.5" style={{ color: c.text }}>{m.title}</p>
        {m.department && <p className="text-white/35 text-[10px] font-light mb-2">{m.department}</p>}
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/25 text-[10px] font-light">{fmtDisplay(m.start_date)}</span>
          <span className="text-white/15 text-[10px]">→</span>
          <span className="text-white/25 text-[10px] font-light">{fmtDisplay(m.end_date)}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-white/20 text-[10px] font-light">{days} day{days !== 1 ? "s" : ""}{m.status !== "completed" ? ` · ${m.progress}%` : ""}</span>
          {h === "overdue"
            ? <span className="text-[9px] px-1.5 py-0.5 rounded-md border font-light bg-rose-500/15 border-rose-400/30 text-rose-300">Overdue</span>
            : <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-light ${st.cls}`}>{st.label}</span>}
        </div>
        {versionName && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/[0.06]">
            <Link2 size={9} className="text-white/30" />
            <span className="text-white/40 text-[10px] font-light truncate">{versionName}</span>
          </div>
        )}
      </div>
      <div className="w-px h-2 bg-white/10 mx-auto" />
    </div>
  );
}

// ─── Main Timeline ─────────────────────────────────────────────────────────────

export default function Timeline({
  project, initialMilestones, versions = [], canEdit = false,
}: {
  project: Project;
  initialMilestones: Milestone[];
  versions?: VersionLite[];
  canEdit?: boolean;
}) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [zoom, setZoom]             = useState<"month" | "week">("month");
  const [panel, setPanel]           = useState<"add" | Milestone | null>(null);
  const [hovered, setHovered]       = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [preview, setPreview]       = useState<{ id: string; start: string; end: string } | null>(null);

  const scrollRef    = useRef<HTMLDivElement>(null);
  const dragRef      = useRef<{ id: string; mode: "move" | "l" | "r"; startX: number; origStart: string; origEnd: string; curStart: string; curEnd: string; moved: boolean } | null>(null);
  const justDragged  = useRef(false);
  const dayPx        = DAY_PX[zoom];

  const versionMap = useMemo(() => Object.fromEntries(versions.map(v => [v.id, v])), [versions]);

  // Apply live preview dates while dragging
  const effective = useMemo(() => milestones.map(m =>
    preview && preview.id === m.id ? { ...m, start_date: preview.start, end_date: preview.end } : m
  ), [milestones, preview]);

  const { start, end, totalDays } = useMemo(() => computeRange(effective), [effective]);
  const todayOffset = useMemo(() => daysBetween(start, today0()), [start]);
  const totalWidth  = totalDays * dayPx;

  // All days in range — for day ticks + weekend shading
  const days = useMemo(() => {
    const arr: { d: Date; offset: number }[] = [];
    let cur = new Date(start); let i = 0;
    while (cur <= end) { arr.push({ d: new Date(cur), offset: i }); cur = addDays(cur, 1); i++; }
    return arr;
  }, [start, end]);

  // Scroll to today on mount / zoom change
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayX = SIDE_W + todayOffset * dayPx;
    scrollRef.current.scrollLeft = Math.max(0, todayX - scrollRef.current.clientWidth / 2);
  }, [zoom, todayOffset, dayPx]);

  // Auto-poll every 45s (paused mid-drag)
  useEffect(() => {
    const iv = setInterval(async () => {
      if (dragRef.current) return;
      const res = await fetch(`/api/projects/${project.id}/milestones`);
      if (res.ok) setMilestones(await res.json());
    }, 45000);
    return () => clearInterval(iv);
  }, [project.id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const res = await fetch(`/api/projects/${project.id}/milestones`);
    if (res.ok) setMilestones(await res.json());
    setRefreshing(false);
  }, [project.id]);

  function scrollBy(dir: -1 | 1) {
    scrollRef.current?.scrollBy({ left: dir * dayPx * 30, behavior: "smooth" });
  }
  function goToday() {
    if (!scrollRef.current) return;
    const todayX = SIDE_W + todayOffset * dayPx;
    scrollRef.current.scrollTo({ left: Math.max(0, todayX - scrollRef.current.clientWidth / 2), behavior: "smooth" });
  }

  async function persistDates(id: string, s: string, e: string) {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, start_date: s, end_date: e } : m));
    try {
      const res = await fetch(`/api/projects/${project.id}/milestones/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: s, end_date: e }),
      });
      if (res.ok) { const u: Milestone = await res.json(); setMilestones(prev => prev.map(m => m.id === id ? u : m)); }
    } catch { /* keep optimistic */ }
  }

  // ── Drag (move / resize) ──
  function beginDrag(e: React.PointerEvent, m: Milestone, mode: "move" | "l" | "r") {
    if (!canEdit) return;
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { id: m.id, mode, startX: e.clientX, origStart: m.start_date, origEnd: m.end_date, curStart: m.start_date, curEnd: m.end_date, moved: false };

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current; if (!d) return;
      const delta = Math.round((ev.clientX - d.startX) / dayPx);
      if (delta !== 0) d.moved = true;
      let s = parseD(d.origStart), en = parseD(d.origEnd);
      if (d.mode === "move") { s = addDays(s, delta); en = addDays(en, delta); }
      else if (d.mode === "l") { s = addDays(s, delta); if (s > en) s = en; }
      else { en = addDays(en, delta); if (en < s) en = s; }
      d.curStart = toISO(s); d.curEnd = toISO(en);
      setPreview({ id: d.id, start: d.curStart, end: d.curEnd });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const d = dragRef.current; dragRef.current = null; setPreview(null);
      if (d && d.moved && (d.curStart !== d.origStart || d.curEnd !== d.origEnd)) {
        justDragged.current = true;
        setTimeout(() => { justDragged.current = false; }, 0);
        persistDates(d.id, d.curStart, d.curEnd);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // CRUD
  async function handleAdd(data: Omit<Milestone, "id" | "created_at">) {
    const res = await fetch(`/api/projects/${project.id}/milestones`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) { throw new Error((await res.json()).error); }
    const created: Milestone = await res.json();
    setMilestones(prev => [...prev, created].sort((a, b) => a.start_date.localeCompare(b.start_date)));
  }
  async function handleEdit(data: Omit<Milestone, "id" | "created_at">) {
    if (!panel || panel === "add") return;
    const id = (panel as Milestone).id;
    const res = await fetch(`/api/projects/${project.id}/milestones/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) { throw new Error((await res.json()).error); }
    const updated: Milestone = await res.json();
    setMilestones(prev => prev.map(m => m.id === id ? updated : m).sort((a, b) => a.start_date.localeCompare(b.start_date)));
  }
  async function handleDelete(id: string) {
    await fetch(`/api/projects/${project.id}/milestones/${id}`, { method: "DELETE" });
    setMilestones(prev => prev.filter(m => m.id !== id));
  }

  // Month header bands
  const monthCells = useMemo(() => {
    const cells: { label: string; days: number; offset: number }[] = [];
    let cursor = new Date(start); let offset = 0;
    while (cursor <= end) {
      const eoM = endOfMonth(cursor);
      const clamped = eoM < end ? eoM : end;
      const d = daysBetween(cursor, clamped) + 1;
      cells.push({ label: `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`, days: d, offset });
      offset += d; cursor = addDays(eoM, 1);
    }
    return cells;
  }, [start, end]);

  // Lane stacking
  const rows = useMemo(() => {
    const sorted = [...effective].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const lanes: Milestone[][] = [];
    for (const m of sorted) {
      const ms = parseD(m.start_date).getTime();
      let placed = false;
      for (const lane of lanes) {
        if (parseD(lane[lane.length - 1].end_date).getTime() < ms) { lane.push(m); placed = true; break; }
      }
      if (!placed) lanes.push([m]);
    }
    return lanes;
  }, [effective]);

  const totalRows = Math.max(rows.length, 4);
  const canvasH   = totalRows * ROW_H;
  const showDayNums = dayPx >= 30; // month+ zoom shows per-day numbers

  return (
    <div className="flex flex-col select-none px-6 md:px-10 pb-10 pt-4" style={{ minHeight: 600 }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => z === "month" ? "week" : "month")}
            className="flex items-center gap-1.5 text-[10px] text-white/35 hover:text-white/65 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all font-light">
            {zoom === "month" ? <ZoomIn size={11} /> : <ZoomOut size={11} />}
            {zoom === "month" ? "Week view" : "Month view"}
          </button>
          <button onClick={() => scrollBy(-1)} className="w-7 h-7 flex items-center justify-center text-white/25 hover:text-white/60 border border-white/8 hover:border-white/18 rounded-lg transition-all"><ChevronLeft size={13} /></button>
          <button onClick={() => scrollBy(1)} className="w-7 h-7 flex items-center justify-center text-white/25 hover:text-white/60 border border-white/8 hover:border-white/18 rounded-lg transition-all"><ChevronRight size={13} /></button>
          <button onClick={goToday} className="text-[10px] text-white/30 hover:text-white/60 border border-white/8 hover:border-white/18 px-3 py-1.5 rounded-lg transition-all font-light">Today</button>
          <button onClick={handleRefresh} className={`w-7 h-7 flex items-center justify-center text-white/22 hover:text-white/55 border border-white/8 rounded-lg transition-all ${refreshing ? "animate-spin" : ""}`}><RefreshCw size={11} /></button>
        </div>

        {canEdit && (
          <button onClick={() => setPanel("add")}
            className="flex items-center gap-1.5 text-xs text-black bg-white hover:bg-white/90 px-3.5 py-1.5 rounded-xl transition-all font-medium">
            <Plus size={12} /> Add milestone
          </button>
        )}
      </div>

      {/* ── Canvas ── */}
      <div className="border border-white/[0.07] rounded-2xl overflow-hidden bg-[#070707]" style={{ height: Math.max(canvasH + HEAD_H + 2, 320) }}>
        <div ref={scrollRef} className="overflow-auto h-full">
          <div style={{ width: SIDE_W + totalWidth, minHeight: HEAD_H + canvasH }}>

            {/* ── Header ── */}
            <div className="sticky top-0 z-20 bg-[#0c0c0c] border-b border-white/[0.08]">
              <div style={{ height: HEAD_H }} className="relative flex">
                {/* Sidebar header */}
                <div className="shrink-0 sticky left-0 z-10 bg-[#0c0c0c] flex items-end pb-2.5 px-4 border-r border-white/[0.08]" style={{ width: SIDE_W }}>
                  <span className="text-[9px] tracking-[0.22em] uppercase text-white/25 font-light">Milestone</span>
                </div>
                <div className="flex-1 relative">
                  {/* Month band */}
                  <div className="absolute top-0 left-0 right-0" style={{ height: MONTH_H }}>
                    {monthCells.map((c, i) => (
                      <div key={i} className="absolute top-0 flex items-center border-r border-white/[0.07] bg-white/[0.015]"
                        style={{ left: c.offset * dayPx, width: c.days * dayPx, height: MONTH_H }}>
                        <span className="text-[11px] text-white/55 font-medium px-3 truncate tracking-wide">{c.label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Day band */}
                  <div className="absolute left-0 right-0" style={{ top: MONTH_H, height: HEAD_H - MONTH_H }}>
                    {days.map(({ d, offset }) => {
                      const isToday = offset === todayOffset;
                      const wknd = isWeekend(d);
                      return (
                        <div key={offset} className="absolute top-0 bottom-0 flex flex-col items-center justify-center border-r border-white/[0.04]"
                          style={{ left: offset * dayPx, width: dayPx, background: wknd ? "rgba(255,255,255,0.022)" : "transparent" }}>
                          <span className={`text-[8px] leading-none font-light ${wknd ? "text-white/20" : "text-white/30"}`}>{WD[d.getDay()]}</span>
                          {showDayNums && (
                            isToday ? (
                              <span className="mt-1 w-[18px] h-[18px] rounded-full bg-amber-400 text-black text-[10px] font-semibold flex items-center justify-center tabular-nums">{d.getDate()}</span>
                            ) : (
                              <span className={`mt-1 text-[10px] leading-none tabular-nums font-light ${wknd ? "text-white/25" : "text-white/45"}`}>{d.getDate()}</span>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Rows ── */}
            <div className="relative" style={{ height: canvasH }}>
              {/* Sidebar */}
              <div className="sticky left-0 z-10 absolute top-0 bottom-0 border-r border-white/[0.08] bg-[#070707]" style={{ width: SIDE_W }}>
                {rows.map((lane, ri) => {
                  const m = lane[0];
                  const c = DEPT_COLOR[m?.department ?? ""] ?? FALLBACK;
                  const h = m ? health(m) : "normal";
                  return (
                    <div key={ri} className="border-b border-white/[0.04] px-4 flex items-center" style={{ height: ROW_H }}>
                      {m && (
                        <div className="min-w-0 w-full">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: h === "overdue" ? OVERDUE.dot : c.dot }} />
                            <p className="text-white/65 text-xs font-light truncate leading-tight flex-1">{m.title}</p>
                            {m.linked_version_id && <Link2 size={10} className="text-white/25 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1 pl-3.5">
                            {m.department && <span className="text-white/22 text-[9px] font-light">{m.department}</span>}
                            {h === "overdue"
                              ? <span className="text-[8px] text-rose-300/90 font-medium">Overdue</span>
                              : m.status === "completed"
                                ? <span className="text-[8px] text-emerald-300/80 font-light">Done</span>
                                : <span className="text-white/22 text-[9px] font-light tabular-nums">{m.progress}%</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {Array.from({ length: Math.max(0, totalRows - rows.length) }).map((_, i) => (
                  <div key={`e-${i}`} className="border-b border-white/[0.04]" style={{ height: ROW_H }} />
                ))}
              </div>

              {/* Grid + bars */}
              <div className="absolute top-0 bottom-0" style={{ left: SIDE_W, right: 0 }}>
                {/* Weekend shading */}
                {days.filter(({ d }) => isWeekend(d)).map(({ offset }) => (
                  <div key={`w-${offset}`} className="absolute top-0 bottom-0" style={{ left: offset * dayPx, width: dayPx, background: "rgba(255,255,255,0.018)" }} />
                ))}
                {/* Month boundary lines */}
                {monthCells.map((c, i) => (
                  <div key={`m-${i}`} className="absolute top-0 bottom-0 border-r border-white/[0.05]" style={{ left: (c.offset + c.days) * dayPx }} />
                ))}
                {/* Row backgrounds */}
                {Array.from({ length: totalRows }).map((_, ri) => (
                  <div key={ri} className="absolute border-b border-white/[0.04]" style={{ left: 0, right: 0, top: ri * ROW_H, height: ROW_H }} />
                ))}
                {/* Today line */}
                {todayOffset >= 0 && todayOffset <= totalDays && (
                  <div className="absolute top-0 bottom-0 pointer-events-none z-10" style={{ left: todayOffset * dayPx + dayPx / 2 - 0.5, width: 1 }}>
                    <div className="w-full h-full bg-amber-400/30" />
                  </div>
                )}

                {/* Bars */}
                {rows.map((lane, ri) =>
                  lane.map(m => {
                    const barStart = daysBetween(start, parseD(m.start_date));
                    const barDays  = daysBetween(parseD(m.start_date), parseD(m.end_date)) + 1;
                    const barLeft  = barStart * dayPx;
                    const barW     = Math.max(barDays * dayPx - 4, 22);
                    const h        = health(m);
                    const c        = h === "overdue" ? OVERDUE : (DEPT_COLOR[m.department ?? ""] ?? FALLBACK);
                    const isHover  = hovered === m.id;
                    const isDone   = m.status === "completed";
                    const fillPct  = isDone ? 100 : m.progress;
                    const dragging = dragRef.current?.id === m.id;
                    const v        = m.linked_version_id ? versionMap[m.linked_version_id] : null;

                    return (
                      <div key={m.id}
                        className="absolute group/bar"
                        style={{ top: ri * ROW_H + 11, left: barLeft + 2, height: ROW_H - 22 }}
                        onMouseEnter={() => setHovered(m.id)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        {isHover && !dragging && <Tooltip m={m} versionName={v?.version_name} />}

                        <div
                          onPointerDown={e => beginDrag(e, m, "move")}
                          onClick={() => { if (!justDragged.current) setPanel(m); }}
                          className={`relative h-full rounded-lg border flex items-center px-2.5 overflow-hidden transition-[filter,box-shadow] duration-150 ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${isHover ? "brightness-110 shadow-lg shadow-black/40" : ""}`}
                          style={{
                            width: barW,
                            background: c.bar,
                            borderColor: c.border,
                            opacity: m.status === "planned" && !dragging ? 0.78 : 1,
                          }}
                        >
                          {/* Progress fill */}
                          <div className="absolute inset-y-0 left-0 pointer-events-none" style={{ width: `${fillPct}%`, background: c.fill, opacity: 0.5 }} />
                          {/* Active shimmer */}
                          {m.status === "active" && (
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                              <div className="absolute inset-y-0 -left-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: "shimmerBar 3s ease-in-out infinite" }} />
                            </div>
                          )}

                          {/* Label */}
                          <span className="text-[10px] font-medium truncate relative z-10 flex items-center gap-1" style={{ color: c.text, maxWidth: barW - 28 }}>
                            {v && <Link2 size={9} className="shrink-0 opacity-70" />}
                            {m.title}
                          </span>
                          {isDone && <Check size={10} className="ml-auto relative z-10 shrink-0 text-emerald-400" />}

                          {/* Resize handles */}
                          {canEdit && (
                            <>
                              <div onPointerDown={e => beginDrag(e, m, "l")} className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 opacity-0 group-hover/bar:opacity-100 flex items-center justify-center">
                                <div className="w-0.5 h-3 rounded-full bg-white/40" />
                              </div>
                              <div onPointerDown={e => beginDrag(e, m, "r")} className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-20 opacity-0 group-hover/bar:opacity-100 flex items-center justify-center">
                                <div className="w-0.5 h-3 rounded-full bg-white/40" />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 mt-4 flex-wrap">
        {(["planned", "active", "completed"] as const).map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-8 h-2.5 rounded-full border ${STATUS_STYLE[s].cls}`} />
            <span className="text-[9px] font-light text-white/30 capitalize">{s}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-2.5 rounded-full border bg-rose-500/15 border-rose-400/30" />
          <span className="text-[9px] font-light text-white/30">Overdue</span>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-[8px] text-black font-bold">15</div>
          <span className="text-[9px] font-light text-white/30">Today</span>
        </div>
        {canEdit && (
          <span className="text-white/18 text-[10px] font-light ml-auto hidden md:inline">
            Tip: drag a bar to reschedule · drag its edges to resize
          </span>
        )}
        {milestones.length === 0 && !canEdit && (
          <span className="text-white/18 text-[10px] font-light ml-auto">No milestones yet</span>
        )}
      </div>

      {/* ── Panel ── */}
      {panel !== null && (
        <MilestonePanel
          project={project}
          versions={versions}
          editing={panel === "add" ? null : panel as Milestone}
          readOnly={!canEdit}
          onClose={() => setPanel(null)}
          onSave={panel === "add" ? handleAdd : handleEdit}
          onDelete={panel !== "add" && canEdit ? handleDelete : undefined}
        />
      )}

      <style>{`
        @keyframes shimmerBar {
          0%   { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(500%) skewX(-15deg); }
        }
      `}</style>
    </div>
  );
}
