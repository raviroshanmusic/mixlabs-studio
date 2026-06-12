"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, ChevronDown, Send, Play, ExternalLink,
  MessageSquare, Clock, Plus, Volume2, Music, Palette,
  Scissors, Wand2, Zap, FileText, ChevronUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Project = { id: string; name: string; client: string | null; status: string; departments: string[] };
type Version = { id: string; version_name: string; department: string | null; drive_url: string | null; status: string; created_at: string };
type Comment = {
  id: string; body: string; timecode: number | null; version_id: string | null;
  created_at: string; author_id: string; author_name: string | null;
  profiles: { id: string; full_name: string | null; email: string | null } | null;
};
type CurrentUser = { id: string; full_name: string | null; email: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEPT_ICON: Record<string, React.ReactNode> = {
  Sound: <Volume2 size={12} />, Score: <Music size={12} />, Color: <Palette size={12} />,
  Edit: <Scissors size={12} />, Animation: <Wand2 size={12} />, VFX: <Zap size={12} />,
};

function fmtTimecode(sec: number | null | undefined): string {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Timecode Roller ──────────────────────────────────────────────────────────
// Film format: HH:MM:SS

function parseFilmTimecode(str: string): { h: number; m: number; s: number } {
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return { h: parts[0] ?? 0, m: parts[1] ?? 0, s: parts[2] ?? 0 };
  if (parts.length === 2) return { h: 0, m: parts[0] ?? 0, s: parts[1] ?? 0 };
  return { h: 0, m: 0, s: 0 };
}

function fmtFilm(h: number, m: number, s: number): string {
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function Drum({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  const wrap = (v: number) => ((v % (max + 1)) + (max + 1)) % (max + 1);

  return (
    <div
      className="flex flex-col items-center cursor-ns-resize select-none"
      onWheel={e => { e.preventDefault(); onChange(wrap(value + (e.deltaY > 0 ? 1 : -1))); }}
    >
      <button type="button" onClick={() => onChange(wrap(value - 1))}
        className="text-white/15 hover:text-white/40 transition-colors px-2 py-0.5">
        <ChevronUp size={11} />
      </button>
      <div className="text-white/20 text-xs font-mono tabular-nums leading-none py-0.5">
        {String(wrap(value - 1)).padStart(2, "0")}
      </div>
      <div className="text-white text-sm font-mono tabular-nums leading-none py-1 px-2 bg-white/8 rounded-md my-0.5">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-white/20 text-xs font-mono tabular-nums leading-none py-0.5">
        {String(wrap(value + 1)).padStart(2, "0")}
      </div>
      <button type="button" onClick={() => onChange(wrap(value + 1))}
        className="text-white/15 hover:text-white/40 transition-colors px-2 py-0.5">
        <ChevronDown size={11} />
      </button>
    </div>
  );
}

function TimecodeRoller({ value, onChange }: { value: string; onChange: (val: string) => void }) {
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

  function setH(v: number) { onChange(fmtFilm(v, m, s)); }
  function setM(v: number) { onChange(fmtFilm(h, v, s)); }
  function setS(v: number) { onChange(fmtFilm(h, m, v)); }

  // Init to 00:00:00 when opening if empty
  function handleOpen() {
    if (!value) onChange("00:00:00");
    setOpen(p => !p);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={handleOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
          hasValue
            ? "bg-white/8 border-white/15 text-white"
            : "bg-white/[0.03] border-white/8 text-white/30 hover:border-white/15"
        }`}>
        <Clock size={10} className="text-white/30" />
        <span>{hasValue ? value : "timecode"}</span>
        {hasValue && (
          <span onClick={e => { e.stopPropagation(); onChange(""); }}
            className="text-white/25 hover:text-white/60 ml-0.5 cursor-pointer leading-none">×</span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 bg-[#161616] border border-white/10 rounded-xl shadow-2xl p-3">
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/20 text-center mb-2">HH : MM : SS</p>
          <div className="flex items-center gap-1">
            <Drum value={h} max={23} onChange={setH} />
            <span className="text-white/25 text-sm font-mono mb-0.5">:</span>
            <Drum value={m} max={59} onChange={setM} />
            <span className="text-white/25 text-sm font-mono mb-0.5">:</span>
            <Drum value={s} max={59} onChange={setS} />
          </div>
        </div>
      )}
    </div>
  );
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;

  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1`;

  // Google Drive
  const gd = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;

  // Dropbox — swap ?dl=0 for raw embed param
  if (url.includes("dropbox.com")) {
    return url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
  }

  // Fallback — try direct iframe
  return url;
}

function initials(user: { full_name: string | null; email: string | null }): string {
  if (user.full_name) return user.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (user.email?.[0] ?? "?").toUpperCase();
}

// ─── File Picker ──────────────────────────────────────────────────────────────

function FilePicker({ versions, selected, onSelect }: {
  versions: Version[]; selected: Version | null; onSelect: (v: Version) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2.5 bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 hover:border-white/20 transition-all min-w-0 max-w-xs">
        <FileText size={13} className="text-white/30 shrink-0" />
        <span className="truncate">{selected?.version_name ?? "Select a file to review"}</span>
        {selected?.department && (
          <span className="shrink-0 text-[10px] text-white/25 border border-white/10 px-1.5 py-0.5 rounded-md ml-1">
            {selected.department}
          </span>
        )}
        <ChevronDown size={12} className="text-white/30 shrink-0 ml-auto" />
      </button>

      {open && (
        <div className="absolute top-12 left-0 z-30 w-80 rounded-xl border border-white/10 bg-[#141414] shadow-2xl py-1.5 overflow-hidden">
          {versions.length === 0 ? (
            <p className="text-white/25 text-xs px-4 py-3">No files with links added yet.</p>
          ) : (
            versions.map(v => (
              <button key={v.id} onClick={() => { onSelect(v); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${selected?.id === v.id ? "bg-white/5" : ""}`}>
                <span className="text-white/25">{DEPT_ICON[v.department ?? ""] ?? <FileText size={12} />}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-white/80 text-sm truncate">{v.version_name}</p>
                  {v.department && <p className="text-white/30 text-xs">{v.department}</p>}
                </div>
                {selected?.id === v.id && <div className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Player ──────────────────────────────────────────────────────────────────

function Player({ version }: { version: Version | null }) {
  if (!version) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center">
          <Play size={22} className="text-white/15 ml-1" />
        </div>
        <p className="text-white/20 text-sm">Select a file above to start reviewing</p>
      </div>
    );
  }

  const embedUrl = version.drive_url ? getEmbedUrl(version.drive_url) : null;

  if (!embedUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
        <p className="text-white/25 text-sm">No previewable link for this file.</p>
        {version.drive_url && (
          <a href={version.drive_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 border border-white/10 px-3 py-2 rounded-lg transition-colors">
            <ExternalLink size={12} /> Open in new tab
          </a>
        )}
      </div>
    );
  }

  return (
    <iframe
      key={embedUrl}
      src={embedUrl}
      className="w-full h-full rounded-xl"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}

// ─── Comment Card ─────────────────────────────────────────────────────────────

function CommentCard({ comment, onTimecodeClick }: { comment: Comment; onTimecodeClick: (sec: number) => void }) {
  const profile = comment.profiles;
  const name = comment.author_name || profile?.full_name || profile?.email || "Unknown";
  const initStr = initials(profile ?? { full_name: comment.author_name, email: null });

  return (
    <div className="flex gap-3 px-4 py-3.5 hover:bg-white/[0.025] transition-colors group">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-[10px] text-white/50 font-medium shrink-0 mt-0.5">
        {initStr}
      </div>

      <div className="flex-1 min-w-0">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white/60 text-xs font-medium">{name}</span>
          <span className="text-white/20 text-[10px]">{timeAgo(comment.created_at)}</span>
          {comment.timecode != null && (
            <button
              onClick={() => onTimecodeClick(comment.timecode!)}
              className="ml-auto flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 bg-white/5 hover:bg-white/8 border border-white/8 px-2 py-0.5 rounded-md transition-all font-mono"
            >
              <Clock size={9} />
              {fmtTimecode(comment.timecode)}
            </button>
          )}
        </div>
        <p className="text-white/70 text-sm leading-relaxed">{comment.body}</p>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ReviewClient({ project, versions, comments: initialComments, currentUser, initialDept }: {
  project: Project; versions: Version[]; comments: Comment[]; currentUser: CurrentUser; initialDept?: string | null;
}) {
  const firstVersion = initialDept
    ? (versions.find(v => v.department === initialDept) ?? versions[0] ?? null)
    : (versions[0] ?? null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(firstVersion);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [timecodeInput, setTimecodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter comments to selected version (or show all if none selected)
  const visibleComments = selectedVersion
    ? comments.filter(c => !c.version_id || c.version_id === selectedVersion.id)
    : comments;

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);

    const timecode = parseTimecode(timecodeInput);
    const res = await fetch(`/api/projects/${project.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: body.trim(),
        timecode_sec: timecode,
        version_id: selectedVersion?.id ?? null,
      }),
    });

    if (res.ok) {
      const newComment = await res.json();
      // Attach current user profile data optimistically
      setComments(prev => [...prev, {
        ...newComment,
        profiles: { id: currentUser.id, full_name: currentUser.full_name, email: currentUser.email },
      }].sort((a, b) => (a.timecode ?? Infinity) - (b.timecode ?? Infinity)));
      setBody("");
      setTimecodeInput("");
    }
    setSubmitting(false);
  }

  function handleTimecodeClick(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    setTimecodeInput(fmtFilm(h, m, s));
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] overflow-hidden">

      {/* ── Top Bar ── */}
      <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
        <div className="flex items-center gap-4">
          <a href={`/project/${project.id}`}
            className="flex items-center gap-1.5 text-white/20 hover:text-white/50 text-[10px] tracking-[0.2em] uppercase transition-colors">
            <ArrowLeft size={11} />
            Project
          </a>
          <div className="w-px h-4 bg-white/10" />
          <div>
            <span className="text-white/20 text-[10px] tracking-widest uppercase">Review</span>
            <span className="text-white/60 text-sm ml-2">{project.name}</span>
          </div>
        </div>

        {/* File picker — center */}
        <FilePicker
          versions={versions}
          selected={selectedVersion}
          onSelect={setSelectedVersion}
        />

        {/* Right: comment count */}
        <div className="flex items-center gap-2 text-white/25 text-xs">
          <MessageSquare size={12} />
          <span>{visibleComments.length} {visibleComments.length === 1 ? "note" : "notes"}</span>
        </div>
      </header>

      {/* ── Main split: Player | Comments ── */}
      <div className="flex flex-1 min-h-0">

        {/* Player area */}
        <div className="flex-1 min-w-0 p-5 flex flex-col">
          <div className="flex-1 rounded-2xl overflow-hidden bg-black border border-white/[0.06] min-h-0">
            <Player version={selectedVersion} />
          </div>

          {/* File meta below player */}
          {selectedVersion && (
            <div className="mt-3 flex items-center gap-3 px-1">
              <span className="text-white/40 text-xs">{selectedVersion.version_name}</span>
              {selectedVersion.department && (
                <span className="text-[10px] text-white/20 border border-white/8 px-2 py-0.5 rounded-full">
                  {selectedVersion.department}
                </span>
              )}
              {selectedVersion.status && selectedVersion.status !== "draft" && (
                <span className="text-white/20 text-xs capitalize">— {selectedVersion.status}</span>
              )}
              {selectedVersion.drive_url && (
                <a href={selectedVersion.drive_url} target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-white/20 hover:text-white/50 transition-colors">
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Comments panel */}
        <div className="w-80 shrink-0 border-l border-white/[0.07] flex flex-col">

          {/* Comments header */}
          <div className="px-4 py-3.5 border-b border-white/[0.06] shrink-0">
            <p className="text-white/30 text-[10px] tracking-[0.2em] uppercase">
              Notes & Feedback
              {visibleComments.length > 0 && (
                <span className="ml-2 text-white/20">{visibleComments.length}</span>
              )}
            </p>
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto">
            {visibleComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
                <MessageSquare size={24} className="text-white/10" />
                <p className="text-white/20 text-sm text-center leading-relaxed">
                  No notes yet.<br />
                  <span className="text-white/12 text-xs">Add a timecoded note below.</span>
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {visibleComments.map(c => (
                  <CommentCard key={c.id} comment={c} onTimecodeClick={handleTimecodeClick} />
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}
          </div>

          {/* Add comment form */}
          <div className="shrink-0 border-t border-white/[0.07] p-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">

              {/* Timecode roller */}
              <TimecodeRoller value={timecodeInput} onChange={setTimecodeInput} />

              {/* Comment textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  placeholder="Add a note… (⌘↵ to send)"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white/70 placeholder-white/20 outline-none focus:border-white/15 transition-colors resize-none"
                />
              </div>

              <button type="submit" disabled={submitting || !body.trim()}
                className="flex items-center justify-center gap-2 w-full bg-white text-black text-xs font-medium py-2.5 rounded-lg hover:bg-white/90 disabled:opacity-30 transition-all">
                <Send size={12} />
                {submitting ? "Sending…" : "Send note"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
