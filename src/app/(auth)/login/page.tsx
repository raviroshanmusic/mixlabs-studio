"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

// ─── Role options (mirrors MemberClient PROFESSIONS) ─────────────────────────

const ROLE_CATEGORIES: Record<string, string[]> = {
  "Direction & Production": [
    "Director",
    "Producer",
    "Executive Producer",
    "Post Production Supervisor",
  ],
  Music: ["Composer", "Music Editor", "Music Supervisor"],
  Sound: [
    "Sound Designer",
    "Re-recording Mixer",
    "Supervising Sound Editor",
    "Foley Artist",
    "ADR / Voice Artist",
  ],
  Picture: ["Video Editor", "Colorist", "VFX Artist", "Motion Designer"],
  Other: ["Client", "Agency"],
};

// ─── Input component ──────────────────────────────────────────────────────────

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-medium">
        {label}
        {required && <span className="text-white/20 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
      />
    </div>
  );
}

// ─── Role selector ────────────────────────────────────────────────────────────

function RoleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isOther = value === "Other (specify)";
  const [custom, setCustom] = useState("");

  function pick(role: string) {
    onChange(role);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-medium">
        Role / Profession <span className="text-white/20">*</span>
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-left flex items-center justify-between transition-colors hover:border-white/20 focus:border-white/20 outline-none"
      >
        <span className={value ? "text-white" : "text-white/20"}>
          {value || "Select your role…"}
        </span>
        <ChevronDown
          size={14}
          className={`text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="rounded-xl border border-white/10 bg-[#111] overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
          {Object.entries(ROLE_CATEGORIES).map(([cat, roles]) => (
            <div key={cat}>
              <div className="px-3 py-1.5 text-[9px] tracking-[0.25em] uppercase text-white/25 font-medium bg-white/3 sticky top-0">
                {cat}
              </div>
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => pick(r)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/8 ${
                    value === r ? "text-white bg-white/5" : "text-white/60 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          ))}
          {/* Other */}
          <div>
            <button
              type="button"
              onClick={() => pick("Other (specify)")}
              className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/8 ${
                isOther ? "text-white bg-white/5" : "text-white/60 hover:text-white"
              }`}
            >
              Other…
            </button>
          </div>
        </div>
      )}

      {/* Custom input for "Other" */}
      {isOther && (
        <input
          type="text"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            onChange(e.target.value || "Other (specify)");
          }}
          placeholder="Describe your role…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
          autoFocus
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");

  // Sign-in fields
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  // Sign-up fields
  const [firstName,   setFirstName]   = useState("");
  const [lastName,    setLastName]    = useState("");
  const [upEmail,     setUpEmail]     = useState("");
  const [upPassword,  setUpPassword]  = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [role,        setRole]        = useState("");
  const [company,     setCompany]     = useState("");

  const [error,   setError]   = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res  = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Login failed"); setLoading(false); return; }
    window.location.href = "/dashboard";
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMessage("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name."); return;
    }
    if (!role || role === "Other (specify)") {
      setError("Please select or enter your role."); return;
    }
    if (upPassword.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    if (upPassword !== confirmPwd) {
      setError("Passwords don't match."); return;
    }

    setLoading(true);
    const res  = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     upEmail.trim(),
        password:  upPassword,
        profession: role.trim(),
        company:   company.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Signup failed"); setLoading(false); return; }

    if (data.emailConfirmationRequired) {
      setMessage("Account created! Check your email to confirm, then sign in.");
      setMode("in");
      setEmail(upEmail.trim());
    } else {
      window.location.href = "/dashboard";
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs font-bold tracking-widest text-white">
          ML
        </div>
        <span className="text-white/40 text-xs tracking-[0.3em] uppercase">MixLabs</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm glass rounded-2xl p-8">
        <div className="mb-6">
          <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mb-1">Studio Access</p>
          <h1 className="text-white text-xl font-light tracking-wide">
            {mode === "in" ? "Sign in to MixLabs" : "Create your account"}
          </h1>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-white/5">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); setMessage(""); }}
              className={`flex-1 py-2 rounded-md text-xs tracking-widest uppercase transition-all ${
                mode === m ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
              }`}
            >
              {m === "in" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* ── Sign In ── */}
        {mode === "in" && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-3">
            <Field label="Email" type="email" value={email} onChange={setEmail}
              placeholder="you@studio.com" required autoComplete="email" />
            <Field label="Password" type="password" value={password} onChange={setPassword}
              placeholder="••••••••" required autoComplete="current-password" />

            {error   && <p className="text-red-400/80 text-xs">{error}</p>}
            {message && <p className="text-green-400/80 text-xs">{message}</p>}

            <button type="submit" disabled={loading}
              className="mt-2 w-full bg-white text-black rounded-lg py-3 text-sm font-medium tracking-wide hover:bg-white/90 disabled:opacity-40 transition-all">
              {loading ? "Signing in…" : "Enter Dashboard"}
            </button>
          </form>
        )}

        {/* ── Sign Up ── */}
        {mode === "up" && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" value={firstName} onChange={setFirstName}
                placeholder="Ravi" required autoComplete="given-name" />
              <Field label="Last Name" value={lastName} onChange={setLastName}
                placeholder="Roshan" required autoComplete="family-name" />
            </div>

            <Field label="Email" type="email" value={upEmail} onChange={setUpEmail}
              placeholder="you@studio.com" required autoComplete="email" />

            <RoleSelector value={role} onChange={setRole} />

            <Field label="Company / Studio" value={company} onChange={setCompany}
              placeholder="MixLabs Creative (optional)" autoComplete="organization" />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Password" type="password" value={upPassword} onChange={setUpPassword}
                placeholder="8+ chars" required autoComplete="new-password" />
              <Field label="Confirm Password" type="password" value={confirmPwd} onChange={setConfirmPwd}
                placeholder="Repeat" required autoComplete="new-password" />
            </div>

            {error   && <p className="text-red-400/80 text-xs">{error}</p>}
            {message && <p className="text-green-400/80 text-xs">{message}</p>}

            <button type="submit" disabled={loading}
              className="mt-1 w-full bg-white text-black rounded-lg py-3 text-sm font-medium tracking-wide hover:bg-white/90 disabled:opacity-40 transition-all">
              {loading ? "Creating account…" : "Create Account"}
            </button>

            <p className="text-center text-white/20 text-[10px]">
              By signing up you agree to our terms of service
            </p>
          </form>
        )}

        {mode === "in" && (
          <p className="mt-6 text-center text-white/20 text-xs">
            Private workspace · Projects stay inside MixLabs
          </p>
        )}
      </div>
    </div>
  );
}
