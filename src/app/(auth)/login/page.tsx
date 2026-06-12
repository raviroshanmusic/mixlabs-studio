"use client";
import { useState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    if (mode === "in") {
      const result = await loginAction(formData);
      // If we get here, login failed (success = server redirect, never returns)
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } else {
      // Sign up — keep client-side for now
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage("Check your email to confirm your account.");
      }
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
              type="button"
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
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
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
