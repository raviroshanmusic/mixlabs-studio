"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  useScroll, useTransform, useSpring,
  motion, AnimatePresence,
} from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────
const EASE = [0.25, 0.46, 0.45, 0.94] as const;
const EASE_OUT = [0.0, 0.0, 0.2, 1.0] as const;

function p2(n: number) { return String(n).padStart(2, "0"); }

// ─── Cursor Glow ──────────────────────────────────────────────────────────────
function CursorGlow() {
  const [pos, setPos] = useState({ x: -400, y: -400 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); setVisible(true); };
    const leave = () => setVisible(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", leave);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseleave", leave); };
  }, []);

  return (
    <div
      className="fixed pointer-events-none z-[9998] transition-opacity duration-500"
      style={{
        opacity: visible ? 1 : 0,
        left: pos.x - 200,
        top: pos.y - 200,
        width: 400,
        height: 400,
        background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
        borderRadius: "50%",
      }}
    />
  );
}

// ─── Scroll Progress ──────────────────────────────────────────────────────────
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 80, damping: 28 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: "left" }}
      className="fixed top-0 left-0 right-0 h-[1px] bg-white/30 z-[100]"
    />
  );
}

// ─── Live Timecode ─────────────────────────────────────────────────────────────
function LiveTimecode() {
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
  return (
    <span className="font-mono text-[11px] tracking-widest tabular-nums text-white/20 select-none">
      {parts[0]}<span className="tc-colon">:</span>
      {parts[1]}<span className="tc-colon">:</span>
      {parts[2]}<span className="tc-colon">:</span>
      {parts[3]}
    </span>
  );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = ["REVIEW ROOM","·","TIMECODED NOTES","·","SCORE","·","SOUND DESIGN","·","COLOR GRADE","·","VFX","·","EDIT SUITE","·","APPROVAL WORKFLOW","·","CLIENT DELIVERY","·","DEPARTMENT PIPELINE","·"];

function Marquee({ reverse }: { reverse?: boolean }) {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden border-y border-white/[0.05] py-3">
      <div className="marquee-track" style={{ animationDirection: reverse ? "reverse" : "normal" }}>
        {items.map((item, i) => (
          <span key={i} className={`px-5 text-[10px] tracking-[0.28em] uppercase select-none ${item === "·" ? "text-white/12" : "text-white/22 font-light"}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Fade In on Scroll ────────────────────────────────────────────────────────
function FadeIn({
  children, delay = 0, y = 24, blur = true, className = "",
}: {
  children: React.ReactNode; delay?: number; y?: number; blur?: boolean; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: blur ? "blur(6px)" : "none" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay, ease: EASE_OUT }}
      viewport={{ once: true, margin: "-60px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <FadeIn className="flex items-center gap-4 mb-16">
      <span className="text-[10px] font-mono text-white/20">{n}</span>
      <motion.div
        initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.1, ease: EASE_OUT }}
        viewport={{ once: true }}
        style={{ transformOrigin: "left" }}
        className="w-10 h-px bg-white/15"
      />
      <span className="text-[9px] tracking-[0.35em] uppercase text-white/25 font-light">{children}</span>
    </FadeIn>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: 1.6, ease: EASE_OUT }}
      viewport={{ once: true }}
      style={{ transformOrigin: "left" }}
      className="h-px bg-gradient-to-r from-white/10 via-white/[0.04] to-transparent mx-8 md:mx-20 my-20"
    />
  );
}

// ─── Parallax ─────────────────────────────────────────────────────────────────
function Parallax({ children, speed = 0.12 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const raw = useTransform(scrollYProgress, [0, 1], [`${speed * 100}px`, `-${speed * 100}px`]);
  const y = useSpring(raw, { stiffness: 50, damping: 18 });
  return <motion.div ref={ref} style={{ y }}>{children}</motion.div>;
}

// ─── Counter ──────────────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        let cur = 0;
        const iv = setInterval(() => {
          cur = Math.min(cur + target / 55, target);
          setN(Math.floor(cur));
          if (cur >= target) clearInterval(iv);
        }, 1800 / 55);
      }
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>;
}

// ─── Manifesto ────────────────────────────────────────────────────────────────
const MANIFESTO_WORDS = "Film is not made by one person. It moves through rooms, across departments, between directors and composers and editors and colorists. MixLabs is built for that journey.".split(" ");

function Manifesto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  return (
    <div ref={ref} className="flex flex-wrap gap-x-3 gap-y-1 max-w-3xl">
      {MANIFESTO_WORDS.map((word, i) => {
        const start = i / MANIFESTO_WORDS.length;
        const end = Math.min((i + 2) / MANIFESTO_WORDS.length, 1);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const opacity = useTransform(scrollYProgress, [start, end], [0.08, 0.85]);
        return (
          <motion.span key={i} style={{ opacity }}
            className="text-3xl md:text-[2.6rem] font-light leading-tight tracking-tight text-white">
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
  useEffect(() => scrollY.on("change", v => setScrolled(v > 60)), [scrollY]);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.2, ease: EASE }}
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5 transition-all duration-700 ${
        scrolled ? "border-b border-white/[0.05] bg-black/90 backdrop-blur-2xl" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.09] flex items-center justify-center">
          <span className="text-[9px] font-semibold tracking-tight text-white/60">ML</span>
        </div>
        <span className="text-white/40 text-[11px] tracking-[0.32em] uppercase font-light">MixLabs</span>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-8 text-[10px] tracking-[0.22em] uppercase text-white/28 font-light">
          {["Features", "Review", "Studio"].map(label => (
            <motion.a key={label} href={`#${label.toLowerCase()}`}
              className="hover:text-white/60 transition-colors duration-300 cursor-pointer">
              {label}
            </motion.a>
          ))}
        </div>
        <a href="/login"
          className="group relative text-[10px] tracking-[0.2em] uppercase font-light text-white/50 hover:text-white/90 transition-colors duration-300">
          Enter App
          <span className="ml-1.5 opacity-40 group-hover:opacity-80 transition-opacity">→</span>
          <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </a>
      </div>
    </motion.nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP MOCKUPS
// ═══════════════════════════════════════════════════════════════════════════════

const DEMO_COMMENTS = [
  { tc: "01:12:44", text: "The strings feel too bright — bring them down 2dB", author: "Director", color: "bg-violet-500/30 text-violet-300" },
  { tc: "01:14:08", text: "Perfect. Lock this moment.", author: "Composer", color: "bg-amber-500/30 text-amber-300" },
  { tc: "01:16:22", text: "Reduce reverb tail on the dialogue", author: "Sound", color: "bg-blue-500/30 text-blue-300" },
  { tc: "01:18:55", text: "Try a harder cut here instead of the fade", author: "Editor", color: "bg-rose-500/30 text-rose-300" },
];

function ReviewMockup() {
  const [shown, setShown] = useState(0);
  const [resolved, setResolved] = useState<Set<number>>(new Set([1]));
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [tcSec, setTcSec] = useState(4364);

  useEffect(() => {
    // Reveal comments
    let i = 0;
    const show = () => { i++; setShown(i); if (i < DEMO_COMMENTS.length) setTimeout(show, 1500); };
    const t1 = setTimeout(show, 800);

    // Typing new comment
    const newNote = "The low-end is exactly right here.";
    const t2 = setTimeout(() => {
      setIsTyping(true);
      let j = 0;
      const type = () => {
        j++;
        setTypingText(newNote.slice(0, j));
        if (j < newNote.length) setTimeout(type, 40);
        else setTimeout(() => { setIsTyping(false); setTypingText(""); setShown(p => Math.min(p + 1, DEMO_COMMENTS.length)); }, 600);
      };
      setTimeout(type, 400);
    }, 8000);

    // Resolve comment 0 after delay
    const t3 = setTimeout(() => setResolved(new Set([0, 1])), 12000);

    // Timecode tick
    const t4 = setInterval(() => setTcSec(p => p + 1), 1000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearInterval(t4); };
  }, []);

  const h = Math.floor(tcSec / 3600), m = Math.floor((tcSec % 3600) / 60), s = tcSec % 60;
  const tcStr = `${p2(h)}:${p2(m)}:${p2(s)}`;
  const resolvedCount = resolved.size;
  const total = Math.min(shown, DEMO_COMMENTS.length);

  return (
    <div className="w-full bg-[#080808] border border-white/[0.09] rounded-2xl overflow-hidden shadow-2xl shadow-black/80">
      {/* Chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0b0b0b]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
        </div>
        <span className="text-[10px] text-white/22 tracking-wider font-light">Chandralekha — Score v3</span>
        <span className="font-mono text-[10px] text-white/18">{tcStr}</span>
      </div>

      <div className="flex" style={{ height: 360 }}>
        {/* Player */}
        <div className="flex-1 border-r border-white/[0.05] flex flex-col">
          <div className="flex-1 bg-black relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 40% 35%, rgba(25,15,50,0.9) 0%, #000 65%)" }} />
            <div className="absolute inset-0 opacity-[0.15]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "100px" }} />
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-white/18 flex items-center justify-center">
                <div className="w-0 h-0 ml-0.5" style={{ borderStyle: "solid", borderWidth: "5px 0 5px 8px", borderColor: "transparent transparent transparent rgba(255,255,255,0.55)" }} />
              </div>
              <span className="text-white/22 text-[10px] font-mono tracking-widest">{tcStr}</span>
            </div>
            <div className="absolute bottom-6 inset-x-0 text-center">
              <span className="text-white/55 text-[10px] tracking-wide" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>— नेपाल को लागि —</span>
            </div>
          </div>
          {/* Playbar */}
          <div className="px-4 py-3 border-t border-white/[0.05] bg-[#0a0a0a]">
            <div className="h-px bg-white/8 rounded-full mb-2">
              <div className="h-full w-2/5 bg-white/30 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-white/22">{tcStr}</span>
              <div className="flex items-center gap-2">
                <div className="w-14 h-px bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700 bg-white/30" style={{ width: `${Math.round((resolvedCount / Math.max(total, 1)) * 100)}%` }} />
                </div>
                <span className="font-mono text-[9px] text-white/22">{resolvedCount}/{total}</span>
              </div>
              <span className="font-mono text-[9px] text-white/22">01:45:12</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="w-48 flex flex-col bg-[#090909]">
          <div className="px-3 py-2.5 border-b border-white/[0.05] flex items-center justify-between">
            <span className="text-[9px] tracking-[0.22em] uppercase text-white/28 font-light">Notes</span>
            <span className="text-[9px] font-mono text-amber-400/50">{total - resolvedCount} open</span>
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence>
              {DEMO_COMMENTS.slice(0, shown).map((c, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: 16, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className={`px-3 py-2.5 border-b border-white/[0.04] transition-opacity duration-500 ${resolved.has(i) ? "opacity-35" : ""}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-semibold shrink-0 ${c.color}`}>{c.author[0]}</div>
                    <span className="text-[9px] font-mono text-amber-400/60">{c.tc}</span>
                    {resolved.has(i) && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="ml-auto w-3 h-3 rounded-full border border-emerald-500/40 flex items-center justify-center">
                        <div className="text-emerald-400 text-[6px]">✓</div>
                      </motion.div>
                    )}
                  </div>
                  <p className={`text-[9px] leading-snug ${resolved.has(i) ? "line-through text-white/22" : "text-white/55"}`}>
                    {c.text.slice(0, 42)}{c.text.length > 42 ? "…" : ""}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="px-3 py-2.5 border-t border-white/[0.05] bg-[#0c0c0c]">
              <div className="flex items-start gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500/25 shrink-0 mt-0.5" />
                <p className="text-[9px] text-white/45 leading-snug">
                  {typingText}<span className="cursor-blink text-white/60">|</span>
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  const projects = [
    { name: "Chandralekha", client: "Himalayan Films", status: "in review", color: "bg-amber-400/70" },
    { name: "Midnight Raga", client: "Sundance Lab", status: "active", color: "bg-emerald-400/70" },
    { name: "The Bridge", client: "Netflix India", status: "delivered", color: "bg-blue-400/70" },
  ];
  return (
    <div className="w-full bg-[#080808] border border-white/[0.09] rounded-2xl overflow-hidden shadow-2xl shadow-black/80">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0b0b0b]">
        <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" /></div>
        <span className="text-[10px] text-white/22 font-light">Dashboard</span>
        <div className="w-12 h-1 bg-white/5 rounded-full" />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[9px] text-white/25 tracking-widest uppercase font-light mb-1">Good afternoon</p>
            <p className="text-white/65 font-light text-sm">Ravi Roshan</p>
          </div>
          <div className="flex gap-4">
            {[{ v: "3", l: "Active" }, { v: "1", l: "Review" }, { v: "1", l: "Done" }].map(s => (
              <div key={s.l} className="text-center">
                <p className="text-white/60 font-light text-base">{s.v}</p>
                <p className="text-white/22 text-[9px] font-light">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 border border-amber-500/15 bg-amber-500/[0.05] rounded-xl px-3 py-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400/70 shrink-0" />
          <span className="text-[9px] text-amber-300/60 font-light">Chandralekha awaiting review</span>
          <span className="ml-auto text-[8px] text-amber-400/40 border border-amber-500/15 px-1.5 py-0.5 rounded-md">Open →</span>
        </div>
        <div className="space-y-1.5">
          {projects.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: EASE }}
              className="flex items-center gap-3 border border-white/[0.06] rounded-xl px-3 py-2.5 hover:border-white/10 transition-colors duration-300">
              <div className={`w-1 h-7 rounded-full ${p.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-xs font-light">{p.name}</p>
                <p className="text-white/25 text-[9px] font-light">{p.client}</p>
              </div>
              <span className="text-[9px] text-white/22 font-light">{p.status}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkspaceMockup() {
  const [tab, setTab] = useState(0);
  const [newFile, setNewFile] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setNewFile(true), 3000);
    const t2 = setTimeout(() => setTab(1), 6000);
    const t3 = setTimeout(() => setTab(0), 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const files = [
    { name: "Score_v3_Final.wav", dept: "Score", status: "approved" },
    { name: "SoundDesign_v2.aaf", dept: "Sound", status: "in_review" },
    { name: "Edit_Cut_v7.xml", dept: "Edit", status: "approved" },
  ];
  const members = [
    { name: "Ravi Roshan", role: "Owner", color: "bg-violet-500/30 text-violet-200" },
    { name: "Arjun M.", role: "Editor", color: "bg-blue-500/30 text-blue-200" },
    { name: "Director", role: "Viewer", color: "bg-amber-500/30 text-amber-200" },
  ];
  const statusCls: Record<string, string> = {
    approved: "text-emerald-400/70 border-emerald-500/20",
    in_review: "text-amber-400/70 border-amber-500/20",
  };

  return (
    <div className="w-full bg-[#080808] border border-white/[0.09] rounded-2xl overflow-hidden shadow-2xl shadow-black/80">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0b0b0b]">
        <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" /></div>
        <span className="text-[10px] text-white/22 font-light">Project Workspace</span>
        <div className="text-[9px] text-emerald-400/50 font-mono">● Live</div>
      </div>
      <div className="px-5 pt-4 pb-3 border-b border-white/[0.05]">
        <p className="text-white/60 font-light text-sm mb-0.5">Chandralekha</p>
        <p className="text-white/25 text-[10px] font-light">Himalayan Films</p>
        <div className="flex gap-1 mt-3">
          {["Files & Versions", "Team"].map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-3 py-1.5 text-[9px] font-light rounded-lg transition-all duration-300 ${tab === i ? "bg-white/8 text-white/70" : "text-white/28 hover:text-white/50"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 min-h-[200px]">
        <AnimatePresence mode="wait">
          {tab === 0 ? (
            <motion.div key="files" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <motion.div key={f.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.4, ease: EASE }}
                    className="flex items-center gap-3 border border-white/[0.05] rounded-xl px-3 py-2.5 hover:border-white/8 transition-colors duration-300">
                    <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                      <span className="text-[8px] text-white/28 font-mono">{f.dept[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/55 font-light truncate">{f.name}</p>
                      <p className="text-[9px] text-white/22 font-light">{f.dept}</p>
                    </div>
                    <span className={`text-[9px] border px-1.5 py-0.5 rounded-lg font-light ${statusCls[f.status] ?? "text-white/25 border-white/8"}`}>
                      {f.status === "in_review" ? "In Review" : "Approved"}
                    </span>
                  </motion.div>
                ))}
                <AnimatePresence>
                  {newFile && (
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="flex items-center gap-3 border border-amber-500/18 bg-amber-500/[0.03] rounded-xl px-3 py-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/12 border border-amber-500/18 flex items-center justify-center">
                        <span className="text-[8px] text-amber-300/70 font-mono">V</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-amber-300/65 font-light">VFX_Composite_v1.mov</p>
                        <p className="text-[9px] text-amber-400/35 font-light">Just uploaded</p>
                      </div>
                      <span className="text-[9px] border border-white/8 px-1.5 py-0.5 rounded-lg text-white/22 font-light">Draft</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <div className="space-y-1.5">
                {members.map((m, i) => (
                  <motion.div key={m.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.4, ease: EASE }}
                    className="flex items-center gap-3 border border-white/[0.05] rounded-xl px-3 py-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium ${m.color}`}>{m.name[0]}</div>
                    <div className="flex-1">
                      <p className="text-xs text-white/55 font-light">{m.name}</p>
                    </div>
                    <span className="text-[9px] text-white/28 border border-white/8 px-1.5 py-0.5 rounded-lg font-light">{m.role}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/55" />
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

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ n, label, title, desc, visual, delay = 0 }: {
  n: string; label: string; title: string; desc: string;
  visual: React.ReactNode; delay?: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <FadeIn delay={delay}>
      <motion.div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={{ y: hovered ? -4 : 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden h-full group"
        style={{
          boxShadow: hovered ? "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)" : "none",
          transition: "box-shadow 0.4s ease",
        }}
      >
        <div className="h-52 border-b border-white/[0.06] bg-[#070707] relative overflow-hidden flex items-center justify-center">
          {visual}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        </div>
        <div className="p-7">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-[10px] font-mono text-white/18">{n}</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[9px] tracking-[0.25em] uppercase text-white/22 font-light">{label}</span>
          </div>
          <h3 className="text-lg font-light text-white/80 mb-3 leading-snug">{title}</h3>
          <p className="text-sm text-white/35 leading-relaxed font-light">{desc}</p>
        </div>
      </motion.div>
    </FadeIn>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(heroP, [0, 1], [0, 180]);
  const heroO = useTransform(heroP, [0, 0.8], [1, 0]);

  return (
    <div className="grain bg-black text-white overflow-x-hidden">
      <CursorGlow />
      <ScrollProgress />
      <Nav />

      {/* ════════════════════════════════════════ HERO ══════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)",
          backgroundSize: "80px 80px",
        }} />

        {/* Film frame numbers */}
        {(["left", "right"] as const).map(side => (
          <div key={side} className={`absolute ${side}-5 top-0 bottom-0 flex flex-col justify-around pointer-events-none select-none`}
            style={{ paddingTop: 100, paddingBottom: 60 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className={`text-[8px] font-mono text-white/[0.06] tracking-widest ${side === "right" ? "text-right" : ""}`}>
                {String((i + 1) * 100).padStart(4, "0")}
              </span>
            ))}
          </div>
        ))}

        <motion.div style={{ y: heroY, opacity: heroO }}
          className="flex-1 flex flex-col lg:flex-row items-center gap-16 px-12 md:px-20 pt-32 pb-20 max-w-[1400px] mx-auto w-full">

          {/* Left — type */}
          <div className="flex-1 flex flex-col">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.3 }}
              className="flex items-center gap-3 mb-10">
              <div className="h-px w-8 bg-white/20" />
              <span className="text-[9px] tracking-[0.48em] uppercase text-white/28 font-light">Studio OS · 2025</span>
            </motion.div>

            {/* Staggered title lines */}
            {["Post Production,", "Composed."].map((line, i) => (
              <div key={line} className="overflow-hidden">
                <motion.h1
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 1.2, delay: 0.5 + i * 0.18, ease: EASE_OUT }}
                  className={`leading-[0.88] tracking-[-0.03em] font-light ${i === 1 ? "text-white/30" : "text-white"}`}
                  style={{ fontSize: "clamp(52px, 7.5vw, 112px)" }}
                >
                  {line}
                </motion.h1>
              </div>
            ))}

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.0, ease: EASE }}
              className="mt-10 text-white/38 text-base leading-relaxed max-w-sm font-light">
              A cinematic workspace for projects, department timelines, review rooms, timecoded notes, and approvals.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.2, ease: EASE }}
              className="flex items-center gap-5 mt-10">
              <a href="/login"
                className="group relative flex items-center gap-3 text-sm font-light text-black bg-white px-8 py-3.5 rounded-2xl hover:bg-white/90 transition-all duration-300 shadow-lg shadow-white/8">
                Login / Sign Up
                <span className="text-black/50 group-hover:translate-x-0.5 transition-transform duration-300">→</span>
              </a>
              <a href="#features"
                className="group flex items-center gap-2 text-sm font-light text-white/38 hover:text-white/65 transition-colors duration-300">
                See how it works
                <span className="text-white/20 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all duration-300">↓</span>
              </a>
            </motion.div>
          </div>

          {/* Right — live app mockup */}
          <motion.div
            initial={{ opacity: 0, x: 48, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.7, ease: EASE_OUT }}
            className="w-full lg:w-[480px] lg:flex-shrink-0 float"
          >
            <div className="relative">
              <div className="absolute -inset-10 pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 65%)" }} />
              <ReviewMockup />
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom timecode line */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 1.2 }}
          className="absolute bottom-8 inset-x-12 flex items-center gap-4">
          <LiveTimecode />
          <div className="flex-1 h-px bg-gradient-to-r from-white/8 via-white/[0.04] to-transparent" />
          <span className="font-mono text-[9px] text-white/12 tracking-widest">IN: 01:00:00:00</span>
        </motion.div>
      </section>

      {/* Marquee */}
      <Marquee />

      {/* ════════════════════════════════════════ APP IN MOTION ═════════════════ */}
      <section className="px-8 md:px-20 py-32 max-w-[1400px] mx-auto">
        <SectionLabel n="01">The App, In Motion</SectionLabel>

        <div className="grid md:grid-cols-2 gap-10 items-center mb-20">
          <Parallax speed={0.07}>
            <FadeIn>
              <h2 className="text-[clamp(34px,4vw,58px)] font-light leading-[0.9] tracking-[-0.025em] text-white/85 mb-5">
                Not a prototype.<br />The real thing.
              </h2>
              <p className="text-white/35 text-sm leading-relaxed max-w-xs font-light">
                Every mockup on this page is animated live in your browser. The comments appear, the timecode runs, files get uploaded. This is the actual interface.
              </p>
            </FadeIn>
          </Parallax>
          <FadeIn delay={0.15}>
            <DashboardMockup />
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          <FadeIn>
            <WorkspaceMockup />
          </FadeIn>
          <Parallax speed={0.07}>
            <FadeIn delay={0.15} className="md:pl-6">
              <h2 className="text-[clamp(34px,4vw,58px)] font-light leading-[0.9] tracking-[-0.025em] text-white/85 mb-5">
                One workspace,<br />every department.
              </h2>
              <p className="text-white/35 text-sm leading-relaxed max-w-xs font-light">
                Score. Sound. Edit. Color. VFX. Each team gets their own space, the project stays whole. Files versioned, approvals tracked.
              </p>
              <a href="/login" className="group inline-flex items-center gap-2 mt-8 text-sm font-light text-white/40 hover:text-white/70 transition-colors duration-300">
                Open a project
                <span className="group-hover:translate-x-0.5 transition-transform duration-300">→</span>
              </a>
            </FadeIn>
          </Parallax>
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ FEATURES ══════════════════════ */}
      <section id="features" className="px-8 md:px-20 py-24 max-w-[1400px] mx-auto">
        <SectionLabel n="02">What We Built</SectionLabel>

        <div className="flex flex-col md:flex-row gap-8 mb-16">
          <Parallax speed={0.07}>
            <FadeIn>
              <h2 className="text-[clamp(34px,4.5vw,62px)] font-light leading-[0.9] tracking-[-0.025em] text-white/85">
                Every tool your team<br />actually needs.
              </h2>
            </FadeIn>
          </Parallax>
          <FadeIn delay={0.2} className="md:ml-auto md:max-w-xs md:pt-4">
            <p className="text-white/30 text-sm leading-relaxed font-light">
              No bloat. No learning curve. Just a clean, cinematic workspace built around the way post-production actually moves.
            </p>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard n="01" label="Review Room" delay={0}
            title="Frame-accurate feedback."
            desc="Drop timecoded notes at the exact frame. Comments sorted, resolvable, and tied to specific file versions."
            visual={
              <div className="w-full h-full flex items-center px-5 gap-3">
                <div className="w-24 h-16 rounded-xl bg-black border border-white/8 flex items-center justify-center relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 to-transparent" />
                  <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center relative">
                    <div className="w-0 h-0 ml-0.5" style={{ borderStyle: "solid", borderWidth: "4px 0 4px 6px", borderColor: "transparent transparent transparent rgba(255,255,255,0.5)" }} />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {DEMO_COMMENTS.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[8px] font-mono text-amber-400/55 shrink-0">{c.tc.slice(3)}</span>
                      <p className="text-[8px] text-white/45 font-light truncate">{c.text.slice(0, 28)}…</p>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
          <FeatureCard n="02" label="Project Workspace" delay={0.1}
            title="Departments, files, versions."
            desc="Each department has its own section. Files are versioned, linked, and reviewable. The whole project stays coherent."
            visual={
              <div className="w-full h-full flex flex-col justify-center px-6 gap-2">
                {["Edit", "Score", "Sound", "Color", "VFX"].map((d, i) => (
                  <div key={d} className="flex items-center gap-2.5">
                    <span className="text-[9px] text-white/25 w-9 text-right font-light">{d}</span>
                    <div className="flex-1 h-3 bg-white/[0.04] rounded overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: "auto" }}
                        transition={{ duration: 1.1, delay: i * 0.1, ease: EASE_OUT }} viewport={{ once: true }}
                        className={`h-full rounded ${["bg-blue-500/25","bg-violet-500/25","bg-amber-500/25","bg-rose-500/25","bg-cyan-500/25"][i]}`}
                        style={{ width: `${[68,52,78,42,58][i]}%`, marginLeft: `${i * 5}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            }
          />
          <FeatureCard n="03" label="Member Portal" delay={0.2}
            title="Roles, access, and clarity."
            desc="Invite clients as viewers, collaborators as editors. Each member sees exactly what they need."
            visual={
              <div className="w-full h-full flex flex-col justify-center px-6 gap-3">
                {[{ n:"Director", r:"Viewer", c:"bg-amber-500/25 text-amber-200" },{ n:"Ravi R.", r:"Owner", c:"bg-violet-500/25 text-violet-200" },{ n:"Arjun M.", r:"Editor", c:"bg-blue-500/25 text-blue-200" },{ n:"Sara L.", r:"Viewer", c:"bg-rose-500/25 text-rose-200" }].map((m, i) => (
                  <motion.div key={m.n} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.6, ease: EASE }} viewport={{ once: true }}
                    className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium ${m.c}`}>{m.n[0]}</div>
                    <div className="flex-1">
                      <p className="text-[10px] text-white/55 font-light">{m.n}</p>
                      <p className="text-[8px] text-white/22 font-light">{m.r}</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/50" />
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
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <Parallax speed={0.1}>
            <FadeIn>
              <h2 className="text-[clamp(36px,4.5vw,64px)] font-light leading-[0.9] tracking-[-0.025em] text-white/85">
                Feedback at<br />the exact frame.
              </h2>
            </FadeIn>
          </Parallax>
          <div className="space-y-10 pt-2">
            {[
              { n:"01", t:"Drop a timecoded note", b:"A film-format HH:MM:SS drum roller appears. Your note is anchored to the exact frame — not a rough approximation." },
              { n:"02", t:"Resolve, track, ship", b:"Every comment is either open or resolved. A progress bar shows the team exactly how close to locked you are." },
              { n:"03", t:"Cinema Mode", b:"One button hides everything. Full black, just the film. For moments that need full attention." },
              { n:"04", t:"Auto-refresh", b:"Comments update every 45 seconds. File status flows Draft → In Review → Approved. Everyone stays current." },
            ].map((item, i) => (
              <FadeIn key={item.n} delay={i * 0.08}>
                <div className="flex gap-6">
                  <span className="text-[9px] font-mono text-white/18 mt-0.5 shrink-0">{item.n}</span>
                  <div className="border-t border-white/[0.06] pt-4 flex-1">
                    <h4 className="text-white/65 font-light mb-2 text-sm">{item.t}</h4>
                    <p className="text-white/30 text-sm leading-relaxed font-light">{item.b}</p>
                  </div>
                </div>
              </FadeIn>
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
            { t: 7,   suf: "",   l: "Departments tracked"        },
            { t: 0,   suf: "",   l: "WhatsApp threads required"  },
            { t: 100, suf: "%",  l: "Feedback in one place"      },
            { t: 24,  suf: "/7", l: "Project visibility"         },
          ].map((s, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="border-t border-white/[0.07] pt-8">
                <div className="text-[clamp(44px,5vw,76px)] font-light leading-none tracking-[-0.04em] text-white/80 mb-3">
                  <Counter target={s.t} suffix={s.suf} />
                </div>
                <p className="text-white/28 text-sm font-light">{s.l}</p>
              </div>
            </FadeIn>
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
        <div className="flex items-stretch overflow-x-auto scrollbar-hide pb-2 gap-0">
          {["Ingest","Edit","Score","Sound","Color","VFX","Mix","Review","Delivery"].map((step, i, arr) => (
            <FadeIn key={step} delay={i * 0.06} className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-2.5 px-4">
                <span className={`text-[9px] font-mono ${i === arr.length - 1 ? "text-emerald-400/60" : "text-white/15"}`}>{p2(i + 1)}</span>
                <motion.div
                  whileHover={{ borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.04)" }}
                  transition={{ duration: 0.25 }}
                  className={`px-5 py-2.5 rounded-2xl border text-xs font-light whitespace-nowrap cursor-default ${
                    i === arr.length - 1
                      ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300/80"
                      : "border-white/[0.07] text-white/40"
                  }`}>
                  {step}
                </motion.div>
              </div>
              {i < arr.length - 1 && <div className="w-6 h-px bg-white/8 shrink-0" />}
            </FadeIn>
          ))}
        </div>
      </section>

      <Divider />

      {/* ════════════════════════════════════════ CTA ═══════════════════════════ */}
      <section className="px-8 md:px-20 py-40 text-center relative max-w-[1400px] mx-auto">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 70%)" }} />
        </div>

        <FadeIn>
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="h-px w-12 bg-white/12" />
            <span className="text-[9px] tracking-[0.48em] uppercase text-white/22 font-light">Ready to begin</span>
            <div className="h-px w-12 bg-white/12" />
          </div>

          <h2 className="text-[clamp(52px,8vw,120px)] font-light leading-[0.85] tracking-[-0.04em] text-white/85 mb-8">
            Enter<br />MixLabs.
          </h2>

          <p className="text-white/28 text-base max-w-sm mx-auto mb-14 leading-relaxed font-light">
            Built for post-production studios that take their craft seriously.
          </p>

          <motion.a href="/login"
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.95)" }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.25 }}
            className="group inline-flex items-center gap-3 bg-white text-black px-12 py-5 rounded-2xl text-sm font-light shadow-2xl shadow-white/8 cursor-pointer">
            Enter MixLabs
            <span className="text-black/40 group-hover:translate-x-1 transition-transform duration-300">→</span>
          </motion.a>
        </FadeIn>
      </section>

      {/* ════════════════════════════════════════ FOOTER ════════════════════════ */}
      <footer className="px-8 md:px-20 py-10 border-t border-white/[0.04] max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
              <span className="text-[8px] font-semibold text-white/35">ML</span>
            </div>
            <span className="text-white/18 text-[10px] tracking-[0.3em] uppercase font-light">MixLabs Studio</span>
          </div>
          <LiveTimecode />
          <p className="text-white/12 text-[10px] tracking-widest uppercase font-light">Built for film. Made with care.</p>
        </div>
      </footer>
    </div>
  );
}
