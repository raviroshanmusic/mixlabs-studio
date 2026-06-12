"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plus, ChevronLeft, ChevronRight, X, Check, Trash2,
  Calendar, ZoomIn, ZoomOut, RefreshCw, AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Milestone = {
  id: string;
  title: string;
  department: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  status: "planned" | "active" | "completed";
  created_at: string;
};

type Project = { id: string; departments: string[] };

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_PX: Record<"month" | "week", number> = { month: 26, week: 60 };
const ROW_H   = 52;
const HEAD_H  = 60;
const SIDE_W  = 172;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["S","M","T","W","T","F","S"];

const DEPT_COLOR: Record<string, { bar: string; border: string; text: string; dot: string }> = {
  Sound:     { bar: "bg-amber-500/20",   border: "border-amber-400/40",   text: "text-amber-300",   dot: "bg-amber-400"   },
  Score:     { bar: "bg-violet-500/20",  border: "border-violet-400/40",  text: "text-violet-300",  dot: "bg-violet-400"  },
  Color:     { bar: "bg-pink-500/20",    border: "border-pink-400/40",    text: "text-pink-300",    dot: "bg-pink-400"    },
  Edit:      { bar: "bg-blue-500/20",    border: "border-blue-400/40",    text: "text-blue-300",    dot: "bg-blue-400"    },
  Animation: { bar: "bg-emerald-500/20", border: "border-emerald-400/40", text: "text-emerald-300", dot: "bg-emerald-400" },
  VFX:       { bar: "bg-orange-500/20",  border: "border-orange-400/40",  text: "text-orange-300",  dot: "bg-orange-400"  },
};
const FALLBACK_COLOR = { bar: "bg-white/8", border: "border-white/20", text: "text-white/60", dot: "bg-white/40" };

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  planned:   { label: "Planned",   cls: "bg-white/5 border-white/10 text-white/35" },
  active:    { label: "Active",    cls: "bg-amber-500/15 border-amber-400/30 text-amber-300" },
  completed: { label: "Completed", cls: "bg-emerald-500/15 border-emerald-400/30 text-emerald-300" },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function today0(): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

