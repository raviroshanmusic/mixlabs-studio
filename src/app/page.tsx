"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useScroll, useTransform, useSpring, motion, AnimatePresence } from "framer-motion";

// ─── Ease ─────────────────────────────────────────────────────────────────────
const EASE = [0.16, 1, 0.3, 1] as const;

// ─── Live Timecode ─────────────────────────────────────────────────────────────
function LiveTimecode({ dim = false }: { dim?: boolean }) {
  const [tc, setTc] = useState("01:00:00:00");
  useEffect(() => {
    let secs = 3600, frame = 0;
    const id = setInterval(() => {
      secs++; frame = (frame + 1) % 24;
      const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
      setTc(`${p2(h)}:${p2(m)}:${p2(s)}:${p2(frame)}`);
    }, 1000 / 24);
    return () => clearInterval(id);
  }, []);
  const parts = tc.split(":");
  const cls = dim ? "text-white/20" : "text-white/35";
  return (
    <span className={`font-mono text-[11px] tracking-widest tabular-nums select-none ${cls}`}>
      {parts[0]}<span className="tc-colon">:</span>{parts[1]}<span className="tc-colon">:</span>{parts[2]}<span className="tc-colon">:</span>{parts[3]}
    </span>
  );
}
function p2(n: number) { return String(n).padStart(2, "0"); }

// ─── Scroll Progress ──────────────────────────────────────────────────────────
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return <motion.div style={{ scaleX, transformOrigin: "left" }} className="fixed top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-amber-400/60 via-white/40 to-amber-400/60 z-[100]" />;
}

