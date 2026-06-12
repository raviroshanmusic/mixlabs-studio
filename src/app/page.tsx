"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  useScroll, useTransform, useSpring,
  motion, AnimatePresence,
} from "framer-motion";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useMouseTilt(strength = 12) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setTilt({
      x: ((e.clientY - cy) / (r.height / 2)) * -strength,
      y: ((e.clientX - cx) / (r.width / 2)) * strength,
    });
  }, [strength]);

  const onLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("mousemove", onMove as EventListener);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove as EventListener);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [onMove, onLeave]);

  return { ref, tilt };
}

// ─── Running Timecode ─────────────────────────────────────────────────────────

function LiveTimecode() {
  const [tc, setTc] = useState("01:00:00:00");
  useEffect(() => {
    let frame = 0;
    let secs = 3600;
    const id = setInterval(() => {
      secs++;
      frame = (frame + 1) % 24;
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      const f = frame;
      setTc(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`
      );
    }, 1000 / 24);
    return () => clearInterval(id);
  }, []);

  const parts = tc.split(":");
  return (
    <span className="font-mono text-[11px] tracking-widest text-white/25 tabular-nums select-none">
      {parts[0]}
      <span className="tc-colon">:</span>
      {parts[1]}
      <span className="tc-colon">:</span>
      {parts[2]}
      <span className="tc-colon">:</span>
      {parts[3]}
    </span>
  );
}

// ─── Marquee Strip ────────────────────────────────────────────────────────────

const MARQUEE_ITEMS = [
  "REVIEW ROOM", "·", "TIMECODED NOTES", "·", "DEPARTMENT PIPELINE", "·",
  "CLIENT DELIVERY", "·", "SCORE", "·", "SOUND DESIGN", "·", "COLOR GRADE", "·",
  "VFX SUPERVISION", "·", "EDIT SUITE", "·", "PROJECT WORKSPACE", "·",
  "MEMBER PORTAL", "·", "APPROVAL WORKFLOW", "·",
];

function Marquee({ reverse = false }: { reverse?: boolean }) {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden py-4 border-y border-white/[0.06]">
      <div
        className="marquee-track"
        style={{
          animationDirection: reverse ? "reverse" : "normal",
          animationDuration: "35s",
        }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            className={`px-4 text-[10px] tracking-[0.3em] uppercase select-none ${
              item === "·" ? "text-white/15" : "text-white/30"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Feature Card (3D Tilt) ───────────────────────────────────────────────────

function FeatureCard({
  index, label, title, description, visual, delay = 0,
}: {
  index: string; label: string; title: string; description: string;
  visual: React.ReactNode; delay?: number;
}) {
  const { ref, tilt } = useMouseTilt(8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-80px" }}
    >
      <div
        ref={ref}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
          transformStyle: "preserve-3d",
        }}
        className="rounded-3xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden group cursor-default h-full"
      >
        {/* Visual area */}
        <div className="h-52 border-b border-white/[0.06] relative overflow-hidden bg-[#070707] flex items-center justify-center">
          {visual}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-mono text-white/20 tracking-widest">{index}</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[9px] tracking-[0.25em] uppercase text-white/25 font-medium">{label}</span>
          </div>
          <h3 className="text-xl font-light text-white/90 mb-3 leading-snug">{title}</h3>
          <p className="text-sm text-white/40 leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Review Room Visual ───────────────────────────────────────────────────────

function ReviewVisual() {
  const comments = [
    { tc: "01:12:34", text: "The strings feel too bright here", resolved: false },
    { tc: "01:14:08", text: "Love this moment — lock it", resolved: true },
    { tc: "01:16:22", text: "Reduce reverb on dialogue", resolved: false },
  ];
  return (
    <div className="w-full h-full flex items-center px-6 gap-3">
      {/* Mini player */}
      <div className="w-28 h-20 rounded-xl bg-black border border-white/8 flex items-center justify-center shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center">
          <div className="w-2 h-2 bg-white/60 rounded-sm ml-0.5" style={{ clipPath: "polygon(0 0, 100% 50%, 0 100%)" }} />
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <div className="h-0.5 bg-white/8 rounded-full">
            <div className="h-full w-2/5 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>
      {/* Comment stack */}
      <div className="flex-1 space-y-2">
        {comments.map((c, i) => (
          <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${c.resolved ? "opacity-40" : ""}`}>
            <span className="text-[9px] font-mono text-amber-400/70 mt-0.5 shrink-0">{c.tc}</span>
            <p className="text-[10px] text-white/60 leading-tight">{c.text}</p>
            {c.resolved && <div className="shrink-0 w-3 h-3 rounded-full border border-emerald-500/50 flex items-center justify-center ml-auto">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pipeline Visual ──────────────────────────────────────────────────────────

function PipelineVisual() {
  const depts = ["Edit", "Score", "Sound", "Color", "VFX"];
  const colors = ["bg-blue-500/30", "bg-violet-500/30", "bg-amber-500/30", "bg-rose-500/30", "bg-cyan-500/30"];
  const widths = ["w-24", "w-20", "w-28", "w-16", "w-22"];
  return (
    <div className="w-full h-full flex flex-col justify-center px-6 gap-2">
      {depts.map((d, i) => (
        <div key={d} className="flex items-center gap-3">
          <span className="text-[10px] text-white/30 w-10 text-right shrink-0 font-medium">{d}</span>
          <div className="flex-1 h-5 bg-white/[0.04] rounded-md overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "auto" }}
              transition={{ duration: 1.2, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className={`h-full ${widths[i]} ${colors[i]} rounded-md`}
              style={{ marginLeft: `${i * 8}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Members Visual ───────────────────────────────────────────────────────────

function MembersVisual() {
  const members = [
    { name: "Ravi R.", role: "Composer", color: "bg-violet-500/30 text-violet-200" },
    { name: "Priya K.", role: "Editor", color: "bg-blue-500/30 text-blue-200" },
    { name: "Arjun M.", role: "Sound", color: "bg-amber-500/30 text-amber-200" },
    { name: "Sara L.", role: "Client", color: "bg-rose-500/30 text-rose-200" },
  ];
  return (
    <div className="w-full h-full flex flex-col justify-center px-6 gap-2.5">
      {members.map((m, i) => (
        <motion.div
          key={m.name}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 + 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex items-center gap-3"
        >
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${m.color}`}>
            {m.name[0]}
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/70 font-medium">{m.name}</p>
            <p className="text-[10px] text-white/30">{m.role}</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Parallax Section Text ────────────────────────────────────────────────────

function ParallaxText({ children, speed = 0.15 }: { children: React.ReactNode; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}px`, `-${speed * 100}px`]);
  const smoothY = useSpring(y, { stiffness: 80, damping: 20 });
  return (
    <motion.div ref={ref} style={{ y: smoothY }}>
      {children}
    </motion.div>
  );
}

// ─── Counter ──────────────────────────────────────────────────────────────────

function Counter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 2000;
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current = Math.min(current + increment, target);
          setCount(Math.floor(current));
          if (current >= target) clearInterval(timer);
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="tabular-nums font-light">
      {prefix}{count.toLocaleString()}{suffix}
    </div>
  );
}

// ─── Scroll Progress Line ─────────────────────────────────────────────────────

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: "left" }}
      className="fixed top-0 left-0 right-0 h-[1px] bg-white/40 z-[100]"
    />
  );
}

// ─── Manifesto Section ────────────────────────────────────────────────────────

const WORDS = [
  "Film", "is", "not", "made", "by", "one", "person.",
  "It", "moves", "through", "rooms,", "across", "departments,",
  "between", "directors", "and", "composers", "and", "editors",
  "and", "colorists.", "MixLabs", "is", "built", "for", "that", "journey.",
];

function ManifestoText() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.6"] });

  return (
    <div ref={ref} className="flex flex-wrap gap-x-3 gap-y-1 max-w-3xl">
      {WORDS.map((word, i) => {
        const start = i / WORDS.length;
        const end = (i + 1) / WORDS.length;
        return (
          <WordReveal key={i} word={word} scrollYProgress={scrollYProgress} start={start} end={end} />
        );
      })}
    </div>
  );
}

function WordReveal({
  word, scrollYProgress, start, end,
}: {
  word: string;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  start: number;
  end: number;
}) {
  const opacity = useTransform(scrollYProgress, [start, Math.min(end + 0.05, 1)], [0.12, 1]);
  const color = useTransform(scrollYProgress, [start, Math.min(end + 0.05, 1)], ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.95)"]);
  return (
    <motion.span style={{ opacity, color }} className="text-4xl md:text-5xl font-light leading-tight">
      {word}
    </motion.span>
  );
}

// ─── Horizontal Rule ──────────────────────────────────────────────────────────

function Rule() {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true }}
      style={{ transformOrigin: "left" }}
      className="h-px bg-gradient-to-r from-white/20 via-white/8 to-transparent my-20"
    />
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="flex items-center gap-4 mb-16"
    >
      <span className="text-[10px] font-mono text-white/20 tracking-widest">{number}</span>
      <div className="w-12 h-px bg-white/15" />
      <span className="text-[9px] tracking-[0.35em] uppercase text-white/30 font-semibold">{children}</span>
    </motion.div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    return scrollY.on("change", v => setScrolled(v > 60));
  }, [scrollY]);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 py-5 transition-all duration-500 ${
        scrolled ? "border-b border-white/[0.06] bg-black/80 backdrop-blur-xl" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-7 h-7">
          <div className="absolute inset-0 rounded-lg bg-white/8 border border-white/12" />
          <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black tracking-tight text-white/80">ML</div>
        </div>
        <span className="text-white/50 text-[11px] tracking-[0.35em] uppercase font-medium">MixLabs</span>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-8 text-[10px] tracking-[0.25em] uppercase text-white/30">
          <a href="#workflow" className="hover:text-white/70 transition-colors">Workflow</a>
          <a href="#review"   className="hover:text-white/70 transition-colors">Review</a>
          <a href="#studio"   className="hover:text-white/70 transition-colors">Studio</a>
        </div>
        <a href="/login"
          className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-semibold text-white/70 hover:text-white border border-white/12 hover:border-white/30 px-4 py-2 rounded-xl transition-all bg-white/[0.03] hover:bg-white/[0.06]">
          Enter App
          <span className="text-white/30">→</span>
        </a>
      </div>
    </motion.nav>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY  = useTransform(heroScroll, [0, 1], [0, 180]);
  const heroO  = useTransform(heroScroll, [0, 0.7], [1, 0]);

  return (
    <div className="grain bg-black text-white overflow-x-hidden">
      <ScrollProgress />
      <Nav />

      {/* ══════════════════════════════════════════════════════ */}
      {/* HERO                                                   */}
      {/* ══════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col">
        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />

        {/* Radial glow center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 70%)" }}
        />

        {/* Film edge numbers — left */}
        <div className="absolute left-6 top-0 bottom-0 flex flex-col justify-around pointer-events-none select-none" style={{ paddingTop: "120px" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="text-[9px] font-mono text-white/10 tracking-widest">
              {String((i + 1) * 100).padStart(4, "0")}
            </span>
          ))}
        </div>

        {/* Film edge numbers — right */}
        <div className="absolute right-6 top-0 bottom-0 flex flex-col justify-around pointer-events-none select-none" style={{ paddingTop: "120px" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="text-[9px] font-mono text-white/10 tracking-widest text-right">
              {String((i + 1) * 100).padStart(4, "0")}
            </span>
          ))}
        </div>

        {/* Hero content */}
        <motion.div style={{ y: heroY, opacity: heroO }} className="flex-1 flex flex-col items-center justify-center text-center px-8 pt-24 pb-16">

          {/* Label */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="flex items-center gap-4 mb-10"
          >
            <div className="h-px w-12 bg-white/20" />
            <span className="text-[10px] tracking-[0.5em] uppercase text-white/35 font-medium">Studio OS · 2025</span>
            <div className="h-px w-12 bg-white/20" />
          </motion.div>

          {/* Main title */}
          <div className="overflow-hidden mb-6">
            <motion.h1
              initial={{ y: 120 }}
              animate={{ y: 0 }}
              transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(48px,9vw,130px)] font-extralight leading-[0.88] tracking-[-0.04em] text-white"
            >
              THE POST-
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-6">
            <motion.h1
              initial={{ y: 120 }}
              animate={{ y: 0 }}
              transition={{ duration: 1.1, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(48px,9vw,130px)] font-extralight leading-[0.88] tracking-[-0.04em] text-white/40"
              style={{ fontStyle: "italic" }}
            >
              PRODUCTION
            </motion.h1>
          </div>
          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: 120 }}
              animate={{ y: 0 }}
              transition={{ duration: 1.1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(48px,9vw,130px)] font-extralight leading-[0.88] tracking-[-0.04em] text-white"
            >
              PLATFORM.
            </motion.h1>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="mt-12 max-w-lg text-white/40 text-base leading-relaxed"
          >
            Where sound, score, edit, color, and VFX teams collaborate
            on serious films — without the chaos.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.4 }}
            className="flex items-center gap-4 mt-10"
          >
            <a href="/login"
              className="group flex items-center gap-2.5 bg-white text-black px-8 py-3.5 rounded-2xl text-sm font-semibold hover:bg-white/90 transition-all shadow-2xl shadow-white/10">
              Enter MixLabs
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </a>
            <a href="#workflow"
              className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors border border-white/10 hover:border-white/20 px-8 py-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04]">
              See how it works
            </a>
          </motion.div>

          {/* Timecode bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.8 }}
            className="absolute bottom-10 inset-x-0 flex items-center justify-between px-12"
          >
            <LiveTimecode />
            <div className="flex-1 mx-6 h-px bg-gradient-to-r from-white/10 via-white/5 to-white/10" />
            <span className="font-mono text-[10px] text-white/15 tracking-widest">IN: 01:00:00:00</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MARQUEE                                                */}
      {/* ══════════════════════════════════════════════════════ */}
      <Marquee />

      {/* ══════════════════════════════════════════════════════ */}
      {/* FEATURES                                               */}
      {/* ══════════════════════════════════════════════════════ */}
      <section id="workflow" className="px-8 md:px-16 py-28">
        <SectionLabel number="01">What We Built</SectionLabel>

        <div className="flex flex-col md:flex-row gap-5 items-start mb-16">
          <ParallaxText speed={0.08}>
            <motion.h2
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="text-[clamp(36px,5vw,72px)] font-extralight leading-[0.9] tracking-[-0.03em] text-white/90 max-w-lg"
            >
              Every tool<br />
              <span className="text-white/30 italic">your team</span><br />
              actually needs.
            </motion.h2>
          </ParallaxText>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-white/35 text-sm leading-relaxed max-w-sm mt-auto md:ml-auto"
          >
            No bloat. No learning curve. Just a clean, cinematic workspace that moves the way film production moves — from ingest to delivery.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            index="01" label="Review Room" delay={0}
            title="Timecoded feedback that travels with the frame."
            description="Clients and collaborators drop notes at exact timecodes. Comments are sorted, resolvable, and tied to specific file versions."
            visual={<ReviewVisual />}
          />
          <FeatureCard
            index="02" label="Project Workspace" delay={0.12}
            title="Departments. Files. Team. One space."
            description="Sound, Score, Edit, Color, VFX — each department has its own file timeline. Everyone sees exactly what they need."
            visual={<PipelineVisual />}
          />
          <FeatureCard
            index="03" label="Member Portal" delay={0.24}
            title="Roles, access, and clarity — built in."
            description="Invite clients as viewers, collaborators as editors. Each member sees their world without stepping into someone else's."
            visual={<MembersVisual />}
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* REVIEW ROOM DEEP DIVE                                  */}
      {/* ══════════════════════════════════════════════════════ */}
      <Rule />

      <section id="review" className="px-8 md:px-16 py-24">
        <SectionLabel number="02">Review Room</SectionLabel>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <ParallaxText speed={0.1}>
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="text-[clamp(40px,4.5vw,68px)] font-extralight leading-[0.9] tracking-[-0.03em]"
            >
              Feedback at<br />
              <span className="text-white/25 italic">the exact</span><br />
              frame.
            </motion.h2>
          </ParallaxText>

          <div className="space-y-8">
            {[
              {
                n: "01", title: "Drop a timecoded note",
                body: "Click anywhere in the timeline — a timecode roller appears in film HH:MM:SS format. Your note is anchored to that exact frame.",
              },
              {
                n: "02", title: "Filter, resolve, repeat",
                body: "Open notes, resolved notes — tracked separately. A progress bar shows the team exactly how close to locked you are.",
              },
              {
                n: "03", title: "Cinema Mode",
                body: "Hide everything. Full black. Just the film. For the moments that need full attention, not a cluttered screen.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.n}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className="flex gap-5 group"
              >
                <span className="text-[10px] font-mono text-white/20 mt-1 shrink-0">{item.n}</span>
                <div>
                  <h4 className="text-white/80 font-medium mb-1.5">{item.title}</h4>
                  <p className="text-white/35 text-sm leading-relaxed">{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* STATS                                                  */}
      {/* ══════════════════════════════════════════════════════ */}
      <Rule />

      <section className="px-8 md:px-16 py-24">
        <SectionLabel number="03">By The Numbers</SectionLabel>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { target: 7,    suffix: "",    prefix: "", label: "Departments tracked"      },
            { target: 100,  suffix: "%",   prefix: "", label: "Feedback resolved"        },
            { target: 0,    suffix: "",    prefix: "", label: "WhatsApp threads needed"  },
            { target: 24,   suffix: "",    prefix: "", label: "Hour project visibility"  },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="border-t border-white/[0.07] pt-8"
            >
              <div className="text-[clamp(44px,5vw,72px)] font-extralight leading-none tracking-[-0.04em] text-white/90 mb-3">
                <Counter target={stat.target} suffix={stat.suffix} prefix={stat.prefix} />
              </div>
              <p className="text-white/35 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MANIFESTO                                              */}
      {/* ══════════════════════════════════════════════════════ */}
      <Rule />

      <section id="studio" className="px-8 md:px-16 py-32">
        <SectionLabel number="04">Our Belief</SectionLabel>
        <ManifestoText />
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* WORKFLOW STRIP                                         */}
      {/* ══════════════════════════════════════════════════════ */}
      <Rule />

      <section className="px-8 md:px-16 py-24 overflow-hidden">
        <SectionLabel number="05">The Pipeline</SectionLabel>

        <div className="flex items-center gap-0 overflow-x-auto pb-4 scrollbar-hide">
          {["Ingest", "Edit", "Score", "Sound Design", "Color Grade", "VFX", "Mix", "Review", "Delivery"].map((step, i, arr) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="flex items-center"
            >
              <div className="flex flex-col items-center gap-2 px-4">
                <div className={`text-[10px] font-mono ${i === arr.length - 1 ? "text-emerald-400/70" : "text-white/20"}`}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className={`px-4 py-2.5 rounded-xl border whitespace-nowrap text-xs font-medium transition-all ${
                  i === arr.length - 1
                    ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-300"
                    : "border-white/8 bg-white/[0.03] text-white/50"
                }`}>
                  {step}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div className="w-8 h-px bg-white/10 shrink-0" />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FINAL CTA                                              */}
      {/* ══════════════════════════════════════════════════════ */}
      <Rule />

      <section className="px-8 md:px-16 py-32 text-center relative">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)" }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="h-px w-16 bg-white/15" />
            <span className="text-[9px] tracking-[0.5em] uppercase text-white/25 font-medium">Ready to begin</span>
            <div className="h-px w-16 bg-white/15" />
          </div>

          <h2 className="text-[clamp(48px,8vw,110px)] font-extralight leading-[0.88] tracking-[-0.04em] text-white mb-8">
            ENTER<br />
            <span className="text-white/25 italic">THE ROOM.</span>
          </h2>

          <p className="text-white/30 text-base max-w-md mx-auto mb-12 leading-relaxed">
            Built for post-production studios that take their craft seriously. No templates. No shortcuts. Just a platform that works the way you do.
          </p>

          <a href="/login"
            className="group inline-flex items-center gap-3 bg-white text-black px-12 py-5 rounded-2xl text-sm font-bold hover:bg-white/90 transition-all shadow-2xl shadow-white/10">
            Enter MixLabs
            <span className="group-hover:translate-x-1 transition-transform text-base">→</span>
          </a>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FOOTER                                                 */}
      {/* ══════════════════════════════════════════════════════ */}
      <footer className="px-8 md:px-16 py-10 border-t border-white/[0.05]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center text-[8px] font-black text-white/60">ML</div>
            <span className="text-white/25 text-[10px] tracking-[0.3em] uppercase">MixLabs Studio</span>
          </div>
          <LiveTimecode />
          <p className="text-white/15 text-[10px] tracking-widest uppercase">
            Built for film. Made with care.
          </p>
        </div>
      </footer>
    </div>
  );
}