function parseD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatDateDisplay(s: string): string {
  const d = parseD(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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

// ─── Add / Edit panel ─────────────────────────────────────────────────────────

function MilestonePanel({
  project, editing, onClose, onSave, onDelete,
}: {
  project: Project;
  editing: Milestone | null; // null = add mode
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
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (new Date(end) < new Date(start)) { setError("End date must be after start date"); return; }
    setSaving(true); setError("");
    try {
      await onSave({ title: title.trim(), department: dept || null, start_date: start, end_date: end, status });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-[#111] border border-white/12 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <Calendar size={14} className="text-white/35" />
            <p className="text-white/70 text-sm font-light">{isEdit ? "Edit milestone" : "Add milestone"}</p>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors"><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
          {/* Title */}
          <div>
            <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Milestone</label>
            <input
              autoFocus value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="e.g. Score composition complete"
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/18 outline-none focus:border-white/22 transition-colors font-light"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Start</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} required
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-3 text-sm text-white/70 outline-none focus:border-white/22 transition-colors font-light [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">End</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} required
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-3 text-sm text-white/70 outline-none focus:border-white/22 transition-colors font-light [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Department</label>
            <select value={dept} onChange={e => setDept(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 outline-none focus:border-white/22 transition-colors font-light [color-scheme:dark]">
              <option value="">No department</option>
              {project.departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-white/35 text-[10px] tracking-[0.2em] uppercase font-light mb-2 block">Status</label>
            <div className="flex gap-2">
              {(["planned", "active", "completed"] as const).map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-light border transition-all capitalize ${
                    status === s ? STATUS_STYLE[s].cls : "border-white/8 text-white/28 hover:border-white/15"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Duration preview */}
          {start && end && new Date(end) >= new Date(start) && (
            <p className="text-white/25 text-xs font-light text-center">
              {daysBetween(parseD(start), parseD(end)) + 1} days · {formatDateDisplay(start)} → {formatDateDisplay(end)}
            </p>
          )}

          {error && (
            <div className="flex items-center gap-2 text-rose-400/80 text-xs font-light">
              <AlertCircle size={12} />
              {error}
            </div>
          )}

          {/* Actions */}
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
        </form>
      </div>
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ milestone }: { milestone: Milestone }) {
  const c = DEPT_COLOR[milestone.department ?? ""] ?? FALLBACK_COLOR;
  const days = daysBetween(parseD(milestone.start_date), parseD(milestone.end_date)) + 1;
  const st = STATUS_STYLE[milestone.status];
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 pointer-events-none min-w-[180px]">
      <div className="bg-[#1a1a1a] border border-white/12 rounded-xl px-3.5 py-3 shadow-2xl shadow-black/60">
        <p className={`text-xs font-medium mb-1.5 ${c.text}`}>{milestone.title}</p>
        {milestone.department && (
          <p className="text-white/35 text-[10px] font-light mb-2">{milestone.department}</p>
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="text-white/25 text-[10px] font-light">{formatDateDisplay(milestone.start_date)}</span>
          <span className="text-white/15 text-[10px]">→</span>
          <span className="text-white/25 text-[10px] font-light">{formatDateDisplay(milestone.end_date)}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-white/20 text-[10px] font-light">{days} day{days !== 1 ? "s" : ""}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-light ${st.cls}`}>{st.label}</span>
        </div>
      </div>
      <div className="w-px h-2 bg-white/10 mx-auto" />
    </div>
  );
}

// ─── Main Timeline ─────────────────────────────────────────────────────────────

export default function Timeline({
  project,
  initialMilestones,
}: {
  project: Project;
  initialMilestones: Milestone[];
}) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [zoom, setZoom]             = useState<"month" | "week">("month");
  const [panel, setPanel]           = useState<"add" | Milestone | null>(null);
  const [hovered, setHovered]       = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const dayPx       = DAY_PX[zoom];
  const { start, end, totalDays } = useMemo(() => computeRange(milestones), [milestones]);
  const todayOffset = useMemo(() => daysBetween(start, today0()), [start]);
  const totalWidth  = totalDays * dayPx;

  // Scroll to today on mount / zoom change
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayX = SIDE_W + todayOffset * dayPx;
    const viewW  = scrollRef.current.clientWidth;
    scrollRef.current.scrollLeft = Math.max(0, todayX - viewW / 2);
  }, [zoom, todayOffset, dayPx]);

  // Auto-poll every 45s
  useEffect(() => {
    const iv = setInterval(async () => {
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

  // Scroll left / right by ~1 month
  function scroll(dir: -1 | 1) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * dayPx * 30, behavior: "smooth" });
  }

  // Add milestone
  async function handleAdd(data: Omit<Milestone, "id" | "created_at">) {
    const res = await fetch(`/api/projects/${project.id}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const created: Milestone = await res.json();
    setMilestones(prev => [...prev, created].sort((a, b) => a.start_date.localeCompare(b.start_date)));
  }

  // Edit milestone
  async function handleEdit(data: Omit<Milestone, "id" | "created_at">) {
    if (!panel || panel === "add") return;
    const id = (panel as Milestone).id;
    const res = await fetch(`/api/projects/${project.id}/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const updated: Milestone = await res.json();
    setMilestones(prev => prev.map(m => m.id === id ? updated : m).sort((a, b) => a.start_date.localeCompare(b.start_date)));
  }

  // Delete milestone
  async function handleDelete(id: string) {
    await fetch(`/api/projects/${project.id}/milestones/${id}`, { method: "DELETE" });
    setMilestones(prev => prev.filter(m => m.id !== id));
  }

  // Build month / week header cells
  const headerCells = useMemo(() => {
    const cells: { label: string; days: number; offset: number }[] = [];
    let cursor = new Date(start);
    let offset = 0;
    while (cursor <= end) {
      if (zoom === "month") {
        const eoM = endOfMonth(cursor);
        const clampedEnd = eoM < end ? eoM : end;
        const days = daysBetween(cursor, clampedEnd) + 1;
        cells.push({ label: `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`, days, offset });
        offset += days;
        cursor = addDays(eoM, 1);
      } else {
        // week view — group by week
        const weekEnd = addDays(cursor, 6);
        const clampedEnd = weekEnd < end ? weekEnd : end;
        const days = daysBetween(cursor, clampedEnd) + 1;
        cells.push({ label: `${cursor.getDate()} ${MONTHS[cursor.getMonth()]}`, days, offset });
        offset += days;
        cursor = addDays(clampedEnd, 1);
      }
    }
    return cells;
  }, [start, end, zoom]);

  // Day tick labels
  const dayTicks = useMemo(() => {
    if (zoom !== "week") return [];
    const ticks: { label: string; offset: number }[] = [];
    let cursor = new Date(start);
    let offset = 0;
    while (cursor <= end) {
      ticks.push({ label: String(cursor.getDate()), offset });
      cursor = addDays(cursor, 1);
      offset++;
    }
    return ticks;
  }, [start, end, zoom]);

  // Milestone rows — stack overlapping bars
  const rows = useMemo(() => {
    const sorted = [...milestones].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const lanes: Milestone[][] = [];
    for (const m of sorted) {
      const ms = parseD(m.start_date).getTime();
      const me = parseD(m.end_date).getTime();
      let placed = false;
      for (const lane of lanes) {
        const last = lane[lane.length - 1];
        if (parseD(last.end_date).getTime() < ms) {
          lane.push(m);
          placed = true;
          break;
        }
      }
      if (!placed) lanes.push([m]);
    }
    return lanes;
  }, [milestones]);

  const totalRows = Math.max(rows.length, 4); // minimum height
  const canvasH   = totalRows * ROW_H;

  return (
    <div className="flex flex-col select-none px-10 pb-10 pt-4" style={{ minHeight: 600 }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          {/* Zoom */}
          <button onClick={() => setZoom(z => z === "month" ? "week" : "month")}
            className="flex items-center gap-1.5 text-[10px] text-white/35 hover:text-white/65 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all font-light">
            {zoom === "month" ? <ZoomIn size={11} /> : <ZoomOut size={11} />}
            {zoom === "month" ? "Week view" : "Month view"}
          </button>

          {/* Scroll buttons */}
          <button onClick={() => scroll(-1)} className="w-7 h-7 flex items-center justify-center text-white/25 hover:text-white/60 border border-white/8 hover:border-white/18 rounded-lg transition-all">
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => scroll(1)} className="w-7 h-7 flex items-center justify-center text-white/25 hover:text-white/60 border border-white/8 hover:border-white/18 rounded-lg transition-all">
            <ChevronRight size={13} />
          </button>

          {/* Today */}
          <button onClick={() => {
            if (!scrollRef.current) return;
            const todayX = SIDE_W + todayOffset * dayPx;
            scrollRef.current.scrollTo({ left: Math.max(0, todayX - scrollRef.current.clientWidth / 2), behavior: "smooth" });
          }} className="text-[10px] text-white/30 hover:text-white/60 border border-white/8 hover:border-white/18 px-3 py-1.5 rounded-lg transition-all font-light">
            Today
          </button>

          {/* Refresh */}
          <button onClick={handleRefresh}
            className={`w-7 h-7 flex items-center justify-center text-white/22 hover:text-white/55 border border-white/8 rounded-lg transition-all ${refreshing ? "animate-spin" : ""}`}>
            <RefreshCw size={11} />
          </button>
        </div>

        <button onClick={() => setPanel("add")}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 border border-white/10 hover:border-white/22 px-3.5 py-1.5 rounded-xl transition-all bg-white/[0.02] hover:bg-white/[0.04] font-light">
          <Plus size={12} />
          Add milestone
        </button>
      </div>

      {/* ── Timeline canvas ── */}
      <div className="border border-white/[0.07] rounded-2xl overflow-hidden bg-[#080808]" style={{ height: Math.max(canvasH + HEAD_H + 2, 320) }}>
        <div ref={scrollRef} className="overflow-auto" style={{ height: "100%" }}>
          <div style={{ width: SIDE_W + totalWidth, minHeight: HEAD_H + canvasH }}>

            {/* ── Month/week header ── */}
            <div className="sticky top-0 z-20 bg-[#0a0a0a] border-b border-white/[0.07]">
              <div className="flex" style={{ height: HEAD_H }}>
                {/* Sidebar label */}
                <div className="shrink-0 flex items-end pb-3 px-4 border-r border-white/[0.07]" style={{ width: SIDE_W }}>
                  <span className="text-[9px] tracking-[0.22em] uppercase text-white/18 font-light">Milestone</span>
                </div>

                {/* Month / week cells */}
                <div className="flex-1 relative">
                  {headerCells.map((cell, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-white/[0.05] flex flex-col justify-end pb-3"
                      style={{ left: cell.offset * dayPx, width: cell.days * dayPx }}>
                      <span className="text-[10px] text-white/30 font-light px-3 truncate">{cell.label}</span>
                      {/* Week-mode day ticks */}
                      {zoom === "week" && dayTicks
                        .filter(t => t.offset >= cell.offset && t.offset < cell.offset + cell.days)
                        .map(t => (
                          <div key={t.offset} className="absolute bottom-0"
                            style={{ left: (t.offset - cell.offset) * dayPx, width: dayPx }}>
                            <span className="block text-center text-[8px] text-white/18 font-light leading-none pb-1.5">{t.label}</span>
                          </div>
                        ))
                      }
                    </div>
                  ))}

                  {/* Today marker in header */}
                  {todayOffset >= 0 && todayOffset <= totalDays && (
                    <div className="absolute top-2 bottom-0 pointer-events-none"
                      style={{ left: todayOffset * dayPx + dayPx / 2 - 0.5 }}>
                      <div className="w-px h-full bg-amber-400/30" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Rows ── */}
            <div className="relative" style={{ height: canvasH }}>

              {/* Sidebar */}
              <div className="sticky left-0 z-10 absolute top-0 bottom-0 border-r border-white/[0.07] bg-[#080808]"
                style={{ width: SIDE_W }}>
                {rows.map((lane, ri) => (
                  <div key={ri} className="border-b border-white/[0.04] px-4 flex items-center"
                    style={{ height: ROW_H }}>
                    {lane[0] && (
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {lane[0].department && (
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${(DEPT_COLOR[lane[0].department] ?? FALLBACK_COLOR).dot}`} />
                          )}
                          <p className="text-white/55 text-xs font-light truncate leading-tight">{lane[0].title}</p>
                        </div>
                        {lane[0].department && (
                          <p className="text-white/22 text-[9px] font-light mt-0.5 pl-3.5">{lane[0].department}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {/* Empty rows */}
                {Array.from({ length: Math.max(0, totalRows - rows.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="border-b border-white/[0.04]" style={{ height: ROW_H }} />
                ))}
              </div>

              {/* Grid + bars */}
              <div className="absolute top-0 bottom-0" style={{ left: SIDE_W, right: 0 }}>

                {/* Grid lines — month boundaries */}
                {headerCells.map((cell, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-r border-white/[0.03]"
                    style={{ left: (cell.offset + cell.days) * dayPx }} />
                ))}

                {/* Row alternating bg */}
                {Array.from({ length: totalRows }).map((_, ri) => (
                  <div key={ri} className={`absolute border-b border-white/[0.04] ${ri % 2 === 0 ? "" : "bg-white/[0.008]"}`}
                    style={{ left: 0, right: 0, top: ri * ROW_H, height: ROW_H }} />
                ))}

                {/* Today vertical line */}
                {todayOffset >= 0 && todayOffset <= totalDays && (
                  <div className="absolute top-0 bottom-0 pointer-events-none z-10"
                    style={{ left: todayOffset * dayPx + dayPx / 2 - 0.5, width: 1 }}>
                    <div className="w-full h-full bg-amber-400/25" />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400/60 border border-amber-400/80" />
                  </div>
                )}

                {/* Milestone bars */}
                {rows.map((lane, ri) =>
                  lane.map(m => {
                    const barStart = daysBetween(start, parseD(m.start_date));
                    const barDays  = daysBetween(parseD(m.start_date), parseD(m.end_date)) + 1;
                    const barLeft  = barStart * dayPx;
                    const barW     = Math.max(barDays * dayPx - 4, 20);
                    const c        = DEPT_COLOR[m.department ?? ""] ?? FALLBACK_COLOR;
                    const isCompleted = m.status === "completed";
                    const isHovered   = hovered === m.id;

                    return (
                      <div key={m.id}
                        className="absolute flex items-center cursor-pointer group/bar"
                        style={{ top: ri * ROW_H + 10, left: barLeft + 2, height: ROW_H - 20 }}
                        onMouseEnter={() => setHovered(m.id)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => setPanel(m)}
                      >
                        {/* Tooltip */}
                        {isHovered && <Tooltip milestone={m} />}

                        {/* Bar */}
                        <div
                          className={`h-full rounded-xl border flex items-center px-3 transition-all duration-200 relative overflow-hidden ${
                            isCompleted
                              ? "bg-emerald-500/15 border-emerald-400/30"
                              : m.status === "planned"
                                ? `${c.bar} ${c.border} opacity-50`
                                : `${c.bar} ${c.border}`
                          } ${isHovered ? "brightness-125 shadow-lg" : ""}`}
                          style={{ width: barW }}
                        >
                          {/* Shimmer on active */}
                          {m.status === "active" && (
                            <div className="absolute inset-0 overflow-hidden">
                              <div className="absolute inset-y-0 -left-full w-1/3 bg-gradient-to-r from-transparent via-white/8 to-transparent"
                                style={{ animation: "shimmerBar 3s ease-in-out infinite" }} />
                            </div>
                          )}
                          <span className={`text-[10px] font-light truncate relative z-10 ${
                            isCompleted ? "text-emerald-300" : m.status === "planned" ? c.text + " opacity-60" : c.text
                          }`}
                            style={{ maxWidth: barW - 24 }}>
                            {m.title}
                          </span>
                          {isCompleted && (
                            <div className="ml-auto relative z-10 shrink-0">
                              <Check size={9} className="text-emerald-400" />
                            </div>
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
        {(["planned", "active", "completed"] as const).map(s => {
          const st = STATUS_STYLE[s];
          return (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-8 h-2.5 rounded-full border ${st.cls}`} />
              <span className="text-[9px] font-light text-white/28 capitalize">{s}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-px h-4 bg-amber-400/50" />
          <span className="text-[9px] font-light text-white/28">Today</span>
        </div>
        {milestones.length === 0 && (
          <span className="text-white/18 text-[10px] font-light ml-auto">Click "+ Add milestone" to start building your timeline</span>
        )}
      </div>

      {/* ── Add / Edit Panel ── */}
      {panel !== null && (
        <MilestonePanel
          project={project}
          editing={panel === "add" ? null : panel as Milestone}
          onClose={() => setPanel(null)}
          onSave={panel === "add" ? handleAdd : handleEdit}
          onDelete={panel !== "add" ? handleDelete : undefined}
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
