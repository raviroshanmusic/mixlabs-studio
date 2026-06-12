"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      setMessage("Check your email to confirm your account.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-12 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs font-bold tracking-widest text-white">
          ML
        </div>
        <span className="text-white/40 text-xs tracking-[0.3em] uppercase">MixLabs</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm glass rounded-2xl p-8">
        <div className="mb-8">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-1">Studio Access</p>
          <h1 className="text-white text-xl font-light tracking-wide">
            Sign {mode === "in" ? "in to" : "up for"} MixLabs
          </h1>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-white/5">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-md text-xs tracking-widest uppercase transition-all ${
                mode === m ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
              }`}
            >
              {m === "in" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
          />

          {error && <p className="text-red-400/80 text-xs">{error}</p>}
          {message && <p className="text-green-400/80 text-xs">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-white text-black rounded-lg py-3 text-sm font-medium tracking-wide hover:bg-white/90 disabled:opacity-40 transition-all"
          >
            {loading ? "..." : mode === "in" ? "Enter Dashboard" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-white/20 text-xs">
          Private workspace · Projects stay inside MixLabs
        </p>
      </div>
    </div>
  );
}
