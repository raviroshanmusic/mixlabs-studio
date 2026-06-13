"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Sidebar from "@/components/ui/Sidebar";
import {
  ArrowLeft, ChevronDown, ChevronUp, ChevronLeft,
  Send, Play, ExternalLink, MessageSquare, Clock,
  Volume2, Music, Palette, Scissors, Wand2, Zap, FileText,
  Check, Download, Maximize2, Minimize2,
  CheckCircle2, Film, Layers,
  Trash2, RefreshCw, MoreHorizontal, Eye,
  Flag, AlertCircle, X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Project   = { id: string; name: string; client: string | null; status: string; departments: string[] };
type Version   = { id: string; version_name: string; department: string | null; drive_url: string | null; status: string; created_at: string };
type Comment   = {
  id: string; body: string; timecode: number | null; version_id: string | null;
  created_at: string; author_id: string; author_name: string | null; status: string;
  priority?: string;
  profiles: { id: string; full_name: string | null; email: string | null } | null;
};
type CurrentUser = { id: string; full_name: string | null; email: string };
type FilterTab   = "all" | "open" | "resolved";
type Toast       = { id: string; type: "success" | "error" | "info"; message: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_ICON: Record<string, React.ReactNode> = {
  Sound:     <Volume2 size={13} />,
  Score:     <Music size={13} />,
  Color:     <Palette size={13} />,
  Edit:      <Scissors size={13} />,
  Animation: <Wand2 size={13} />,
  VFX:       <Zap size={13} />,
};

const VERSION_STATUS: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  draft:             { label: "Draft",             dot: "bg-white/30",     text: "text-white/50",    bg: "bg-white/5"        },
  in_review:         { label: "In Review",         dot: "bg-amber-400",    text: "text-amber-300",   bg: "bg-amber-500/10"   },
  changes_requested: { label: "Changes Requested", dot: "bg-rose-400",     text: "text-rose-300",    bg: "bg-rose-500/10"    },
  approved:          { label: "Approved",          dot: "bg-emerald-400",  text: "text-emerald-300", bg: "bg-emerald-500/10" },
};

const AVATAR_PALETTE = [
  { bg: "bg-violet-500/30", text: "text-violet-200" },
  { bg: "bg-blue-500/30",   text: "text-blue-200"   },
  { bg: "bg-emerald-500/30",text: "text-emerald-200"},
  { bg: "bg-amber-500/30",  text: "text-amber-200"  },
  { bg: "bg-rose-500/30",   text: "text-rose-200"   },
  { bg: "bg-cyan-500/30",   text: "text-cyan-200"   },
  { bg: "bg-fuchsia-500/30",text: "text-fuchsia-200"},
  { bg: "bg-orange-500/30", text: "text-orange-200" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTimecode(sec: number | null | undefined): string {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
function pad(n: number) { return String(n).padStart(2, "0"); }

function parseTimecode(str: string): number | null {
  const clean = str.trim();
  if (!clean) return null;
  const parts = clean.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function parseFilmTC(str: string) {
  const parts = str.split(":").map(Number);
  if (parts.length === 4) return { h: parts[0] ?? 0, m: parts[1] ?? 0, s: parts[2] ?? 0, f: parts[3] ?? 0 };
  if (parts.length === 3) return { h: parts[0] ?? 0, m: parts[1] ?? 0, s: parts[2] ?? 0, f: 0 };
  if (parts.length === 2) return { h: 0, m: parts[0] ?? 0, s: parts[1] ?? 0, f: 0 };
  return { h: 0, m: 0, s: 0, f: 0 };
}
function fmtFilm(h: number, m: number, s: number, f: number) {
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function getEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1&color=white`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1&color=ffffff`;
  const gd = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  if (url.includes("dropbox.com"))
    return url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
  return url;
}

function exportNotes(comments: Comment[], project: Project, version: Version | null) {
  const lines = [
    `REVIEW NOTES — ${project.name}`,
    project.client ? `Client: ${project.client}` : "",
    `File: ${version?.version_name ?? "All Files"}`,
    `Exported: ${new Date().toLocaleString()}`,
    "",
    "─".repeat(50),
    "",
    ...comments.map(c => {
      const tc = c.timecode != null ? `[${fmtTimecode(c.timecode)}] ` : "";
      const st = c.status === "resolved" ? " ✓" : "";
      return `${tc}${c.author_name ?? "Unknown"}${st}\n${c.body}\n`;
    }),
  ].filter(Boolean).join("\n");

  const blob = new Blob([lines], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `notes-${project.name.toLowerCase().replace(/\s+/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Toast System ─────────────────────────────────────────────────────────────

function ToastStack({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl shadow-black/50 pointer-events-auto backdrop-blur-sm text-sm font-medium ${
            t.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200" :
            t.type === "error"   ? "bg-rose-950/90 border-rose-500/30 text-rose-200" :
                                   "bg-[#1a1a1a]/90 border-white/10 text-white/70"
          }`}>
          {t.type === "success" && <CheckCircle2 size={14} className="text-emerald-400" />}
          {t.type === "error"   && <AlertCircle  size={14} className="text-rose-400" />}
          <span>{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((type: Toast["type"], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  const remove = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

// ─── Drum Roller ─────────────────────────────────────────────────────────────

function Drum({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const wrap = (v: number) => ((v % (max + 1)) + (max + 1)) % (max + 1);
  return (
    <div className="flex flex-col items-center cursor-ns-resize select-none"
      onWheel={e => { e.preventDefault(); onChange(wrap(value + (e.deltaY > 0 ? 1 : -1))); }}>
      <button type="button" onClick={() => onChange(wrap(value - 1))}
        className="text-white/30 hover:text-white/70 transition-colors px-2 py-0.5">
        <ChevronUp size={11} />
      </button>
      <div className="text-white/25 text-xs font-mono tabular-nums py-0.5">{pad(wrap(value - 1))}</div>
      <div className="text-white text-sm font-mono tabular-nums py-1 px-2.5 bg-white/12 rounded-lg my-0.5 ring-1 ring-white/10">
        {pad(value)}
      </div>
      <div className="text-white/25 text-xs font-mono tabular-nums py-0.5">{pad(wrap(value + 1))}</div>
      <button type="button" onClick={() => onChange(wrap(value + 1))}
        className="text-white/30 hover:text-white/70 transition-colors px-2 py-0.5">
        <ChevronDown size={11} />
      </button>
    </div>
  );
}

/* ── Mobile scroll-based single-field timecode input ── */
function MobileTimecodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { h, m, s, f } = parseFilmTC(value);
  const hasValue = value.length > 0 && !value.startsWith("00:00:00:00");

  function scrollField(
    field: "h" | "m" | "s" | "f",
    delta: number,
    cur: { h: number; m: number; s: number; f: number }
  ) {
    const wrap = (v: number, max: number) => ((v % (max + 1)) + (max + 1)) % (max + 1);
    const n = { ...cur };
    if (field === "h") n.h = wrap(n.h + delta, 23);
    if (field === "m") n.m = wrap(n.m + delta, 59);
    if (field === "s") n.s = wrap(n.s + delta, 59);
    if (field === "f") n.f = wrap(n.f + delta, 23);
    onChange(fmtFilm(n.h, n.m, n.s, n.f));
  }

  const fields: { key: "h" | "m" | "s" | "f"; label: string }[] = [
    { key: "h", label: "HR" },
    { key: "m", label: "MN" },
    { key: "s", label: "SC" },
    { key: "f", label: "FR" },
  ];
  const vals = { h, m, s, f };

  return (
    <div className="flex items-center gap-1">
      {fields.map((field, i) => (
        <div key={field.key} className="flex items-center gap-1">
          {i > 0 && <span className="text-white/20 text-xs font-mono">:</span>}
          <div className="flex flex-col items-center"
            onTouchStart={e => e.currentTarget.dataset.startY = String(e.touches[0].clientY)}
            onTouchEnd={e => {
              const startY = Number(e.currentTarget.dataset.startY ?? 0);
              const delta = startY - e.changedTouches[0].clientY;
              if (Math.abs(delta) > 8) scrollField(field.key, delta > 0 ? 1 : -1, vals);
            }}>
            <span className="text-[8px] text-white/25 tracking-wider font-semibold mb-0.5">{field.label}</span>
            <span className="text-white/85 text-sm font-mono tabular-nums bg-white/8 rounded-lg px-2 py-1 min-w-[32px] text-center">
              {pad(vals[field.key])}
            </span>
          </div>
        </div>
      ))}
      {hasValue && (
        <button type="button" onClick={() => onChange("")}
          className="ml-1 text-white/30 hover:text-white/70 transition-colors text-base leading-none">×</button>
      )}
    </div>
  );
}

function TimecodeRoller({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { h, m, s, f } = parseFilmTC(value);
  const hasValue = value.length > 0 && !value.startsWith("00:00:00:00");

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  // Mobile: render inline scroll strips instead of a popout
  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        {!hasValue && !open && (
          <button type="button" onClick={() => { onChange(fmtFilm(0, 0, 0, 0)); setOpen(true); }}
            className="flex items-center gap-1 text-[10px] text-white/35 hover:text-white/65 transition-colors">
            <Clock size={10} />
            <span>timecode</span>
          </button>
        )}
        {(hasValue || open) && (
          <MobileTimecodeInput value={value || fmtFilm(0,0,0,0)} onChange={onChange} />
        )}
      </div>
    );
  }

  // Desktop: roller popout
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button"
        onClick={() => { if (!value) onChange(fmtFilm(0, 0, 0, 0)); setOpen(p => !p); }}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all ${
          hasValue
            ? "bg-amber-500/10 border-amber-400/30 text-amber-300"
            : "bg-white/[0.04] border-white/10 text-white/35 hover:border-white/20 hover:text-white/55"
        }`}>
        <Clock size={10} className={hasValue ? "text-amber-400/70" : "text-white/25"} />
        <span>{hasValue ? value : "timecode"}</span>
        {hasValue && (
          <span onClick={e => { e.stopPropagation(); onChange(""); }}
            className="text-white/30 hover:text-white/70 ml-0.5 cursor-pointer leading-none">×</span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 bg-[#161616] border border-white/10 rounded-xl shadow-xl shadow-black/50 p-3">
          <p className="text-[8px] tracking-[0.25em] uppercase text-white/25 text-center mb-2.5 font-semibold">HH : MM : SS : FF</p>
          <div className="flex items-center gap-1">
            <Drum value={h} max={23} onChange={v => onChange(fmtFilm(v, m, s, f))} />
            <span className="text-white/20 font-mono text-sm mb-0.5">:</span>
            <Drum value={m} max={59} onChange={v => onChange(fmtFilm(h, v, s, f))} />
            <span className="text-white/20 font-mono text-sm mb-0.5">:</span>
            <Drum value={s} max={59} onChange={v => onChange(fmtFilm(h, m, v, f))} />
            <span className="text-white/20 font-mono text-sm mb-0.5">:</span>
            <Drum value={f} max={23} onChange={v => onChange(fmtFilm(h, m, s, v))} />
          </div>
          <button type="button" onClick={() => setOpen(false)}
            className="mt-2.5 w-full text-[9px] text-white/30 hover:text-white/60 transition-colors border border-white/[0.07] rounded-lg py-1">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Timecode Rail ────────────────────────────────────────────────────────────

function TimecodeRail({ comments, onSeek }: { comments: Comment[]; onSeek: (s: number) => void }) {
  const [hovered, setHovered] = useState<Comment | null>(null);
  const [mouseX, setMouseX]   = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  const timecoded = comments.filter(c => c.timecode != null);
  if (timecoded.length === 0) return null;

  const maxSec = Math.max(...timecoded.map(c => c.timecode!));
  const range  = maxSec || 1;

  return (
    <div ref={railRef} className="relative h-8 flex items-center"
      onMouseMove={e => { const r = railRef.current?.getBoundingClientRect(); if (r) setMouseX(e.clientX - r.left); }}>

      {/* Track */}
      <div className="absolute inset-x-0 h-[1px] bg-white/10 rounded-full" />

      {/* Progress fill to last resolved */}
      <div className="absolute left-0 h-[1px] bg-white/5 rounded-full" style={{ width: "100%" }} />

      {/* Markers */}
      {timecoded.map(c => {
        const pct = (c.timecode! / range) * 100;
        const resolved = c.status === "resolved";
        return (
          <button key={c.id}
            onClick={() => onSeek(c.timecode!)}
            onMouseEnter={() => setHovered(c)}
            onMouseLeave={() => setHovered(null)}
            style={{ left: `${pct}%` }}
            className={`absolute -translate-x-1/2 transition-all duration-150 rounded-full z-10 ${
              resolved
                ? "w-2 h-2 bg-emerald-500/60 hover:bg-emerald-400 hover:scale-[1.8] border border-emerald-400/30"
                : "w-2.5 h-2.5 bg-amber-400 hover:scale-[1.6] shadow-sm shadow-amber-400/50"
            }`}
          />
        );
      })}

      {/* Hover tooltip */}
      {hovered && (
        <div className="absolute bottom-8 z-20 pointer-events-none"
          style={{ left: Math.max(80, Math.min(mouseX, (railRef.current?.offsetWidth ?? 300) - 80)), transform: "translateX(-50%)" }}>
          <div className="bg-[#1e1e1e] border border-white/12 rounded-xl px-3 py-2 shadow-2xl shadow-black/60 w-52">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 text-[11px] font-mono font-medium">{fmtTimecode(hovered.timecode)}</span>
              {hovered.status === "resolved" && (
                <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                  <CheckCircle2 size={9} /> resolved
                </span>
              )}
            </div>
            <p className="text-white/75 text-xs leading-snug line-clamp-2">{hovered.body}</p>
            <p className="text-white/40 text-[10px] mt-1">{hovered.author_name}</p>
          </div>
          <div className="w-px h-3 bg-white/15 mx-auto" />
        </div>
      )}
    </div>
  );
}

// ─── Version Sidebar ──────────────────────────────────────────────────────────

function VersionSidebar({
  versions, comments, selected, collapsed, onSelect, onCollapse,
}: {
  versions: Version[]; comments: Comment[]; selected: Version | null;
  collapsed: boolean; onSelect: (v: Version) => void; onCollapse: () => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, Version[]> = {};
    for (const v of versions) {
      const d = v.department || "General";
      if (!map[d]) map[d] = [];
      map[d].push(v);
    }
    return Object.entries(map);
  }, [versions]);

  const openCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const cm of comments)
      if (cm.version_id && cm.status === "open") c[cm.version_id] = (c[cm.version_id] ?? 0) + 1;
    return c;
  }, [comments]);

  if (collapsed) {
    return (
      <div className="w-12 shrink-0 border-r border-white/[0.07] flex flex-col items-center pt-4 gap-3 bg-[#090909]">
        <button onClick={onCollapse} className="text-white/35 hover:text-white/70 transition-colors p-1" title="Expand files">
          <Layers size={15} />
        </button>
        {versions.slice(0, 10).map(v => {
          const hasBadge = (openCounts[v.id] ?? 0) > 0;
          return (
            <button key={v.id} onClick={() => onSelect(v)} title={v.version_name}
              className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                selected?.id === v.id ? "bg-white/15 text-white/90" : "text-white/35 hover:text-white/70 hover:bg-white/8"
              }`}>
              {DEPT_ICON[v.department ?? ""] ?? <FileText size={13} />}
              {hasBadge && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-60 shrink-0 border-r border-white/[0.07] flex flex-col bg-[#090909]">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Layers size={12} className="text-white/40" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-semibold">Files</span>
        </div>
        <button onClick={onCollapse} className="text-white/25 hover:text-white/60 transition-colors">
          <ChevronLeft size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {grouped.length === 0 ? (
          <p className="text-white/35 text-xs px-4 py-5 text-center leading-relaxed">
            No files added yet.<br />
            <span className="text-white/20 text-[10px]">Add files in the project workspace.</span>
          </p>
        ) : (
          grouped.map(([dept, vers]) => (
            <div key={dept} className="mb-2">
              <div className="flex items-center gap-2 px-4 py-1.5">
                <span className="text-white/30">{DEPT_ICON[dept] ?? <FileText size={11} />}</span>
                <span className="text-[9px] tracking-[0.22em] uppercase text-white/30 font-semibold">{dept}</span>
              </div>
              {vers.map(v => {
                const isSelected = selected?.id === v.id;
                const openCount  = openCounts[v.id] ?? 0;
                const sc = VERSION_STATUS[v.status] ?? VERSION_STATUS.draft;
                return (
                  <button key={v.id} onClick={() => onSelect(v)}
                    className={`w-full text-left px-4 py-3 transition-all group border-l-2 ${
                      isSelected ? "bg-white/[0.06] border-white/30" : "border-transparent hover:bg-white/[0.03] hover:border-white/10"
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs leading-snug truncate flex-1 font-medium ${
                        isSelected ? "text-white/90" : "text-white/55 group-hover:text-white/75"
                      }`}>
                        {v.version_name}
                      </span>
                      {openCount > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 rounded-full bg-amber-500/25 border border-amber-400/30 text-amber-300 text-[10px] flex items-center justify-center font-semibold px-1">
                          {openCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      <span className={`text-[10px] font-medium ${sc.text}`}>{sc.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Version Status Picker ────────────────────────────────────────────────────

function VersionStatusPicker({ version, onUpdate }: { version: Version | null; onUpdate: (id: string, s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  if (!version) return null;
  const sc = VERSION_STATUS[version.status] ?? VERSION_STATUS.draft;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 transition-all ${sc.bg} border-white/10 hover:border-white/20`}>
        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
        <span className={`text-xs font-medium ${sc.text}`}>{sc.label}</span>
        <ChevronDown size={10} className="text-white/30 ml-0.5" />
      </button>

      {open && (
        <div className="absolute top-10 left-0 z-40 w-56 bg-[#181818] border border-white/12 rounded-2xl shadow-2xl py-2 overflow-hidden">
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/35 px-4 pt-1 pb-2 font-semibold">File Status</p>
          {(["draft", "in_review", "changes_requested", "approved"] as const).map(s => {
            const cfg = VERSION_STATUS[s];
            return (
              <button key={s} onClick={() => { onUpdate(version.id, s); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left ${version.status === s ? "bg-white/5" : ""}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                {version.status === s && <Check size={12} className="ml-auto text-white/40" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Player ───────────────────────────────────────────────────────────────────

function Player({ version }: { version: Version | null }) {
  if (!version) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <Film size={32} className="text-white/15" />
          </div>
          <div className="absolute -inset-6 rounded-full border border-white/[0.03] animate-ping" style={{ animationDuration: "3s" }} />
        </div>
        <div className="text-center">
          <p className="text-white/40 text-sm font-medium">No file selected</p>
          <p className="text-white/25 text-xs mt-1">Choose a file from the sidebar</p>
        </div>
      </div>
    );
  }

  const embedUrl = version.drive_url ? getEmbedUrl(version.drive_url) : null;

  if (!embedUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <p className="text-white/40 text-sm">No previewable link for this file.</p>
        {version.drive_url && (
          <a href={version.drive_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 border border-white/15 px-4 py-2 rounded-xl transition-all hover:bg-white/5">
            <ExternalLink size={12} /> Open externally
          </a>
        )}
      </div>
    );
  }

  return <iframe key={embedUrl} src={embedUrl} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ total, resolved }: { total: number; resolved: number }) {
  if (total === 0) return null;
  const pct = Math.round((resolved / total) * 100);
  return (
    <div className="px-4 py-2.5 border-b border-white/[0.05]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-white/45 font-medium">{resolved} of {total} resolved</span>
        <span className="text-[10px] text-white/35 font-mono">{pct}%</span>
      </div>
      <div className="h-1 bg-white/8 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? "linear-gradient(90deg, #10b981, #34d399)"
              : "linear-gradient(90deg, #f59e0b, #fbbf24)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Comment Card ─────────────────────────────────────────────────────────────

function CommentCard({
  comment, currentUserId, onTimecodeClick, onResolve, onDelete,
}: {
  comment: Comment;
  currentUserId: string;
  onTimecodeClick: (sec: number) => void;
  onResolve: (id: string, status: "open" | "resolved") => void;
  onDelete: (id: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const name     = comment.author_name || comment.profiles?.full_name || comment.profiles?.email || "Unknown";
  const color    = avatarColor(name);
  const resolved = comment.status === "resolved";
  const isOwn    = comment.author_id === currentUserId;

  useEffect(() => {
    if (!menu) return;
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [menu]);

  return (
    <div className={`group relative px-4 py-4 transition-all duration-200 border-b border-white/[0.05] last:border-0 ${
      resolved ? "opacity-55 hover:opacity-75" : "hover:bg-white/[0.02]"
    }`}>
      {/* Resolved accent line */}
      {resolved && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500/40 rounded-r" />}
      {/* Open accent line (shown on hover only) */}
      {!resolved && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-400/0 group-hover:bg-amber-400/30 rounded-r transition-all" />}

      <div className="flex gap-3">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${color.bg} ${color.text}`}>
          {initials(name)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row: name + time + actions */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white/80 text-xs font-semibold">{name}</span>
            <span className="text-white/35 text-[10px]">{timeAgo(comment.created_at)}</span>

            {/* Always-visible timecode */}
            {comment.timecode != null && (
              <button onClick={() => onTimecodeClick(comment.timecode!)}
                className="flex items-center gap-1 text-[10px] text-amber-300/80 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/20 px-2 py-0.5 rounded-lg transition-all font-mono font-medium">
                <Clock size={8} />
                {fmtTimecode(comment.timecode)}
              </button>
            )}

            {/* Action buttons — visible on hover */}
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onResolve(comment.id, resolved ? "open" : "resolved")}
                title={resolved ? "Reopen" : "Mark resolved"}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                  resolved
                    ? "text-emerald-400/60 hover:text-emerald-300 hover:bg-emerald-500/15"
                    : "text-white/30 hover:text-emerald-300 hover:bg-emerald-500/15"
                }`}>
                <CheckCircle2 size={14} />
              </button>

              <div ref={menuRef} className="relative">
                <button onClick={() => setMenu(p => !p)}
                  className="w-6 h-6 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/8 flex items-center justify-center transition-all">
                  <MoreHorizontal size={13} />
                </button>
                {menu && (
                  <div className="absolute right-0 top-7 z-40 w-40 bg-[#1e1e1e] border border-white/12 rounded-2xl shadow-2xl shadow-black/60 py-1.5 overflow-hidden">
                    <button onClick={() => { navigator.clipboard.writeText(comment.body); setMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors">
                      <FileText size={12} /> Copy text
                    </button>
                    {comment.timecode != null && (
                      <button onClick={() => { onTimecodeClick(comment.timecode!); setMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors">
                        <Clock size={12} /> Use timecode
                      </button>
                    )}
                    {isOwn && (
                      <>
                        <div className="my-1 border-t border-white/8" />
                        <button onClick={() => { onDelete(comment.id); setMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors">
                          <Trash2 size={12} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comment body */}
          <p className={`text-sm leading-relaxed ${resolved ? "line-through text-white/35" : "text-white/75"}`}>
            {comment.body}
          </p>

          {/* Resolved badge */}
          {resolved && (
            <div className="mt-2 flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-emerald-400/60" />
              <span className="text-[10px] text-emerald-400/50 font-medium">Resolved</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ProjectStub = { id: string; name: string; status: string; departments: string[] };

export default function ReviewClient({
  project, versions, comments: initialComments, currentUser, initialDept, allProjects,
}: {
  project: Project; versions: Version[]; comments: Comment[];
  currentUser: CurrentUser; initialDept?: string | null;
  allProjects?: ProjectStub[];
}) {
  const firstVersion = initialDept
    ? (versions.find(v => v.department === initialDept) ?? versions[0] ?? null)
    : (versions[0] ?? null);

  const [selectedVersion, setSelectedVersion] = useState<Version | null>(firstVersion);
  const [allVersions, setAllVersions]         = useState<Version[]>(versions);
  const [comments, setComments]               = useState<Comment[]>(initialComments);
  const [filterTab, setFilterTab]             = useState<FilterTab>("open");
  const [body, setBody]                       = useState("");
  const [timecodeInput, setTimecodeInput]     = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile]                 = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  // Collapse notes panel by default on mobile; keep open on desktop
  const [panelCollapsed, setPanelCollapsed]     = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [cinemaMode, setCinemaMode]             = useState(false);
  const [refreshing, setRefreshing]             = useState(false);
  const [showProjectMenu, setShowProjectMenu]   = useState(false);


  const commentsEndRef   = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const projectMenuRef   = useRef<HTMLDivElement>(null);

  // Close project menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setShowProjectMenu(false);
      }
    }
    if (showProjectMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProjectMenu]);
  const { toasts, add: addToast, remove: removeToast } = useToasts();

  // Auto-poll
  useEffect(() => {
    const iv = setInterval(async () => {
      const res = await fetch(`/api/projects/${project.id}/comments`);
      if (res.ok) setComments(await res.json());
    }, 45000);
    return () => clearInterval(iv);
  }, [project.id]);

  // Esc = exit cinema
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape" && cinemaMode) setCinemaMode(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [cinemaMode]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const res = await fetch(`/api/projects/${project.id}/comments`);
    if (res.ok) { setComments(await res.json()); addToast("success", "Notes refreshed"); }
    setRefreshing(false);
  }, [project.id, addToast]);

  // Filtered comments
  const visibleComments = useMemo(() => {
    let cs = selectedVersion
      ? comments.filter(c => !c.version_id || c.version_id === selectedVersion.id)
      : comments;
    if (filterTab === "open")     cs = cs.filter(c => c.status !== "resolved");
    if (filterTab === "resolved") cs = cs.filter(c => c.status === "resolved");
    return [...cs].sort((a, b) => {
      if (a.timecode != null && b.timecode != null) return a.timecode - b.timecode;
      if (a.timecode != null) return -1;
      if (b.timecode != null) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [comments, selectedVersion, filterTab]);

  const allVisible  = useMemo(() => selectedVersion ? comments.filter(c => !c.version_id || c.version_id === selectedVersion.id) : comments, [comments, selectedVersion]);
  const openCount   = useMemo(() => allVisible.filter(c => c.status !== "resolved").length, [allVisible]);
  const resolvedCount = useMemo(() => allVisible.filter(c => c.status === "resolved").length, [allVisible]);
  const totalCount  = allVisible.length;

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    const timecode = parseTimecode(timecodeInput);
    const res = await fetch(`/api/projects/${project.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim(), timecode_sec: timecode, version_id: selectedVersion?.id ?? null }),
    });
    if (res.ok) {
      const nc = await res.json();
      setComments(prev => [...prev, { ...nc, profiles: { id: currentUser.id, full_name: currentUser.full_name, email: currentUser.email } }]);
      setBody(""); setTimecodeInput("");
      addToast("success", "Note added");
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      addToast("error", "Failed to send note");
    }
    setSubmitting(false);
  }

  // Resolve / reopen
  async function handleResolve(commentId: string, status: "open" | "resolved") {
    // Optimistic
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, status } : c));
    const res = await fetch(`/api/projects/${project.id}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      addToast("success", status === "resolved" ? "Marked resolved ✓" : "Reopened");
    } else {
      // Revert
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: status === "resolved" ? "open" : "resolved" } : c));
      const err = await res.json().catch(() => ({}));
      addToast("error", err.error ?? "Could not update — check RLS policy");
    }
  }

  // Delete
  async function handleDelete(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId));
    const res = await fetch(`/api/projects/${project.id}/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) addToast("info", "Note deleted");
    else addToast("error", "Could not delete note");
  }

  // Version status
  async function handleVersionStatus(versionId: string, status: string) {
    setAllVersions(prev => prev.map(v => v.id === versionId ? { ...v, status } : v));
    if (selectedVersion?.id === versionId) setSelectedVersion(prev => prev ? { ...prev, status } : prev);
    const res = await fetch(`/api/projects/${project.id}/versions/${versionId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (res.ok) addToast("success", `Status updated to ${VERSION_STATUS[status]?.label ?? status}`);
    else addToast("error", "Could not update status");
  }

  function handleTimecodeClick(sec: number) {
    setTimecodeInput(fmtFilm(Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), Math.floor(sec % 60), 0));
    if (!panelCollapsed) setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent);
  }

  const currentVer = allVersions.find(v => v.id === selectedVersion?.id) ?? selectedVersion;

  const userName     = currentUser.full_name || currentUser.email.split("@")[0];
  const userInitials = userName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  // ─── MOBILE LAYOUT (< 768px) — scrollable page, aspect-ratio player ───────
  const mobileLayout = (
    <div className="md:hidden flex flex-col bg-[#080808] pb-28" style={{ color: "var(--text-1)" }}>
      <Sidebar active="review" userName={userName} userInitials={userInitials} />
      <ToastStack toasts={toasts} onRemove={removeToast} />

      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 shrink-0 flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.08] bg-[#0a0a0a]">
        <a href={`/project/${project.id}`}
          className="flex items-center gap-1.5 text-white/35 hover:text-white/70 text-[10px] tracking-[0.18em] uppercase transition-colors shrink-0">
          <ArrowLeft size={11} />Back
        </a>
        <div className="w-px h-4 bg-white/10 shrink-0" />

        {/* Project switcher — tappable dropdown */}
        <div className="relative min-w-0 flex-1" ref={projectMenuRef}>
          <button onClick={() => setShowProjectMenu(p => !p)} className="flex items-center gap-1 min-w-0 w-full text-left">
            <div className="min-w-0">
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/30 font-semibold leading-none mb-0.5">Project</p>
              <div className="flex items-center gap-1">
                <p className="text-white/80 text-sm font-semibold truncate leading-tight">{project.name}</p>
                {allProjects && allProjects.length > 1 && (
                  <ChevronDown size={12} className={`text-white/30 shrink-0 transition-transform ${showProjectMenu ? "rotate-180" : ""}`} />
                )}
              </div>
            </div>
          </button>
          {showProjectMenu && allProjects && allProjects.length > 1 && (
            <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-[#141414] border border-white/12 rounded-2xl shadow-2xl py-1.5 overflow-hidden">
              <p className="text-[9px] tracking-[0.25em] uppercase text-white/30 font-semibold px-4 pt-2 pb-1.5">Switch Project</p>
              {allProjects.map(p => (
                <a key={p.id} href={`/review/${p.id}`}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${p.id === project.id ? "bg-white/[0.04]" : "hover:bg-white/[0.06]"}`}
                  onClick={() => setShowProjectMenu(false)}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.id === project.id ? "bg-emerald-400" : "bg-white/20"}`} />
                  <p className={`text-xs font-medium truncate ${p.id === project.id ? "text-white/90" : "text-white/55"}`}>{p.name}</p>
                  {p.id === project.id && <CheckCircle2 size={12} className="text-emerald-400 shrink-0 ml-auto" />}
                </a>
              ))}
            </div>
          )}
        </div>

        {currentVer?.drive_url && (
          <a href={currentVer.drive_url} target="_blank" rel="noopener noreferrer"
            className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center text-white/35 shrink-0">
            <ExternalLink size={13} />
          </a>
        )}
      </header>

      {/* Player — padding-bottom trick gives reliable 16:9 on all mobile browsers including Safari */}
      <div className="w-full relative bg-black" style={{ paddingBottom: "56.25%" }}>
        <div className="absolute inset-0">
          <Player version={selectedVersion} />
        </div>
      </div>

      {/* Timecode Rail */}
      <div className="px-4 py-2 bg-[#080808]">
        <TimecodeRail comments={allVisible} onSeek={handleTimecodeClick} />
      </div>

      {/* Version / department picker — always visible, horizontal scroll */}
      <div className="px-4 pb-3 bg-[#080808]">
        {allVersions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {allVersions.map(v => (
              <button key={v.id} onClick={() => setSelectedVersion(v)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-medium transition-all ${
                  selectedVersion?.id === v.id
                    ? "bg-white/10 border-white/20 text-white/80"
                    : "border-white/8 text-white/35 hover:border-white/15 hover:text-white/55"
                }`}>
                {DEPT_ICON[v.department ?? ""] ?? <FileText size={10} />}
                <span className="truncate max-w-[100px]">{v.version_name}</span>
                {v.department && <span className="text-white/20 text-[9px]">{v.department}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Notes section — full natural height, page scrolls ── */}
      <div className="flex flex-col bg-[#090909] border-t border-white/[0.07]">

        {/* Notes header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare size={13} className="text-white/40" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-semibold">Notes</span>
            {openCount > 0 && (
              <span className="min-w-[20px] h-5 rounded-full bg-amber-500/25 border border-amber-400/30 text-amber-300 text-[10px] flex items-center justify-center font-semibold px-1">
                {openCount}
              </span>
            )}
          </div>
          <div className="text-white/20 text-[9px]">{resolvedCount}/{totalCount} resolved</div>
        </div>

        {/* Progress bar */}
        <ProgressBar total={totalCount} resolved={resolvedCount} />

        {/* Filter tabs */}
        <div className="flex px-3 py-2 gap-1">
          {(["all", "open", "resolved"] as FilterTab[]).map(tab => {
            const cnt = tab === "all" ? totalCount : tab === "open" ? openCount : resolvedCount;
            const active = filterTab === tab;
            return (
              <button key={tab} onClick={() => setFilterTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] transition-all capitalize font-medium ${
                  active ? "bg-white/10 text-white/80" : "text-white/35 hover:text-white/60 hover:bg-white/5"
                }`}>
                {tab}
                {cnt > 0 && (
                  <span className={`px-1.5 py-px rounded-full text-[9px] font-bold ${
                    active && tab === "open"     ? "bg-amber-500/25 text-amber-300" :
                    active && tab === "resolved" ? "bg-emerald-500/25 text-emerald-300" :
                                                   "bg-white/10 text-white/40"
                  }`}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Comments — no overflow-y-auto, page scrolls naturally */}
        <div className="border-t border-white/[0.04]">
          {visibleComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 px-6">
              <MessageSquare size={24} className="text-white/15" />
              <p className="text-white/30 text-sm text-center font-light">
                {filterTab === "resolved" ? "No resolved notes" :
                 filterTab === "open"     ? "All notes resolved 🎉" :
                                            "No notes yet"}
              </p>
            </div>
          ) : (
            visibleComments.map(c => (
              <CommentCard key={c.id} comment={c} currentUserId={currentUser.id}
                onTimecodeClick={handleTimecodeClick} onResolve={handleResolve} onDelete={handleDelete} />
            ))
          )}
        </div>

        {/* Add Note Form — always visible, page scrolls to it */}
        <div className="p-4 bg-[#0c0c0c] border-t border-white/[0.08]">
          {selectedVersion && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-white/30 text-[10px]">On</span>
              <span className="text-white/55 text-[10px] border border-white/10 bg-white/5 px-2 py-0.5 rounded-lg truncate max-w-[200px] font-medium">
                {selectedVersion.version_name}
              </span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <TimecodeRoller value={timecodeInput} onChange={setTimecodeInput} />
            <textarea
              ref={textareaRef}
              placeholder="Leave a note…"
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white/75 placeholder-white/25 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all resize-none"
            />
            <button type="submit" disabled={submitting || !body.trim()}
              className="flex items-center justify-center gap-2 w-full bg-white text-black text-xs font-bold py-3 rounded-xl hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-lg shadow-white/5">
              <Send size={12} />
              {submitting ? "Sending…" : "Send Note"}
            </button>
          </form>
          <p className="text-white/20 text-[9px] text-center mt-2.5">
            Tap any timecode badge to jump to that moment
          </p>
        </div>
      </div>
    </div>
  );

  // ─── DESKTOP LAYOUT (>= 768px) — fixed height panels ───────────────────────
  const desktopLayout = (
    <div className="hidden md:flex bg-[#080808] overflow-hidden" style={{ height: "100dvh", color: "var(--text-1)" }}>
      <Sidebar active="review" userName={userName} userInitials={userInitials} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ToastStack toasts={toasts} onRemove={removeToast} />

        {/* ── Top Bar ── */}
        {!cinemaMode && (
          <header className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-white/[0.08] bg-[#0a0a0a]">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <a href={`/project/${project.id}`}
                className="flex items-center gap-1.5 text-white/35 hover:text-white/70 text-[10px] tracking-[0.18em] uppercase transition-colors shrink-0">
                <ArrowLeft size={11} />Back
              </a>
              <div className="w-px h-4 bg-white/10 shrink-0" />
              <div className="relative min-w-0" ref={projectMenuRef}>
                <button onClick={() => setShowProjectMenu(p => !p)} className="flex items-center gap-1.5 group min-w-0">
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] tracking-[0.3em] uppercase text-white/30 font-semibold">Project</span>
                      {project.client && (
                        <span className="text-[9px] text-white/25 border border-white/10 px-1.5 py-0.5 rounded-md font-medium">{project.client}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-white/80 text-sm font-semibold truncate group-hover:text-white transition-colors">{project.name}</p>
                      {allProjects && allProjects.length > 1 && (
                        <ChevronDown size={12} className={`text-white/30 shrink-0 transition-transform ${showProjectMenu ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </div>
                </button>
                {showProjectMenu && allProjects && allProjects.length > 1 && (
                  <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-[#141414] border border-white/12 rounded-2xl shadow-2xl py-1.5 overflow-hidden">
                    <p className="text-[9px] tracking-[0.25em] uppercase text-white/30 font-semibold px-4 pt-2 pb-1.5">Switch Project</p>
                    {allProjects.map(p => (
                      <a key={p.id} href={`/review/${p.id}`}
                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.06] transition-colors ${p.id === project.id ? "bg-white/[0.04]" : ""}`}
                        onClick={() => setShowProjectMenu(false)}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.id === project.id ? "bg-emerald-400" : "bg-white/20"}`} />
                        <div className="min-w-0">
                          <p className={`text-xs font-medium truncate ${p.id === project.id ? "text-white/90" : "text-white/55"}`}>{p.name}</p>
                          {p.departments?.length > 0 && (
                            <p className="text-[10px] text-white/25 truncate">{p.departments.join(" · ")}</p>
                          )}
                        </div>
                        {p.id === project.id && <CheckCircle2 size={12} className="text-emerald-400 shrink-0 ml-auto" />}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {currentVer && (
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 text-white/45">
                  {DEPT_ICON[currentVer.department ?? ""] ?? <FileText size={13} />}
                  <span className="text-white/60 text-xs font-medium">{currentVer.version_name}</span>
                </div>
                <VersionStatusPicker version={currentVer} onUpdate={handleVersionStatus} />
              </div>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={handleRefresh}
                className={`w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/5 transition-all ${refreshing ? "animate-spin" : ""}`}>
                <RefreshCw size={13} />
              </button>
              <button onClick={() => exportNotes(visibleComments, project, selectedVersion)}
                className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/5 transition-all">
                <Download size={13} />
              </button>
              {currentVer?.drive_url && (
                <a href={currentVer.drive_url} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/5 transition-all">
                  <ExternalLink size={13} />
                </a>
              )}
              <button onClick={() => setCinemaMode(true)}
                className="flex items-center gap-1.5 border border-white/10 hover:border-white/20 rounded-xl px-3 h-8 text-[10px] text-white/45 hover:text-white/70 hover:bg-white/5 transition-all font-medium">
                <Maximize2 size={11} />Cinema
              </button>
            </div>
          </header>
        )}

        {/* ── Body ── */}
        <div className="flex flex-row flex-1 min-h-0">

          {/* Version Sidebar */}
          {!cinemaMode && (
            <div className="hidden md:contents">
              <VersionSidebar
                versions={allVersions} comments={comments} selected={selectedVersion}
                collapsed={sidebarCollapsed}
                onSelect={setSelectedVersion}
                onCollapse={() => setSidebarCollapsed(p => !p)}
              />
            </div>
          )}

          {/* Center: Player */}
          <div className="flex-1 min-w-0 flex flex-col relative">
            {cinemaMode && (
              <div className="absolute top-4 right-4 z-50">
                <button onClick={() => setCinemaMode(false)}
                  className="flex items-center gap-2 bg-black/75 hover:bg-black border border-white/12 rounded-xl px-3.5 py-2 text-xs text-white/60 hover:text-white/90 transition-all backdrop-blur-sm shadow-xl">
                  <Minimize2 size={11} />
                  Exit Cinema <span className="text-white/25 text-[10px]">Esc</span>
                </button>
              </div>
            )}
            <div className={`flex-1 min-h-0 ${cinemaMode ? "" : "p-4 pb-2"}`}>
              <div className={`w-full h-full overflow-hidden bg-black ${cinemaMode ? "" : "rounded-2xl border border-white/[0.06]"}`}>
                <Player version={selectedVersion} />
              </div>
            </div>
            {!cinemaMode && (
              <div className="px-6 pb-1">
                <TimecodeRail comments={allVisible} onSeek={handleTimecodeClick} />
              </div>
            )}
            {!cinemaMode && selectedVersion && (
              <div className="shrink-0 px-5 pb-3 flex items-center gap-3">
                <span className="text-white/35 text-[10px] font-medium truncate">{selectedVersion.version_name}</span>
                {selectedVersion.department && (
                  <span className="text-[10px] text-white/25 border border-white/8 px-1.5 py-0.5 rounded-md font-medium">
                    {selectedVersion.department}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1.5 text-white/20 text-[10px]">
                  <Eye size={10} /><span>Live · refreshes every 45s</span>
                </div>
              </div>
            )}
          </div>

          {/* Comments Panel */}
          {!cinemaMode && (
            <div className={`shrink-0 border-l border-white/[0.07] flex flex-col bg-[#090909] transition-all duration-200 ${panelCollapsed ? "w-12" : "w-[340px]"}`}>
              {panelCollapsed ? (
                <div className="flex flex-col items-center pt-4 gap-3">
                  <button onClick={() => setPanelCollapsed(false)} className="text-white/35 hover:text-white/70 transition-colors p-1">
                    <MessageSquare size={15} />
                  </button>
                  {openCount > 0 && (
                    <span className="min-w-[22px] h-[22px] rounded-full bg-amber-500/25 border border-amber-400/30 text-amber-300 text-[10px] flex items-center justify-center font-bold px-1">
                      {openCount}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <div className="shrink-0 border-b border-white/[0.07]">
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={13} className="text-white/40" />
                        <span className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-semibold">Notes</span>
                      </div>
                      <button onClick={() => setPanelCollapsed(true)} className="text-white/25 hover:text-white/60 transition-colors">
                        <ChevronLeft size={13} />
                      </button>
                    </div>
                    <ProgressBar total={totalCount} resolved={resolvedCount} />
                    <div className="flex px-3 py-2 gap-1">
                      {(["all", "open", "resolved"] as FilterTab[]).map(tab => {
                        const cnt = tab === "all" ? totalCount : tab === "open" ? openCount : resolvedCount;
                        const active = filterTab === tab;
                        return (
                          <button key={tab} onClick={() => setFilterTab(tab)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] transition-all capitalize font-medium ${
                              active ? "bg-white/10 text-white/80" : "text-white/35 hover:text-white/60 hover:bg-white/5"
                            }`}>
                            {tab}
                            {cnt > 0 && (
                              <span className={`px-1.5 py-px rounded-full text-[9px] font-bold ${
                                active && tab === "open"     ? "bg-amber-500/25 text-amber-300" :
                                active && tab === "resolved" ? "bg-emerald-500/25 text-emerald-300" :
                                                               "bg-white/10 text-white/40"
                              }`}>{cnt}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {visibleComments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                          {filterTab === "resolved" ? <CheckCircle2 size={22} className="text-white/15" /> : <MessageSquare size={22} className="text-white/15" />}
                        </div>
                        <div className="text-center">
                          <p className="text-white/40 text-sm font-medium">
                            {filterTab === "resolved" ? "No resolved notes yet" : filterTab === "open" ? "All notes resolved 🎉" : "No notes yet"}
                          </p>
                          {filterTab === "all" && (
                            <p className="text-white/25 text-xs mt-1.5 leading-relaxed">Add a timecoded note below<br />to start the feedback loop.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        {visibleComments.map(c => (
                          <CommentCard key={c.id} comment={c} currentUserId={currentUser.id}
                            onTimecodeClick={handleTimecodeClick} onResolve={handleResolve} onDelete={handleDelete} />
                        ))}
                        <div ref={commentsEndRef} className="h-3" />
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 border-t border-white/[0.08] p-4 bg-[#0c0c0c]">
                    {selectedVersion && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-white/30 text-[10px]">On</span>
                        <span className="text-white/55 text-[10px] border border-white/10 bg-white/5 px-2 py-0.5 rounded-lg truncate max-w-[180px] font-medium">
                          {selectedVersion.version_name}
                        </span>
                      </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
                      <TimecodeRoller value={timecodeInput} onChange={setTimecodeInput} />
                      <textarea ref={textareaRef} placeholder="Leave a note… (⌘↵ to send)" value={body}
                        onChange={e => setBody(e.target.value)} onKeyDown={handleKeyDown} rows={3}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white/75 placeholder-white/25 outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all resize-none" />
                      <button type="submit" disabled={submitting || !body.trim()}
                        className="flex items-center justify-center gap-2 w-full bg-white text-black text-xs font-bold py-3 rounded-xl hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-lg shadow-white/5">
                        <Send size={12} />{submitting ? "Sending…" : "Send Note"}
                      </button>
                    </form>
                    <p className="text-white/20 text-[9px] text-center mt-2.5">Click any timecode badge to jump to that moment</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileLayout}
      {desktopLayout}
    </>
  );
}
