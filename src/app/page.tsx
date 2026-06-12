import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold">ML</div>
          <span className="text-white/50 text-xs tracking-[0.3em] uppercase">MixLabs</span>
        </div>
        <div className="flex items-center gap-8 text-xs tracking-widest uppercase text-white/30">
          <span>Workflow</span>
          <span>Review</span>
          <span>Studio</span>
          <Link href="/login" className="text-white/80 hover:text-white transition-colors">Enter App →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen text-center px-6 pt-20">
        <p className="text-white/20 text-[10px] tracking-[0.5em] uppercase mb-6">MixLabs Studio OS</p>
        <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-6 leading-none">
          Post Production,<br />
          <span className="text-white/30">Composed.</span>
        </h1>
        <p className="text-white/30 text-lg max-w-xl mb-10 leading-relaxed">
          A cinematic workspace for projects, department timelines, review rooms, timecoded notes, and approvals.
        </p>
        <div className="flex gap-4">
          <Link href="/login" className="bg-white text-black px-8 py-3 rounded-xl text-sm font-medium hover:bg-white/90 transition-all">
            Login / Sign Up
          </Link>
          <Link href="/dashboard" className="glass px-8 py-3 rounded-xl text-sm text-white/60 hover:text-white transition-all">
            View Dashboard
          </Link>
        </div>

        {/* Floating labels */}
        <div className="mt-20 flex gap-4 text-[10px] text-white/20 tracking-widest uppercase">
          {["Launch", "Edit", "Score", "Sound", "Color"].map((s) => (
            <span key={s} className="px-3 py-1 glass rounded-full">{s}</span>
          ))}
        </div>
      </section>

      {/* Workflow section */}
      <section className="px-8 py-24 border-t border-white/5">
        <p className="text-white/20 text-[10px] tracking-[0.5em] uppercase text-center mb-4">Project Workflow</p>
        <h2 className="text-3xl font-light text-center mb-16">Every film moves through one clean timeline.</h2>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {["Ingest", "Edit", "Score", "Sound", "Color", "Review", "Delivery"].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <div className="glass px-4 py-2 rounded-lg text-sm text-white/60">{step}</div>
              {i < arr.length - 1 && <span className="text-white/15">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Review section */}
      <section className="px-8 py-24 border-t border-white/5 text-center">
        <p className="text-white/20 text-[10px] tracking-[0.5em] uppercase mb-4">Review Room</p>
        <h2 className="text-3xl font-light mb-4">Timecoded notes without the noise.</h2>
        <p className="text-white/30 max-w-lg mx-auto">
          Clients pause the film, write the note, and the timecode travels with the comment.
          The team gets clarity instead of scattered WhatsApp messages.
        </p>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 border-t border-white/5 text-center">
        <h2 className="text-3xl font-light mb-6">Enter MixLabs</h2>
        <Link href="/login" className="bg-white text-black px-10 py-4 rounded-xl text-sm font-medium hover:bg-white/90 transition-all inline-block">
          Get Started
        </Link>
      </section>
    </div>
  );
}
