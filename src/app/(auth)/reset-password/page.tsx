"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import MixLabsLogo from "@/components/ui/MixLabsLogo";

export default function ResetPasswordPage() {
  const [ready, setReady]     = useState(false);   // do we have a recovery session?
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);

  // The auth-callback route exchanged the recovery code for a session before
  // sending us here, so a valid user session should exist.
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setReady(!!data.user));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSaving(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) { setError(error.message); setSaving(false); return; }
    setDone(true);
    setTimeout(() => { window.location.href = "/dashboard"; }, 1400);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 flex flex-col items-center gap-4">
        <span className="text-white"><MixLabsLogo size={80} /></span>
        <span className="text-white/35 text-[10px] tracking-[0.4em] uppercase font-light">MixLabs Workspace</span>
      </div>

      <div className="w-full max-w-sm glass rounded-2xl p-8">
        <div className="mb-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-1">Account recovery</p>
          <h1 className="text-white text-xl font-light tracking-wide">Set a new password</h1>
        </div>

        {done ? (
          <p className="text-green-400/80 text-sm">Password updated. Signing you in…</p>
        ) : !ready ? (
          <p className="text-white/40 text-sm">
            This reset link is invalid or has expired. Request a new one from the{" "}
            <a href="/login" className="text-white/70 underline">sign in page</a>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-medium">New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="8+ chars" required autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-medium">Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat" required autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors" />
            </div>

            {error && <p className="text-red-400/80 text-xs">{error}</p>}

            <button type="submit" disabled={saving}
              className="mt-2 w-full bg-white text-black rounded-lg py-3 text-sm font-medium tracking-wide hover:bg-white/90 disabled:opacity-40 transition-all">
              {saving ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
