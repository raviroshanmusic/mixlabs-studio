"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft, ChevronDown, ChevronUp, ChevronLeft,
  Send, Play, ExternalLink, MessageSquare, Clock,
  Volume2, Music, Palette, Scissors, Wand2, Zap, FileText,
  Check, Download, Maximize2, Minimize2,
  CheckCircle2, Circle, Film, Layers,
  X, Flag, RefreshCw, MoreHorizontal, Eye, Trash2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Project = { id: string; name: string; client: string | null; status: string; departments: string[] };
type Version = {
  id: string; version_name: string; department: string | null;
  drive_url: string | null; status: string; created_at: string;
};
type Comment = {
  id: string; body: string; timecode: number | null; version_id: string | null;
  created_at: string; author_id: string; author_name: string | null; status: string;
  profiles: { id: string; full_name: string | null; email: string | null } | null;
};
type CurrentUser = { id: string; full_name: string | null; email: string };
type FilterTab = "all" | "open" | "resolved";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_ICON: Record<string, React.ReactNode> = {
  Sound:     <Volume2 size={13} />,
  Score:     <Music size={13} />,
  Color:     <Palette size={13} />,
  Edit:      <Scissors size={13} />,
  Animation: <Wand2 size={13} />,
  VFX:       <Zap size={13} />,
};

const VERSION_STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  draft:             { label: "Draft",             dot: "bg-white/20",     text: "text-white/40" },
  in_review:         { label: "In Review",         dot: "bg-amber-400",    text: "text-amber-400" },
  changes_requested: { label: "Changes Requested", dot: "bg-rose-400",     text: "text-rose-400" },
  approved:          { label: "Approved",          dot: "bg-emerald-400",  text: "text-emerald-400" },
};