// ─── Marquee ──────────────────────────────────────────────────────────────────
const ITEMS = ["REVIEW ROOM","·","TIMECODED NOTES","·","SCORE","·","SOUND DESIGN","·","COLOR GRADE","·","VFX","·","EDIT SUITE","·","APPROVAL FLOW","·","CLIENT DELIVERY","·","DEPARTMENT PIPELINE","·"];
function Marquee({ reverse }: { reverse?: boolean }) {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden border-y border-white/[0.06] py-3.5">
      <div className="marquee-track" style={{ animationDirection: reverse ? "reverse" : "normal", animationDuration: "42s" }}>
        {doubled.map((item, i) => (
          <span key={i} className={`px-5 text-[10px] tracking-[0.3em] uppercase select-none ${item === "·" ? "text-amber-400/30" : "text-white/30 font-medium"}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Mouse Tilt ───────────────────────────────────────────────────────────────
function useMouseTilt(strength = 10) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTilt({ x: ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -strength, y: ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * strength });
  }, [strength]);
  const onLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.addEventListener("mousemove", onMove as EventListener);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove as EventListener); el.removeEventListener("mouseleave", onLeave); };
  }, [onMove, onLeave]);
  return { ref, tilt };
}

// ─── Parallax Wrapper ─────────────────────────────────────────────────────────
function Parallax({ speed = 0.15, children }: { speed?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const raw = useTransform(scrollYProgress, [0, 1], [`${speed * 120}px`, `-${speed * 120}px`]);
  const y = useSpring(raw, { stiffness: 60, damping: 20 });
  return <motion.div ref={ref} style={{ y }}>{children}</motion.div>;
}

// ─── Counter ──────────────────────────────────────────────────────────────────
function Counter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        let cur = 0;
        const steps = 55, dur = 1800;
        const iv = setInterval(() => {
          cur = Math.min(cur + target / steps, target);
          setCount(Math.floor(cur));
          if (cur >= target) clearInterval(iv);
        }, dur / steps);
      }
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}
      className="flex items-center gap-4 mb-16">
      <span className="text-[10px] font-mono text-amber-400/50">{n}</span>
      <div className="w-10 h-px bg-white/15" />
      <span className="text-[9px] tracking-[0.35em] uppercase text-white/35 font-semibold">{children}</span>
    </motion.div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} transition={{ duration: 1.4, ease: EASE }}
      viewport={{ once: true }} style={{ transformOrigin: "left" }}
      className="h-px bg-gradient-to-r from-white/15 via-white/5 to-transparent mx-8 md:mx-16 my-16" />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED APP MOCKUPS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Live Review Room Demo ─────────────────────────────────────────────────────
const DEMO_COMMENTS = [
  { tc: "01:12:44", text: "The strings feel too bright in this passage — bring them down 2dB", author: "Director", resolved: false },
  { tc: "01:14:08", text: "Perfect. Lock this moment, this is the one.", author: "Composer", resolved: true },
  { tc: "01:16:22", text: "Reduce reverb tail on the dialogue, it's bleeding into the music", author: "Sound", resolved: false },
  { tc: "01:18:55", text: "Can we try a harder cut here instead of the fade?", author: "Editor", resolved: false },
];

const AVATAR_COLORS: Record<string, string> = {
  Director: "bg-violet-500/40 text-violet-200",
  Composer: "bg-amber-500/40 text-amber-200",
  Sound:    "bg-blue-500/40 text-blue-200",
  Editor:   "bg-rose-500/40 text-rose-200",
};

function ReviewRoomMockup({ compact = false }: { compact?: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [resolvedSet, setResolvedSet] = useState<Set<number>>(new Set([1]));
  const [typingText, setTypingText] = useState("");
  const [showTyping, setShowTyping] = useState(false);
  const [progress, setProgress] = useState(28);
  const [tcSec, setTcSec] = useState(4364);

  useEffect(() => {
    // Show comments one by one
    let i = 0;
    const show = () => {
      if (i < DEMO_COMMENTS.length) {
        i++;
        setVisibleCount(i);
        if (i < DEMO_COMMENTS.length) setTimeout(show, 1400);
      }
    };
    const t1 = setTimeout(show, 600);

    // Typing simulation
    const newNote = "The low-end is perfect here, exactly what we needed.";
    const t2 = setTimeout(() => {
      setShowTyping(true);
      let j = 0;
      const type = () => {
        j++;
        setTypingText(newNote.slice(0, j));
        if (j < newNote.length) setTimeout(type, 38);
        else {
          setTimeout(() => {
            setVisibleCount(p => Math.min(p + 1, DEMO_COMMENTS.length));
            setTypingText("");
            setShowTyping(false);
            setProgress(55);
          }, 700);
        }
      };
      setTimeout(type, 300);
    }, 7000);

    // Timecode tick
    const t3 = setInterval(() => setTcSec(p => p + 1), 1000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(t3); };
  }, []);

  const h = Math.floor(tcSec / 3600), m = Math.floor((tcSec % 3600) / 60), s = tcSec % 60;
  const tcStr = `${p2(h)}:${p2(m)}:${p2(s)}`;

  const resolvedCount = [...resolvedSet].length;
  const totalCount    = Math.min(visibleCount, DEMO_COMMENTS.length);

  return (
    <div className={`bg-[#080808] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ${compact ? "w-full" : "w-[520px]"}`}>
      {/* Window chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#0c0c0c]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/25 tracking-wider">Chandralekha — Score v3</span>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
        </div>
        <span className="font-mono text-[10px] text-white/20">{tcStr}</span>
      </div>

      <div className="flex" style={{ height: compact ? 320 : 380 }}>
        {/* Player side */}
        <div className="flex-1 border-r border-white/[0.06] flex flex-col">
          {/* Fake video */}
          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 40% 40%, rgba(30,20,60,0.8) 0%, #000 70%)" }} />
            {/* Film grain on player */}
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "100px" }} />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center backdrop-blur">
                <div className="w-0 h-0 ml-1" style={{ borderStyle: "solid", borderWidth: "6px 0 6px 10px", borderColor: "transparent transparent transparent rgba(255,255,255,0.7)" }} />
              </div>
              <span className="text-white/30 text-[10px] tracking-widest font-mono">{tcStr}</span>
            </div>
            {/* Subtitle */}
            <div className="absolute bottom-8 left-0 right-0 text-center">
              <span className="text-white/70 text-[11px] tracking-wide" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
                — नेपाल को लागि —
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="px-3 py-2.5 border-t border-white/[0.06] bg-[#0a0a0a]">
            <div className="h-0.5 bg-white/8 rounded-full mb-1.5">
              <div className="h-full bg-amber-400/70 rounded-full" style={{ width: "38%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-white/25">{tcStr}</span>
              {/* Comment resolve progress */}
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-0.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((resolvedCount / Math.max(totalCount, 1)) * 100, 100)}%`, background: "linear-gradient(90deg,#f59e0b,#10b981)" }} />
                </div>
                <span className="text-[9px] font-mono text-white/25">{resolvedCount}/{totalCount}</span>
              </div>
              <span className="text-[9px] font-mono text-white/25">01:45:12</span>
            </div>
          </div>
        </div>

        {/* Comments side */}
        <div className={`flex flex-col bg-[#090909] ${compact ? "w-44" : "w-52"}`}>
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] tracking-[0.2em] uppercase text-white/35 font-semibold">Notes</span>
              <div className="flex gap-1">
                <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/20 text-amber-300 text-[9px] font-bold">{totalCount - resolvedCount}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden py-1">
            <AnimatePresence>
              {DEMO_COMMENTS.slice(0, visibleCount).map((c, i) => {
                const av = AVATAR_COLORS[c.author] ?? "bg-white/10 text-white/50";
                const resolved = resolvedSet.has(i);
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className={`px-3 py-2.5 border-b border-white/[0.04] ${resolved ? "opacity-40" : ""}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${av}`}>
                        {c.author[0]}
                      </div>
                      <span className="text-amber-400/70 text-[9px] font-mono">{c.tc}</span>
                      {resolved && <div className="ml-auto w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/40 flex items-center justify-center">
                        <div className="text-emerald-400 text-[7px]">✓</div>
                      </div>}
                    </div>
                    <p className={`text-[9px] leading-relaxed ${resolved ? "line-through text-white/25" : "text-white/60"}`}>
                      {compact ? c.text.slice(0, 48) + (c.text.length > 48 ? "…" : "") : c.text}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Typing indicator */}
          {showTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="px-3 py-2 border-t border-white/[0.06] bg-[#0c0c0c]">
              <div className="flex items-start gap-1.5">
                <div className="w-4 h-4 rounded-full bg-amber-500/30 shrink-0 mt-0.5" />
                <p className="text-[9px] text-white/50 leading-relaxed flex items-end gap-0.5">
                  {typingText.slice(0, 35)}{typingText.length > 0 && <span className="cursor-blink text-white/60">|</span>}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────
function DashboardMockup() {
  const projects = [
    { name: "Chandralekha", client: "Himalayan Films", status: "in review", depts: ["Score", "Sound"], files: 12, members: 4, color: "bg-amber-400" },
    { name: "Midnight Raga", client: "Sundance Lab", status: "active", depts: ["Edit", "Color"], files: 8, members: 3, color: "bg-emerald-400" },
    { name: "The Bridge", client: "Netflix India", status: "delivered", depts: ["Sound", "VFX"], files: 24, members: 7, color: "bg-blue-400" },
  ];

  return (
    <div className="bg-[#080808] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 w-full">
      {/* Chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#0c0c0c]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-[10px] text-white/25 tracking-wider">MixLabs Studio — Dashboard</span>
        <div className="w-14 h-1 bg-white/5 rounded-full" />
      </div>

      <div className="p-5">
        {/* Greeting */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[10px] text-white/30 tracking-widest uppercase mb-1">Good afternoon</p>
            <p className="text-white/80 font-semibold text-sm">Ravi Roshan</p>
          </div>
          {/* Stats */}
          <div className="flex gap-3">
            {[{ v: "3", l: "Active" }, { v: "1", l: "Review" }, { v: "1", l: "Done" }].map(s => (
              <div key={s.l} className="text-center">
                <p className="text-white/70 font-bold text-base">{s.v}</p>
                <p className="text-white/25 text-[9px] tracking-wide">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Attention banner */}
        <div className="flex items-center gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" style={{ animation: "pulse 2s ease-in-out infinite" }} />
          <span className="text-[10px] text-amber-300/80">Chandralekha is awaiting your review</span>
          <span className="ml-auto text-[9px] text-amber-400/50 border border-amber-500/20 px-1.5 py-0.5 rounded-md">Review Room →</span>
        </div>

        {/* Project cards */}
        <div className="space-y-2">
          {projects.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: EASE }}
              className="flex items-center gap-3 bg-white/[0.025] border border-white/[0.07] rounded-xl px-3 py-2.5 group hover:border-white/12">
              <div className={`w-1 h-8 rounded-full ${p.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white/70 text-xs font-semibold truncate">{p.name}</p>
                  <span className="text-[9px] text-white/25 truncate">{p.client}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {p.depts.map(d => (
                    <span key={d} className="text-[8px] border border-white/8 px-1 py-px rounded text-white/30">{d}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/20 text-[9px]">
                <span>{p.files} files</span>
                <span>·</span>
                <span>{p.members} members</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Project Workspace Mockup ─────────────────────────────────────────────────
function WorkspaceMockup() {
  const [activeTab, setActiveTab] = useState(0);
  const [showNewFile, setShowNewFile] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowNewFile(true), 2500);
    const t2 = setTimeout(() => setActiveTab(1), 5000);
    const t3 = setTimeout(() => setActiveTab(0), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const files = [
    { name: "Score_v3_Final.wav", dept: "Score", status: "approved", size: "124 MB" },
    { name: "SoundDesign_v2.aaf", dept: "Sound", status: "in_review", size: "88 MB" },
    { name: "Edit_Cut_v7.xml", dept: "Edit", status: "approved", size: "2.1 MB" },
  ];

  const members = [
    { name: "Ravi Roshan", role: "Owner", dept: "Score", color: "bg-violet-500/30 text-violet-200" },
    { name: "Arjun M.", role: "Editor", dept: "Sound", color: "bg-blue-500/30 text-blue-200" },
    { name: "Director", role: "Viewer", dept: "all", color: "bg-amber-500/30 text-amber-200" },
  ];

  const statusStyle: Record<string, string> = {
    approved: "text-emerald-400 border-emerald-500/30 bg-emerald-500/8",
    in_review: "text-amber-400 border-amber-500/30 bg-amber-500/8",
    draft: "text-white/30 border-white/10 bg-white/5",
  };

  return (
    <div className="bg-[#080808] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 w-full">
      {/* Chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#0c0c0c]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <span className="text-[10px] text-white/25 tracking-wider">Chandralekha — Project Workspace</span>
        <div className="text-[9px] text-emerald-400/60 font-mono">● Live</div>
      </div>

      {/* Project header */}
      <div className="px-5 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-white/80 font-semibold text-sm">Chandralekha</h3>
            <p className="text-white/30 text-[10px]">Himalayan Films · Nepal</p>
          </div>
          <div className="ml-auto flex gap-1.5">
            {["Score", "Sound", "Edit", "Color"].map(d => (
              <span key={d} className="text-[9px] text-white/35 border border-white/8 px-1.5 py-0.5 rounded-md">{d}</span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-3">
          {["Files & Versions", "Team"].map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 text-[10px] transition-all rounded-lg mr-1 ${activeTab === i ? "bg-white/8 text-white/80" : "text-white/30 hover:text-white/55"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4" style={{ height: 220 }}>
        <AnimatePresence mode="wait">
          {activeTab === 0 ? (
            <motion.div key="files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <motion.div key={f.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: EASE }}
                    className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2.5">
                    <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center">
                      <div className="text-[8px] text-white/30 font-mono">{f.dept[0]}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/65 font-medium truncate">{f.name}</p>
                      <p className="text-[9px] text-white/25">{f.dept} · {f.size}</p>
                    </div>
                    <span className={`text-[9px] border px-1.5 py-0.5 rounded-lg font-medium ${statusStyle[f.status]}`}>
                      {f.status === "in_review" ? "In Review" : f.status === "approved" ? "Approved" : "Draft"}
                    </span>
                  </motion.div>
                ))}

                {/* New file appearing */}
                <AnimatePresence>
                  {showNewFile && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: EASE }}
                      className="flex items-center gap-3 bg-amber-500/[0.04] border border-amber-500/20 rounded-xl px-3 py-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                        <div className="text-[8px] text-amber-300 font-mono">V</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-amber-300/80 font-medium">VFX_Composite_v1.mov</p>
                        <p className="text-[9px] text-amber-400/40">VFX · Just uploaded</p>
                      </div>
                      <span className="text-[9px] border border-white/8 px-1.5 py-0.5 rounded-lg text-white/25">Draft</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="space-y-2">
                {members.map((m, i) => (
                  <motion.div key={m.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: EASE }}
                    className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${m.color}`}>{m.name[0]}</div>
                    <div className="flex-1">
                      <p className="text-xs text-white/65 font-medium">{m.name}</p>
                      <p className="text-[9px] text-white/25">{m.dept}</p>
                    </div>
                    <span className="text-[9px] text-white/30 border border-white/8 px-1.5 py-0.5 rounded-lg">{m.role}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── 3D Feature Card ──────────────────────────────────────────────────────────
function FeatureCard({ n, label, title, desc, visual, delay = 0 }: {
  n: string; label: string; title: string; desc: string; visual: React.ReactNode; delay?: number;
}) {
  const { ref, tilt } = useMouseTilt(7);
  return (
    <motion.div initial={{ opacity: 0, y: 56 }} whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay, ease: EASE }} viewport={{ once: true, margin: "-60px" }}>
      <div ref={ref}
        style={{ transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: "transform 0.5s cubic-bezier(0.23,1,0.32,1)", transformStyle: "preserve-3d" }}
        className="rounded-3xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden h-full group">
        <div className="h-56 border-b border-white/[0.06] bg-[#070707] relative overflow-hidden flex items-center justify-center">
          {visual}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        </div>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[10px] font-mono text-amber-400/50">{n}</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[9px] tracking-[0.25em] uppercase text-white/30 font-semibold">{label}</span>
          </div>
          <h3 className="text-xl font-bold text-white/90 mb-3 leading-snug">{title}</h3>
          <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Manifesto ────────────────────────────────────────────────────────────────
const WORDS = "Film is not made by one person. It moves through rooms, across departments, between directors and composers and editors and colorists. MixLabs is built for that journey.".split(" ");

function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });
  return (
    <div ref={ref} className="flex flex-wrap gap-x-3 gap-y-1.5 max-w-4xl">
      {WORDS.map((word, i) => {
        const start = i / WORDS.length;
        const end = Math.min((i + 2) / WORDS.length, 1);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const opacity = useTransform(scrollYProgress, [start, end], [0.1, 1]);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const color = useTransform(scrollYProgress, [start, end], ["rgba(255,255,255,0.1)", "rgba(255,255,255,1)"]);
        return (
          <motion.span key={i} style={{ opacity, color }}
            className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
            {word}
          </motion.span>
        );
      })}
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => scrollY.on("change", v => setScrolled(v > 50)), [scrollY]);
  return (
    <motion.nav initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-500 ${scrolled ? "border-b border-white/[0.06] bg-black/85 backdrop-blur-xl" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-white/12 bg-white/5 flex items-center justify-center">
          <span className="text-[10px] font-black tracking-tight text-white/80">ML</span>
        </div>
        <span className="text-white/55 text-[11px] tracking-[0.3em] uppercase font-semibold">MixLabs</span>
      </div>
      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-8 text-[10px] tracking-[0.22em] uppercase text-white/35 font-medium">
          <a href="#features" className="hover:text-white/70 transition-colors">Features</a>
          <a href="#review" className="hover:text-white/70 transition-colors">Review Room</a>
          <a href="#studio" className="hover:text-white/70 transition-colors">Studio</a>
        </div>
        <a href="/login"
          className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase font-bold text-white border border-white/15 hover:border-white/40 px-5 py-2.5 rounded-xl transition-all bg-white/[0.04] hover:bg-white/[0.08]">
          Enter App →
        </a>
      </div>
    </motion.nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroP, [0, 1], [0, 200]);
  const heroO = useTransform(heroP, [0, 0.75], [1, 0]);

  return (
    <div className="grain bg-black text-white overflow-x-hidden">
      <ScrollProgress />
      <Nav />

      {/* ════════════════════════════════════════ HERO ══════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col overflow-hidden">

        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />

        {/* Center glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,200,50,0.04) 0%, transparent 60%)" }} />

        {/* Film frame numbers */}
        {["left", "right"].map(side => (
          <div key={side} className={`absolute ${side}-6 top-0 bottom-0 flex flex-col justify-around pointer-events-none select-none`} style={{ paddingTop: 100, paddingBottom: 60 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className={`text-[8px] font-mono text-white/8 tracking-widest ${side === "right" ? "text-right" : ""}`}>
                {String((i + 1) * 100).padStart(4, "0")}
              </span>
            ))}
          </div>
        ))}

        <motion.div style={{ y: heroY, opacity: heroO }}
          className="flex-1 flex flex-col lg:flex-row items-center gap-12 px-12 md:px-20 pt-28 pb-16 max-w-[1400px] mx-auto w-full">

          {/* LEFT — Typography */}
          <div className="flex-1 flex flex-col">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}
              className="flex items-center gap-3 mb-10">
              <div className="h-px w-10 bg-amber-400/40" />
              <span className="text-[9px] tracking-[0.5em] uppercase text-amber-400/60 font-semibold">Studio OS · 2025</span>
            </motion.div>

            {["THE", "POST-PRODUCTION", "PLATFORM."].map((line, i) => (
              <div key={line} className="overflow-hidden">
                <motion.h1
                  initial={{ y: 110 }} animate={{ y: 0 }}
                  transition={{ duration: 1.1, delay: 0.4 + i * 0.15, ease: EASE }}
                  className={`leading-[0.87] tracking-[-0.04em] font-black ${
                    i === 1 ? "text-white/30 italic" : "text-white"
                  }`}
                  style={{ fontSize: "clamp(44px, 7vw, 108px)" }}
                >
                  {line}
                </motion.h1>
              </div>
            ))}

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1 }}
              className="mt-10 text-white/45 text-base leading-relaxed max-w-md">
              Where sound, score, edit, color, and VFX teams collaborate on serious films — without the chaos.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 1.2 }}
              className="flex items-center gap-4 mt-10">
              <a href="/login"
                className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl text-sm font-black hover:bg-amber-50 transition-all shadow-2xl shadow-white/10">
                Enter MixLabs
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </a>
              <a href="#features"
                className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors border border-white/10 hover:border-white/20 px-8 py-4 rounded-2xl hover:bg-white/[0.03]">
                See how it works
              </a>
            </motion.div>

            {/* Social proof */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 0.8 }}
              className="flex items-center gap-4 mt-12">
              <div className="flex -space-x-2">
                {["V","A","S","R"].map((l, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold ${["bg-violet-500/60","bg-blue-500/60","bg-amber-500/60","bg-emerald-500/60"][i]}`}>{l}</div>
                ))}
              </div>
              <div className="text-white/30 text-xs">
                Built for <span className="text-white/60 font-semibold">post-production studios</span> that ship serious work
              </div>
            </motion.div>
          </div>

          {/* RIGHT — Live App Preview */}
          <motion.div initial={{ opacity: 0, x: 60, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.8, ease: EASE }}
            className="w-full lg:w-auto lg:flex-shrink-0 float">
            <div className="relative">
              {/* Glow behind mockup */}
              <div className="absolute -inset-8 rounded-3xl pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(251,191,36,0.06) 0%, transparent 70%)" }} />
              <ReviewRoomMockup />
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom timecode bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 1 }}
          className="absolute bottom-8 inset-x-12 flex items-center gap-4">
          <LiveTimecode dim />
          <div className="flex-1 h-px bg-gradient-to-r from-amber-400/10 via-white/5 to-transparent" />
          <span className="font-mono text-[9px] text-white/15 tracking-widest">IN: 01:00:00:00</span>
        </motion.div>
      </section>

      {/* Marquee strip */}
      <Marquee />

      {/* ════════════════════════════════════════ APP SHOWCASE ══════════════════ */}
      <section className="px-8 md:px-20 py-32 max-w-[1400px] mx-auto">
        <SectionLabel n="01" >The App, In Motion</SectionLabel>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <Parallax speed={0.06}>
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE }} viewport={{ once: true }}>
              <h2 className="text-[clamp(36px,4.5vw,64px)] font-black leading-[0.88] tracking-[-0.04em] mb-6">
                See it working.<br />
                <span className="text-white/25 font-light italic">Live.</span>
              </h2>
              <p className="text-white/40 text-sm leading-relaxed max-w-sm">
                Not a prototype. Not a mock. This is MixLabs — the actual interface, the actual workflow. Comments appearing. Files versioned. Teams aligned.
              </p>
            </motion.div>
          </Parallax>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: EASE }} viewport={{ once: true }}>
            <DashboardMockup />
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start mt-16">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE }} viewport={{ once: true }}>
            <WorkspaceMockup />
          </motion.div>
          <Parallax speed={0.06}>
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: EASE }} viewport={{ once: true }}
              className="md:pt-16">
              <h2 className="text-[clamp(36px,4.5vw,64px)] font-black leading-[0.88] tracking-[-0.04em] mb-6">
                One workspace.<br />
                <span className="text-white/25 font-light italic">Every department.</span>
              </h2>
              <p className="text-white/40 text-sm leading-relaxed max-w-sm">
                Score. Sound. Edit. Color. VFX. Each team has their own space but the project stays whole. Files versioned, approvals tracked, clients always in the loop.
              </p>
              <a href="/login" className="inline-flex items-center gap-2 mt-8 text-sm font-bold text-white border border-white/15 px-6 py-3 rounded-xl hover:border-white/30 hover:bg-white/5 transition-all">
                Open a project →
              </a>
            </motion.div>
          </Parallax>
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ FEATURES ══════════════════════ */}
      <section id="features" className="px-8 md:px-20 py-24 max-w-[1400px] mx-auto">
        <SectionLabel n="02">What We Built</SectionLabel>
        <Parallax speed={0.08}>
          <motion.h2 initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: EASE }} viewport={{ once: true }}
            className="text-[clamp(36px,5vw,72px)] font-black leading-[0.88] tracking-[-0.04em] mb-16">
            Every tool your<br /><span className="text-white/25 font-light italic">team actually needs.</span>
          </motion.h2>
        </Parallax>

        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard n="01" label="Review Room" delay={0}
            title="Frame-accurate feedback."
            desc="Drop timecoded notes at the exact frame. Comments sorted by timecode, filterable, resolvable. Progress tracked with a live bar."
            visual={<ReviewRoomMockup compact />}
          />
          <FeatureCard n="02" label="Project Workspace" delay={0.1}
            title="Departments. Files. Versions."
            desc="Each department gets its own section. Files are versioned, linked, and reviewable. The whole project stays coherent."
            visual={
              <div className="w-full h-full flex flex-col justify-center px-6 gap-2">
                {["Edit","Score","Sound","Color","VFX"].map((d, i) => (
                  <div key={d} className="flex items-center gap-3">
                    <span className="text-[9px] text-white/30 w-10 text-right">{d}</span>
                    <div className="flex-1 h-4 bg-white/[0.04] rounded-md overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: "auto" }}
                        transition={{ duration: 1.2, delay: i * 0.1, ease: EASE }} viewport={{ once: true }}
                        className={`h-full rounded-md ${["bg-blue-500/30","bg-violet-500/30","bg-amber-500/30","bg-rose-500/30","bg-cyan-500/30"][i]}`}
                        style={{ width: `${[70,55,80,45,60][i]}%`, marginLeft: `${i * 6}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            }
          />
          <FeatureCard n="03" label="Member Portal" delay={0.2}
            title="Roles, access, and clarity."
            desc="Invite clients as viewers, collaborators as editors. Everyone sees their world without stepping into someone else's."
            visual={
              <div className="w-full h-full flex flex-col justify-center px-6 gap-2.5">
                {[{ n:"Director", r:"Viewer", c:"bg-amber-500/30 text-amber-200" },{ n:"Ravi R.", r:"Owner", c:"bg-violet-500/30 text-violet-200" },{ n:"Arjun M.", r:"Editor", c:"bg-blue-500/30 text-blue-200" },{ n:"Sara L.", r:"Viewer", c:"bg-rose-500/30 text-rose-200" }].map((m, i) => (
                  <motion.div key={m.n} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.6, ease: EASE }} viewport={{ once: true }}
                    className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${m.c}`}>{m.n[0]}</div>
                    <div className="flex-1"><p className="text-xs text-white/65 font-medium">{m.n}</p><p className="text-[9px] text-white/30">{m.r}</p></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                  </motion.div>
                ))}
              </div>
            }
          />
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ REVIEW DEEP DIVE ══════════════ */}
      <section id="review" className="px-8 md:px-20 py-24 max-w-[1400px] mx-auto">
        <SectionLabel n="03">Review Room</SectionLabel>

        <div className="grid md:grid-cols-2 gap-20 items-center">
          <Parallax speed={0.1}>
            <motion.h2 initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE }} viewport={{ once: true }}
              className="text-[clamp(40px,4.5vw,70px)] font-black leading-[0.88] tracking-[-0.04em]">
              Feedback at<br /><span className="text-amber-400/70 italic font-light">the exact frame.</span>
            </motion.h2>
          </Parallax>

          <div className="space-y-10">
            {[
              { n:"01", title:"Drop a timecoded note", body:"A film-format HH:MM:SS drum roller appears. Your note is anchored to the exact frame — not a rough approximation." },
              { n:"02", title:"Resolve, track, ship", body:"Every comment is either open or resolved. A progress bar shows the team exactly how close to locked you are." },
              { n:"03", title:"Cinema Mode", body:"One button. Everything hides. Full black. Just the film. For the moments that need full attention." },
              { n:"04", title:"Auto-refresh & live status", body:"Comments update every 45 seconds. File status flows from Draft → In Review → Approved. Everyone stays current." },
            ].map((item, i) => (
              <motion.div key={item.n} initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: EASE }} viewport={{ once: true }}
                className="flex gap-5 group">
                <span className="text-[10px] font-mono text-amber-400/40 mt-1 shrink-0 w-5">{item.n}</span>
                <div className="border-t border-white/[0.06] pt-4 flex-1">
                  <h4 className="text-white/85 font-bold mb-2 text-sm">{item.title}</h4>
                  <p className="text-white/35 text-sm leading-relaxed">{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ STATS ═════════════════════════ */}
      <section className="px-8 md:px-20 py-24 max-w-[1400px] mx-auto">
        <SectionLabel n="04">By The Numbers</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { t: 7, suf: "", pre: "", l: "Departments tracked" },
            { t: 0, suf: "", pre: "", l: "WhatsApp threads required" },
            { t: 100, suf: "%", pre: "", l: "Feedback resolved in-app" },
            { t: 24, suf: "/7", pre: "", l: "Project visibility" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: i * 0.1 }} viewport={{ once: true }}
              className="border-t border-white/[0.08] pt-8">
              <div className="text-[clamp(48px,5vw,80px)] font-black leading-none tracking-[-0.04em] text-white/90 mb-3">
                <Counter target={s.t} suffix={s.suf} prefix={s.pre} />
              </div>
              <p className="text-white/35 text-sm font-medium">{s.l}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ MANIFESTO ═════════════════════ */}
      <section id="studio" className="px-8 md:px-20 py-32 max-w-[1400px] mx-auto">
        <SectionLabel n="05">Our Belief</SectionLabel>
        <Manifesto />
      </section>

      <Divider />

      {/* ════════════════════════════════════════ PIPELINE ══════════════════════ */}
      <section className="px-8 md:px-20 py-24 max-w-[1400px] mx-auto">
        <SectionLabel n="06">The Pipeline</SectionLabel>
        <div className="flex items-stretch gap-0 overflow-x-auto scrollbar-hide pb-2">
          {["Ingest","Edit","Score","Sound","Color","VFX","Mix","Review","Delivery"].map((step, i, arr) => (
            <motion.div key={step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: EASE }} viewport={{ once: true }}
              className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-2.5 px-4">
                <span className={`text-[10px] font-mono ${i === arr.length - 1 ? "text-emerald-400/80" : "text-white/20"}`}>{p2(i + 1)}</span>
                <div className={`px-5 py-3 rounded-2xl border text-xs font-bold whitespace-nowrap transition-all ${
                  i === arr.length - 1
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/8 bg-white/[0.025] text-white/50"
                }`}>{step}</div>
              </div>
              {i < arr.length - 1 && <div className="w-8 h-px bg-gradient-to-r from-white/15 to-white/5 shrink-0" />}
            </motion.div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ CTA ═══════════════════════════ */}
      <section className="px-8 md:px-20 py-40 text-center relative max-w-[1400px] mx-auto">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[600px] h-[400px] rounded-full" style={{ background: "radial-gradient(ellipse, rgba(251,191,36,0.04) 0%, transparent 70%)" }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE }} viewport={{ once: true }}>
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="h-px w-16 bg-amber-400/20" />
            <span className="text-[9px] tracking-[0.5em] uppercase text-amber-400/40 font-semibold">Ready to begin</span>
            <div className="h-px w-16 bg-amber-400/20" />
          </div>

          <h2 className="text-[clamp(56px,9vw,130px)] font-black leading-[0.85] tracking-[-0.05em] mb-10">
            ENTER<br /><span className="text-white/20 font-light italic">THE ROOM.</span>
          </h2>

          <p className="text-white/35 text-base max-w-md mx-auto mb-14 leading-relaxed">
            Built for post-production studios that take their craft seriously. No templates. No shortcuts.
          </p>

          <a href="/login"
            className="group inline-flex items-center gap-3 bg-white text-black px-14 py-5 rounded-2xl text-sm font-black hover:bg-amber-50 transition-all shadow-2xl shadow-white/10">
            Enter MixLabs
            <span className="group-hover:translate-x-1.5 transition-transform text-base">→</span>
          </a>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════ FOOTER ════════════════════════ */}
      <footer className="px-8 md:px-20 py-10 border-t border-white/[0.05] max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black text-white/50">ML</div>
            <span className="text-white/20 text-[10px] tracking-[0.3em] uppercase font-semibold">MixLabs Studio</span>
          </div>
          <LiveTimecode dim />
          <p className="text-white/12 text-[10px] tracking-widest uppercase">Built for film. Made with care.</p>
        </div>
      </footer>
    </div>
  );
}
