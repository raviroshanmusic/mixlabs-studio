"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, MessageSquare, AtSign, FileVideo, Check } from "lucide-react";

type Item = {
  id: string;
  type: "comment" | "version" | "mention";
  actor: string;
  projectId: string;
  projectName: string;
  body: string;
  timecode: number | null;
  createdAt: string;
  unread: boolean;
};

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const w = Math.floor(days / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtTc(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const ICON = {
  comment: MessageSquare,
  mention: AtSign,
  version: FileVideo,
} as const;

const COLOR = {
  comment: "#34d399",
  mention: "#f59e0b",
  version: "#818cf8",
} as const;

export default function NotificationsBell({ expanded }: { expanded: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      setItems(j.items ?? []);
      setUnread(j.unreadCount ?? 0);
    } catch { /* offline — keep last state */ }
  }, []);

  // Initial + poll every 60s
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function openPanel() {
    setOpen(v => !v);
    if (!open) {
      setLoading(items.length === 0);
      await load();
      setLoading(false);
      // Mark read shortly after opening so the user registers the unread state first.
      if (unread > 0) {
        setTimeout(async () => {
          try {
            await fetch("/api/notifications", { method: "POST" });
            setItems(prev => prev.map(i => ({ ...i, unread: false })));
            setUnread(0);
          } catch { /* ignore */ }
        }, 800);
      }
    }
  }

  function hrefFor(i: Item) {
    return i.type === "version" ? `/project/${i.projectId}` : `/review/${i.projectId}`;
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={openPanel}
        className="relative flex items-center rounded-xl transition-all duration-200 group overflow-hidden w-full"
        style={{ padding: "9px 0", background: open ? "var(--bg-card-hover)" : "transparent" }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        title="Notifications"
      >
        <span className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg
                         text-white/25 group-hover:text-white/60 transition-colors duration-200 relative">
          <Bell size={15} strokeWidth={1.5} />
          {unread > 0 && (
            <span className="absolute top-[6px] right-[6px] min-w-[7px] h-[7px] rounded-full bg-[#f59e0b] ring-[1.5px] ring-[#060606]" />
          )}
        </span>
        <span className="overflow-hidden ml-3 whitespace-nowrap text-[12px] text-white/40 group-hover:text-white/70 transition-colors flex-1 text-left"
          style={{ opacity: expanded ? 1 : 0, transition: "opacity 160ms" }}>
          Notifications
        </span>
        {expanded && unread > 0 && (
          <span className="mr-2 text-[10px] font-semibold text-[#f59e0b] tabular-nums">{unread}</span>
        )}
      </button>

      {/* Popover — fixed so it escapes the sidebar's overflow-hidden */}
      {open && (
        <div
          className="fixed z-[120] w-[340px] max-h-[460px] flex flex-col rounded-2xl border border-white/[0.08]
                     bg-[#0c0c0d] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
          style={{ left: 64, bottom: 60 }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <p className="text-[12px] font-medium text-white/80 tracking-wide">Notifications</p>
            {unread > 0 && (
              <span className="text-[10px] text-[#f59e0b] font-semibold">{unread} new</span>
            )}
          </div>

          {/* list */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="px-4 py-8 text-center text-[11px] text-white/30">Loading…</div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 gap-2 text-center">
                <Check size={20} className="text-white/20" strokeWidth={1.5} />
                <p className="text-[12px] text-white/40">You&apos;re all caught up</p>
                <p className="text-[10px] text-white/20">New comments and versions on your projects show up here.</p>
              </div>
            ) : (
              items.map(i => {
                const Icon = ICON[i.type];
                const color = COLOR[i.type];
                const label = i.type === "version" ? "uploaded a version"
                  : i.type === "mention" ? "mentioned you"
                  : "left a comment";
                return (
                  <a key={i.id} href={hrefFor(i)}
                    className="flex gap-3 px-4 py-3 border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                    style={{ background: i.unread ? "rgba(245,158,11,0.05)" : "transparent" }}>
                    <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center mt-0.5"
                      style={{ background: `${color}1f`, color }}>
                      <Icon size={13} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] text-white/70 leading-snug">
                        <span className="text-white/90 font-medium">{i.actor}</span> {label}
                        {i.timecode != null && <span className="text-white/40"> at {fmtTc(i.timecode)}</span>}
                      </p>
                      {i.body && (
                        <p className="text-[11px] text-white/40 leading-snug mt-0.5 line-clamp-2">{i.body}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-white/30 truncate">{i.projectName}</span>
                        <span className="text-white/15">·</span>
                        <span className="text-[10px] text-white/25 shrink-0">{timeAgo(i.createdAt)}</span>
                      </div>
                    </div>
                    {i.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0 mt-2" />}
                  </a>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