const AVATAR_PALETTE = [
  { bg: "bg-violet-500/25", text: "text-violet-300" },
  { bg: "bg-blue-500/25",   text: "text-blue-300"   },
  { bg: "bg-emerald-500/25",text: "text-emerald-300" },
  { bg: "bg-amber-500/25",  text: "text-amber-300"   },
  { bg: "bg-rose-500/25",   text: "text-rose-300"    },
  { bg: "bg-cyan-500/25",   text: "text-cyan-300"    },
  { bg: "bg-fuchsia-500/25",text: "text-fuchsia-300" },
  { bg: "bg-orange-500/25", text: "text-orange-300"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTimecode(sec: number | null | undefined): string {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseTimecode(str: string): number | null {
  const clean = str.trim();
  if (!clean) return null;
  const parts = clean.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function parseFilmTimecode(str: string): { h: number; m: number; s: number } {
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return { h: parts[0] ?? 0, m: parts[1] ?? 0, s: parts[2] ?? 0 };
  if (parts.length === 2) return { h: 0, m: parts[0] ?? 0, s: parts[1] ?? 0 };
  return { h: 0, m: 0, s: 0 };
}

function fmtFilm(h: number, m: number, s: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
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

function exportCommentsToText(comments: Comment[], project: Project, version: Version | null) {
  const header = [
    `REVIEW NOTES`,
    `Project: ${project.name}${project.client ? ` (${project.client})` : ""}`,
    `File: ${version?.version_name ?? "All Versions"}`,
    `Exported: ${new Date().toLocaleString()}`,
    `─────────────────────────────────────────`,
    "",
  ].join("\n");
  const body = comments
    .map(c => {
      const tc = c.timecode != null ? `[${fmtTimecode(c.timecode)}] ` : "";
      const status = c.status === "resolved" ? " ✓" : "";
      return `${tc}${c.author_name ?? "Unknown"}${status}\n${c.body}`;
    })
    .join("\n\n");
  const blob = new Blob([header + body], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `review-notes-${project.name.toLowerCase().replace(/\s+/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Drum Roller ─────────────────────────────────────────────────────────────

function Drum({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const wrap = (v: number) => ((v % (max + 1)) + (max + 1)) % (max + 1);
  return (
    <div
      className="flex flex-col items-center cursor-ns-resize select-none"
      onWheel={e => { e.preventDefault(); onChange(wrap(value + (e.deltaY > 0 ? 1 : -1))); }}
    >
      <button type="button" onClick={() => onChange(wrap(value - 1))}
        className="text-white/15 hover:text-white/50 transition-colors px-2 py-0.5">
        <ChevronUp size={11} />
      </button>
      <div className="text-white/15 text-xs font-mono tabular-nums leading-none py-0.5">
        {String(wrap(value - 1)).padStart(2, "0")}
      </div>
      <div className="text-white text-sm font-mono tabular-nums leading-none py-1 px-2.5 bg-white/10 rounded-lg my-0.5">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-white/15 text-xs font-mono tabular-nums leading-none py-0.5">
        {String(wrap(value + 1)).padStart(2, "0")}
      </div>
      <button type="button" onClick={() => onChange(wrap(value + 1))}
        className="text-white/15 hover:text-white/50 transition-colors px-2 py-0.5">
        <ChevronDown size={11} />
      </button>
    </div>
  );
}

function TimecodeRoller({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { h, m, s } = parseFilmTimecode(value);
  const hasValue = value.length > 0 && value !== "00:00:00";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button"
        onClick={() => { if (!value) onChange("00:00:00"); setOpen(p => !p); }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
          hasValue
            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
            : "bg-white/[0.03] border-white/8 text-white/30 hover:border-white/15 hover:text-white/50"
        }`}>
        <Clock size={10} className={hasValue ? "text-amber-400" : "text-white/25"} />
        <span>{hasValue ? value : "timecode"}</span>
        {hasValue && (
          <span onClick={e => { e.stopPropagation(); onChange(""); }}
            className="text-white/30 hover:text-white/70 ml-0.5 cursor-pointer">×</span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 bg-[#111] border border-white/12 rounded-2xl shadow-2xl shadow-black/60 p-4">
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/20 text-center mb-3 font-medium">HH : MM : SS</p>
          <div className="flex items-center gap-1">
            <Drum value={h} max={23} onChange={v => onChange(fmtFilm(v, m, s))} />
            <span className="text-white/20 text-base font-mono pb-1">:</span>
            <Drum value={m} max={59} onChange={v => onChange(fmtFilm(h, v, s))} />
            <span className="text-white/20 text-base font-mono pb-1">:</span>
            <Drum value={s} max={59} onChange={v => onChange(fmtFilm(h, m, v))} />
          </div>
          <button type="button" onClick={() => setOpen(false)}
            className="mt-3 w-full text-[10px] text-white/30 hover:text-white/60 transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Timecode Rail ────────────────────────────────────────────────────────────

function TimecodeRail({
  comments, onSeek
}: {
  comments: Comment[];
  onSeek: (sec: number) => void;
}) {
  const [hovered, setHovered] = useState<Comment | null>(null);
  const [mouseX, setMouseX] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  const timecoded = comments.filter(c => c.timecode != null);
  if (timecoded.length === 0) return null;

  const maxSec = Math.max(...timecoded.map(c => c.timecode!));
  const range = maxSec || 1;

  return (
    <div
      ref={railRef}
      className="relative h-7 flex items-center group"
      onMouseMove={e => {
        const rect = railRef.current?.getBoundingClientRect();
        if (rect) setMouseX(e.clientX - rect.left);
      }}
    >
      {/* Track */}
      <div className="absolute inset-x-0 h-[2px] bg-white/[0.06] rounded-full" />

      {/* Markers */}
      {timecoded.map(c => {
        const pct = (c.timecode! / range) * 100;
        const isResolved = c.status === "resolved";
        return (
          <button
            key={c.id}
            onClick={() => onSeek(c.timecode!)}
            onMouseEnter={() => setHovered(c)}
            onMouseLeave={() => setHovered(null)}
            style={{ left: `${pct}%` }}
            className={`absolute -translate-x-1/2 transition-all duration-150 ${
              isResolved
                ? "w-1.5 h-1.5 rounded-full bg-emerald-500/50 hover:bg-emerald-400 hover:scale-150"
                : "w-2 h-2 rounded-full bg-amber-400/80 hover:bg-amber-300 hover:scale-150"
            }`}
          />
        );
      })}

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute bottom-6 z-20 pointer-events-none"
          style={{ left: mouseX, transform: "translateX(-50%)" }}
        >
          <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl min-w-[140px] max-w-[200px]">
            <p className="text-[10px] text-amber-400 font-mono mb-0.5">{fmtTimecode(hovered.timecode)}</p>
            <p className="text-white/70 text-xs leading-snug line-clamp-2">{hovered.body}</p>
            <p className="text-white/25 text-[10px] mt-0.5">{hovered.author_name}</p>
          </div>
          <div className="w-px h-2 bg-white/15 mx-auto" />
        </div>
      )}
    </div>
  );
}

// ─── Version Sidebar ──────────────────────────────────────────────────────────

function VersionSidebar({
  versions, comments, selected, collapsed, onSelect, onCollapse,
}: {
  versions: Version[];
  comments: Comment[];
  selected: Version | null;
  collapsed: boolean;
  onSelect: (v: Version) => void;
  onCollapse: () => void;
}) {
  // Group by department
  const grouped = useMemo(() => {
    const map: Record<string, Version[]> = {};
    for (const v of versions) {
      const dept = v.department || "General";
      if (!map[dept]) map[dept] = [];
      map[dept].push(v);
    }
    return Object.entries(map);
  }, [versions]);

  // Open comment count per version
  const openCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of comments) {
      if (c.version_id && c.status === "open") {
        counts[c.version_id] = (counts[c.version_id] ?? 0) + 1;
      }
    }
    return counts;
  }, [comments]);

  if (collapsed) {
    return (
      <div className="w-12 shrink-0 border-r border-white/[0.07] flex flex-col items-center pt-4 gap-3">
        <button onClick={onCollapse}
          className="text-white/20 hover:text-white/60 transition-colors p-1">
          <Layers size={15} />
        </button>
        {versions.slice(0, 8).map(v => {
          const dept = v.department ?? "General";
          const hasBadge = (openCounts[v.id] ?? 0) > 0;
          return (
            <button key={v.id} onClick={() => onSelect(v)} title={v.version_name}
              className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                selected?.id === v.id
                  ? "bg-white/10 text-white/80"
                  : "text-white/25 hover:text-white/60 hover:bg-white/5"
              }`}>
              {DEPT_ICON[dept] ?? <FileText size={13} />}
              {hasBadge && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
        <button onClick={onCollapse}
          className="mt-auto mb-4 text-white/15 hover:text-white/40 transition-colors">
          <ChevronLeft size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-56 shrink-0 border-r border-white/[0.07] flex flex-col bg-[#090909]">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Layers size={12} className="text-white/25" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/25 font-medium">Files</span>
        </div>
        <button onClick={onCollapse} className="text-white/15 hover:text-white/50 transition-colors">
          <ChevronLeft size={13} />
        </button>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto py-2">
        {grouped.length === 0 ? (
          <p className="text-white/20 text-xs px-4 py-4">No files added yet.</p>
        ) : (
          grouped.map(([dept, vers]) => (
            <div key={dept} className="mb-1">
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-white/20">{DEPT_ICON[dept] ?? <FileText size={11} />}</span>
                <span className="text-[9px] tracking-[0.2em] uppercase text-white/20 font-medium">{dept}</span>
              </div>
              {vers.map(v => {
                const isSelected = selected?.id === v.id;
                const openCount = openCounts[v.id] ?? 0;
                const sc = VERSION_STATUS_CONFIG[v.status] ?? VERSION_STATUS_CONFIG.draft;
                return (
                  <button key={v.id} onClick={() => onSelect(v)}
                    className={`w-full text-left px-4 py-2.5 transition-all group ${
                      isSelected ? "bg-white/[0.07]" : "hover:bg-white/[0.03]"
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs leading-snug truncate flex-1 ${isSelected ? "text-white/80" : "text-white/40 group-hover:text-white/60"}`}>
                        {v.version_name}
                      </span>
                      {openCount > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] flex items-center justify-center font-medium">
                          {openCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                      <span className={`text-[10px] ${sc.text}`}>{sc.label}</span>
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

// ─── Player ───────────────────────────────────────────────────────────────────

function Player({ version }: { version: Version | null }) {
  if (!version) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <Film size={28} className="text-white/10" />
          </div>
          <div className="absolute -inset-4 rounded-full border border-white/[0.03] animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-white/25 text-sm font-medium">No file selected</p>
          <p className="text-white/12 text-xs mt-1">Choose a file from the sidebar to begin reviewing</p>
        </div>
      </div>
    );
  }

  const embedUrl = version.drive_url ? getEmbedUrl(version.drive_url) : null;

  if (!embedUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <p className="text-white/25 text-sm">No previewable link for this file.</p>
        {version.drive_url && (
          <a href={version.drive_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 border border-white/10 px-4 py-2 rounded-xl transition-colors">
            <ExternalLink size={12} /> Open externally
          </a>
        )}
      </div>
    );
  }

  return (
    <iframe
      key={embedUrl}
      src={embedUrl}
      className="w-full h-full"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
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
  const name = comment.author_name || comment.profiles?.full_name || comment.profiles?.email || "Unknown";
  const color = avatarColor(name);
  const isResolved = comment.status === "resolved";
  const isOwn = comment.author_id === currentUserId;

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menu]);

  return (
    <div className={`group px-4 py-3.5 transition-colors border-b border-white/[0.04] last:border-0 ${
      isResolved ? "opacity-50 hover:opacity-70" : "hover:bg-white/[0.02]"
    }`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5 ${color.bg} ${color.text}`}>
          {initials(name)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Meta */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-white/70 text-xs font-medium">{name}</span>
            <span className="text-white/20 text-[10px]">{timeAgo(comment.created_at)}</span>

            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Timecode badge */}
              {comment.timecode != null && (
                <button onClick={() => onTimecodeClick(comment.timecode!)}
                  className="flex items-center gap-1 text-[10px] text-amber-400/70 hover:text-amber-300 bg-amber-500/8 hover:bg-amber-500/15 border border-amber-500/15 px-2 py-0.5 rounded-md transition-all font-mono">
                  <Clock size={8} />
                  {fmtTimecode(comment.timecode)}
                </button>
              )}

              {/* Resolve / Unresolve */}
              <button
                onClick={() => onResolve(comment.id, isResolved ? "open" : "resolved")}
                title={isResolved ? "Reopen" : "Mark resolved"}
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  isResolved
                    ? "text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10"
                    : "text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10"
                }`}>
                <CheckCircle2 size={13} />
              </button>

              {/* More menu */}
              <div ref={menuRef} className="relative">
                <button onClick={() => setMenu(p => !p)}
                  className="w-5 h-5 rounded-md text-white/15 hover:text-white/50 hover:bg-white/5 flex items-center justify-center transition-all">
                  <MoreHorizontal size={12} />
                </button>
                {menu && (
                  <div className="absolute right-0 top-6 z-30 w-36 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 overflow-hidden">
                    {isOwn && (
                      <button onClick={() => { onDelete(comment.id); setMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors">
                        <Trash2 size={11} /> Delete
                      </button>
                    )}
                    <button onClick={() => { navigator.clipboard.writeText(comment.body); setMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/50 hover:bg-white/5 transition-colors">
                      <FileText size={11} /> Copy text
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timecode badge (always visible if timecode exists) */}
          {comment.timecode != null && (
            <button onClick={() => onTimecodeClick(comment.timecode!)}
              className="inline-flex items-center gap-1 text-[10px] text-amber-400/60 font-mono mb-1.5 hover:text-amber-300 transition-colors group-hover:opacity-0 opacity-100">
              <Clock size={8} />
              {fmtTimecode(comment.timecode)}
            </button>
          )}

          {/* Body */}
          <p className={`text-sm leading-relaxed ${isResolved ? "line-through text-white/30" : "text-white/65"}`}>
            {comment.body}
          </p>
        </div>
      </div>

      {/* Resolved badge */}
      {isResolved && (
        <div className="mt-2 ml-10 flex items-center gap-1">
          <CheckCircle2 size={10} className="text-emerald-500/50" />
          <span className="text-[10px] text-emerald-500/40">Resolved</span>
        </div>
      )}
    </div>
  );
}

// ─── Version Status Picker ────────────────────────────────────────────────────

function VersionStatusPicker({
  version, onUpdate,
}: {
  version: Version | null;
  onUpdate: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (!version) return null;
  const sc = VERSION_STATUS_CONFIG[version.status] ?? VERSION_STATUS_CONFIG.draft;

  const statuses = ["draft", "in_review", "changes_requested", "approved"] as const;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl px-3 py-1.5 transition-all">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
        <span className={`text-xs ${sc.text}`}>{sc.label}</span>
        <ChevronDown size={10} className="text-white/20" />
      </button>

      {open && (
        <div className="absolute top-10 left-0 z-30 w-52 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl py-1.5 overflow-hidden">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/20 px-3 pt-1.5 pb-2">Set file status</p>
          {statuses.map(s => {
            const cfg = VERSION_STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => { onUpdate(version.id, s); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left ${version.status === s ? "bg-white/5" : ""}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
                {version.status === s && <Check size={11} className="ml-auto text-white/30" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReviewClient({
  project, versions, comments: initialComments, currentUser, initialDept,
}: {
  project: Project;
  versions: Version[];
  comments: Comment[];
  currentUser: CurrentUser;
  initialDept?: string | null;
}) {
  const firstVersion = initialDept
    ? (versions.find(v => v.department === initialDept) ?? versions[0] ?? null)
    : (versions[0] ?? null);

  const [selectedVersion, setSelectedVersion] = useState<Version | null>(firstVersion);
  const [allVersions, setAllVersions] = useState<Version[]>(versions);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [body, setBody] = useState("");
  const [timecodeInput, setTimecodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-poll every 45s
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/projects/${project.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
        setLastRefresh(Date.now());
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [project.id]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const res = await fetch(`/api/projects/${project.id}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data);
      setLastRefresh(Date.now());
    }
    setRefreshing(false);
  }, [project.id]);

  // Keyboard: Escape exits cinema mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && cinemaMode) setCinemaMode(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cinemaMode]);

  // Filtered + sorted comments
  const visibleComments = useMemo(() => {
    let cs = selectedVersion
      ? comments.filter(c => !c.version_id || c.version_id === selectedVersion.id)
      : comments;
    if (filterTab === "open") cs = cs.filter(c => c.status !== "resolved");
    if (filterTab === "resolved") cs = cs.filter(c => c.status === "resolved");
    return cs.sort((a, b) => {
      if (a.timecode != null && b.timecode != null) return a.timecode - b.timecode;
      if (a.timecode != null) return -1;
      if (b.timecode != null) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [comments, selectedVersion, filterTab]);

  const openCount = useMemo(() =>
    visibleComments.filter(c => c.status === "open").length, [visibleComments]);
  const resolvedCount = useMemo(() =>
    visibleComments.filter(c => c.status === "resolved").length, [visibleComments]);

  // Submit comment
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
      const newComment = await res.json();
      setComments(prev => [...prev, {
        ...newComment,
        profiles: { id: currentUser.id, full_name: currentUser.full_name, email: currentUser.email },
      }]);
      setBody("");
      setTimecodeInput("");
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setSubmitting(false);
  }

  // Resolve / reopen comment
  async function handleResolve(commentId: string, status: "open" | "resolved") {
    // Optimistic update
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, status } : c));
    const res = await fetch(`/api/projects/${project.id}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      // Revert
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: status === "open" ? "resolved" : "open" } : c));
    }
  }

  // Delete comment
  async function handleDelete(commentId: string) {
    setComments(prev => prev.filter(c => c.id !== commentId));
    await fetch(`/api/projects/${project.id}/comments/${commentId}`, { method: "DELETE" });
  }

  // Version status update
  async function handleVersionStatus(versionId: string, status: string) {
    setAllVersions(prev => prev.map(v => v.id === versionId ? { ...v, status } : v));
    if (selectedVersion?.id === versionId) setSelectedVersion(prev => prev ? { ...prev, status } : prev);
    await fetch(`/api/projects/${project.id}/versions/${versionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  // Timecode click → prefill roller + focus textarea
  function handleTimecodeClick(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    setTimecodeInput(fmtFilm(h, m, s));
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent);
  }

  const currentSelectedVersion = allVersions.find(v => v.id === selectedVersion?.id) ?? selectedVersion;

  return (
    <div className="flex flex-col h-screen bg-[#080808] overflow-hidden text-white">

      {/* ── Top Bar ── */}
      <header className={`shrink-0 flex items-center gap-4 px-5 py-3 border-b border-white/[0.07] transition-all duration-300 ${cinemaMode ? "opacity-0 pointer-events-none h-0 py-0 overflow-hidden border-0" : ""}`}>
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <a href={`/project/${project.id}`}
            className="flex items-center gap-1.5 text-white/20 hover:text-white/60 text-[10px] tracking-[0.18em] uppercase transition-colors shrink-0">
            <ArrowLeft size={11} />
            Back
          </a>
          <div className="w-px h-4 bg-white/8" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] tracking-[0.25em] uppercase text-white/20">Review Room</span>
              {project.client && (
                <span className="text-[9px] text-white/15 border border-white/8 px-1.5 py-0.5 rounded-md">{project.client}</span>
              )}
            </div>
            <p className="text-white/70 text-sm font-medium truncate">{project.name}</p>
          </div>
        </div>

        {/* Center: version info + status */}
        <div className="flex-1 flex items-center justify-center gap-3">
          {currentSelectedVersion && (
            <>
              <div className="flex items-center gap-2 text-white/40 text-sm">
                {DEPT_ICON[currentSelectedVersion.department ?? ""] ?? <FileText size={13} />}
                <span className="text-white/60 text-xs">{currentSelectedVersion.version_name}</span>
              </div>
              <VersionStatusPicker version={currentSelectedVersion} onUpdate={handleVersionStatus} />
            </>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh */}
          <button onClick={handleRefresh}
            className={`w-8 h-8 rounded-xl border border-white/8 flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-all ${refreshing ? "animate-spin" : ""}`}>
            <RefreshCw size={13} />
          </button>

          {/* Export */}
          <button onClick={() => exportCommentsToText(visibleComments, project, selectedVersion)}
            className="w-8 h-8 rounded-xl border border-white/8 flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-all">
            <Download size={13} />
          </button>

          {/* External link */}
          {currentSelectedVersion?.drive_url && (
            <a href={currentSelectedVersion.drive_url} target="_blank" rel="noopener noreferrer"
              className="w-8 h-8 rounded-xl border border-white/8 flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-all">
              <ExternalLink size={13} />
            </a>
          )}

          {/* Cinema mode */}
          <button onClick={() => setCinemaMode(true)}
            className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 rounded-xl px-3 h-8 text-[10px] text-white/40 hover:text-white/70 transition-all">
            <Maximize2 size={11} />
            Cinema
          </button>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* Version Sidebar */}
        {!cinemaMode && (
          <VersionSidebar
            versions={allVersions}
            comments={comments}
            selected={selectedVersion}
            collapsed={sidebarCollapsed}
            onSelect={setSelectedVersion}
            onCollapse={() => setSidebarCollapsed(p => !p)}
          />
        )}

        {/* Center: Player + rail */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Cinema mode exit button */}
          {cinemaMode && (
            <div className="absolute top-4 right-4 z-50">
              <button onClick={() => setCinemaMode(false)}
                className="flex items-center gap-2 bg-black/70 hover:bg-black/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/60 hover:text-white/90 transition-all backdrop-blur">
                <Minimize2 size={11} />
                Exit Cinema
              </button>
            </div>
          )}

          {/* Player area */}
          <div className={`flex-1 min-h-0 relative ${cinemaMode ? "p-0" : "p-4 pb-2"}`}>
            <div className={`w-full h-full overflow-hidden bg-black ${cinemaMode ? "" : "rounded-2xl border border-white/[0.05]"}`}>
              <Player version={selectedVersion} />
            </div>
          </div>

          {/* Timecode Rail */}
          {!cinemaMode && (
            <div className="px-6 pb-2">
              <TimecodeRail
                comments={visibleComments}
                onSeek={handleTimecodeClick}
              />
            </div>
          )}

          {/* File meta bar */}
          {!cinemaMode && selectedVersion && (
            <div className="shrink-0 px-5 pb-3 flex items-center gap-3">
              <span className="text-white/25 text-[10px] truncate">{selectedVersion.version_name}</span>
              {selectedVersion.department && (
                <span className="text-[10px] text-white/15 border border-white/[0.07] px-1.5 py-0.5 rounded-md">
                  {selectedVersion.department}
                </span>
              )}
              <div className="ml-auto flex items-center gap-2 text-white/15 text-[10px]">
                <Eye size={10} />
                <span>Auto-refreshing every 45s</span>
              </div>
            </div>
          )}
        </div>

        {/* Comments Panel */}
        {!cinemaMode && (
          <div className={`shrink-0 border-l border-white/[0.07] flex flex-col transition-all duration-300 ${panelCollapsed ? "w-12" : "w-[340px]"}`}>

            {panelCollapsed ? (
              <div className="flex flex-col items-center pt-4 gap-4">
                <button onClick={() => setPanelCollapsed(false)}
                  className="text-white/20 hover:text-white/60 transition-colors">
                  <MessageSquare size={15} />
                </button>
                {openCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] flex items-center justify-center">
                    {openCount}
                  </span>
                )}
              </div>
            ) : (
              <>
                {/* Panel Header */}
                <div className="shrink-0 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={12} className="text-white/25" />
                      <span className="text-[10px] tracking-[0.2em] uppercase text-white/25 font-medium">Notes</span>
                    </div>
                    <button onClick={() => setPanelCollapsed(true)}
                      className="text-white/15 hover:text-white/50 transition-colors">
                      <ChevronLeft size={13} />
                    </button>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex px-3 pb-3 gap-1">
                    {(["all", "open", "resolved"] as FilterTab[]).map(tab => {
                      const count = tab === "all" ? visibleComments.length : tab === "open" ? openCount : resolvedCount;
                      return (
                        <button key={tab} onClick={() => setFilterTab(tab)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] transition-all capitalize ${
                            filterTab === tab
                              ? "bg-white/8 text-white/70"
                              : "text-white/25 hover:text-white/50 hover:bg-white/4"
                          }`}>
                          <span>{tab}</span>
                          {count > 0 && (
                            <span className={`px-1 py-px rounded-full text-[9px] ${
                              tab === "open" && filterTab === tab ? "bg-amber-500/20 text-amber-400" :
                              tab === "resolved" && filterTab === tab ? "bg-emerald-500/20 text-emerald-400" :
                              "bg-white/8 text-white/30"
                            }`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment List */}
                <div className="flex-1 overflow-y-auto">
                  {visibleComments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                        <MessageSquare size={18} className="text-white/10" />
                      </div>
                      <div className="text-center">
                        <p className="text-white/25 text-sm">
                          {filterTab === "resolved" ? "No resolved notes" :
                           filterTab === "open" ? "No open notes" : "No notes yet"}
                        </p>
                        <p className="text-white/12 text-xs mt-1 leading-relaxed">
                          {filterTab === "all" ? "Add a timecoded note below to start the conversation." : ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {visibleComments.map(c => (
                        <CommentCard
                          key={c.id}
                          comment={c}
                          currentUserId={currentUser.id}
                          onTimecodeClick={handleTimecodeClick}
                          onResolve={handleResolve}
                          onDelete={handleDelete}
                        />
                      ))}
                      <div ref={commentsEndRef} className="h-2" />
                    </div>
                  )}
                </div>

                {/* Add Note Form */}
                <div className="shrink-0 border-t border-white/[0.07] p-4 bg-[#090909]">
                  {/* Version context badge */}
                  {selectedVersion && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="text-white/15 text-[10px]">Commenting on</span>
                      <span className="text-white/35 text-[10px] border border-white/8 px-1.5 py-0.5 rounded-md truncate max-w-[160px]">
                        {selectedVersion.version_name}
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <TimecodeRoller value={timecodeInput} onChange={setTimecodeInput} />
                      {timecodeInput && timecodeInput !== "00:00:00" && (
                        <span className="text-[10px] text-white/25">← mark in timeline</span>
                      )}
                    </div>

                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        placeholder="Add a note… ⌘↵ to send"
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={3}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/65 placeholder-white/15 outline-none focus:border-white/15 focus:bg-white/[0.04] transition-all resize-none"
                      />
                    </div>

                    <button type="submit" disabled={submitting || !body.trim()}
                      className="flex items-center justify-center gap-2 w-full bg-white/90 hover:bg-white text-black text-xs font-semibold py-2.5 rounded-xl disabled:opacity-25 transition-all">
                      <Send size={11} />
                      {submitting ? "Sending…" : "Send Note"}
                    </button>
                  </form>

                  {/* Keyboard hint */}
                  <p className="text-white/10 text-[9px] text-center mt-2 tracking-wide">
                    Click any timecode badge to pre-fill the roller
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
