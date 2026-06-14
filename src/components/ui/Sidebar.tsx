"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import MixLabsLogo from "@/components/ui/MixLabsLogo";
import NotificationsBell from "@/components/ui/NotificationsBell";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  User,
  LogOut,
  Plus,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

/* ─── Nav config ────────────────────────────────────────────────── */
const NAV = [
  { href: "/dashboard", label: "Dashboard", sub: "Overview",        icon: LayoutDashboard, key: "dashboard", color: "#818cf8" },
  { href: "/project",   label: "Projects",  sub: "All work",        icon: FolderOpen,      key: "project",   color: "#fb923c" },
  { href: "/review",    label: "Review",    sub: "Client feedback",  icon: MessageSquare,   key: "review",    color: "#34d399" },
  { href: "/member",    label: "Profile",   sub: "Your account",     icon: User,            key: "member",    color: "#c084fc" },
];

/* ─── Component ─────────────────────────────────────────────────── */
export default function Sidebar({
  active,
  userName,
  userInitials,
}: {
  active?: string;
  userName?: string;
  userInitials?: string;
}) {
  const pathname  = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { theme, toggle } = useTheme();

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!mounted) return null;

  /* ══════════════════════════════════════════════════════════
     MOBILE — fixed bottom nav
  ══════════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around
                   border-t border-white/[0.06] backdrop-blur-2xl"
        style={{ background: "var(--bg-sidebar)", paddingBottom: "max(12px, env(safe-area-inset-bottom))", paddingTop: "8px" }}
      >
        {/* First 2 nav items */}
        {NAV.slice(0, 2).map(({ href, label, icon: Icon, key, color }) => {
          const isActive = pathname.startsWith(href) || active === key;
          return (
            <a key={href} href={href} className="flex flex-col items-center gap-1 px-4 pb-1 group">
              <span className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200"
                style={{ background: isActive ? `${color}1a` : "transparent", color: isActive ? color : "rgba(255,255,255,0.28)" }}>
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                {isActive && (
                  <span className="absolute -top-[9px] left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full"
                    style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                )}
              </span>
              <span className="text-[9px] tracking-wider"
                style={{ color: isActive ? color : "rgba(255,255,255,0.25)" }}>{label}</span>
            </a>
          );
        })}

        {/* Centre FAB */}
        <a href="/project" className="flex flex-col items-center gap-1 px-2 -mt-4">
          <span className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center
                           shadow-[0_0_28px_rgba(255,255,255,0.2)] transition-all active:scale-95">
            <Plus size={20} strokeWidth={2.5} className="text-black" />
          </span>
          <span className="text-[9px] tracking-wider text-white/25">New</span>
        </a>

        {/* Last 2 nav items */}
        {NAV.slice(2).map(({ href, label, icon: Icon, key, color }) => {
          const isActive = pathname.startsWith(href) || active === key;
          return (
            <a key={href} href={href} className="flex flex-col items-center gap-1 px-4 pb-1 group">
              <span className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200"
                style={{ background: isActive ? `${color}1a` : "transparent", color: isActive ? color : "rgba(255,255,255,0.28)" }}>
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                {isActive && (
                  <span className="absolute -top-[9px] left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full"
                    style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                )}
              </span>
              <span className="text-[9px] tracking-wider"
                style={{ color: isActive ? color : "rgba(255,255,255,0.25)" }}>{label}</span>
            </a>
          );
        })}
      </nav>
    );
  }

  /* ══════════════════════════════════════════════════════════
     DESKTOP — hover-to-expand sidebar
     Collapsed: 56px  |  Expanded: 220px
     Icon is always px-3 = 12px each side → perfectly centered at 56px
  ══════════════════════════════════════════════════════════ */
  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="relative flex flex-col shrink-0 overflow-hidden border-r border-white/[0.05]"
      style={{
        width: expanded ? 220 : 56,
        minWidth: expanded ? 220 : 56,
        background: "var(--bg-sidebar)",
        transition: "width 260ms cubic-bezier(0.4,0,0.2,1), min-width 260ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >

      {/* ── Logo ── */}
      <div className="flex items-center h-16 px-3 shrink-0">
        {/* Logo bare — 32px wide, centered in 56px collapsed rail */}
        <span className="shrink-0 flex items-center justify-center w-8" style={{ color: "var(--text-1)" }}>
          <MixLabsLogo size={32} />
        </span>
        <div className="ml-3 overflow-hidden"
          style={{ opacity: expanded ? 1 : 0, transition: "opacity 180ms 40ms", whiteSpace: "nowrap" }}>
          <p className="text-[13px] font-semibold leading-tight tracking-wide" style={{ color: "var(--text-1)" }}>MixLabs</p>
          <p className="text-[9px] leading-tight tracking-[0.25em] uppercase" style={{ color: "var(--text-3)" }}>Workspace</p>
        </div>
      </div>

      {/* ── New project button ── */}
      <div className="px-3 mb-3 shrink-0">
        <a href="/project"
          className="flex items-center rounded-xl transition-all duration-200 overflow-hidden group
                     border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.04]"
          style={{ padding: "8px 0" }}>
          <span className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg
                           text-white/40 group-hover:text-white/70 transition-colors">
            <Plus size={15} />
          </span>
          <span className="overflow-hidden whitespace-nowrap text-[12px] text-white/40 group-hover:text-white/70 transition-colors"
            style={{ opacity: expanded ? 1 : 0, transition: "opacity 160ms", maxWidth: expanded ? 160 : 0 }}>
            New Project
          </span>
        </a>
      </div>

      {/* thin rule */}
      <div className="mx-3 mb-2 shrink-0 h-px bg-white/[0.05]" />

      {/* ── Main nav ── */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1 min-h-0">
        {NAV.map(({ href, label, sub, icon: Icon, key, color }) => {
          const isActive = pathname.startsWith(href) || active === key;
          const glow = color + "1a"; // ~10% opacity
          return (
            <a key={href} href={href}
              className="relative flex items-center rounded-xl transition-all duration-200 group overflow-hidden"
              style={{
                padding: "9px 0",
                background: isActive ? glow : "transparent",
              }}
              onMouseEnter={e => { if (!isActive)(e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
              onMouseLeave={e => { if (!isActive)(e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {/* left accent bar */}
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] rounded-r-full"
                style={{
                  height: isActive ? "52%" : 0,
                  background: color,
                  boxShadow: isActive ? `0 0 6px ${color}` : "none",
                  transition: "height 200ms, box-shadow 200ms",
                }} />

              {/* icon — always 32px, px-0 since parent has px-3 */}
              <span className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg transition-colors duration-200"
                style={{
                  background: isActive ? color + "22" : "transparent",
                  color: isActive ? color : "var(--text-3)",
                }}>
                <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
              </span>

              {/* label */}
              <div className="overflow-hidden ml-3"
                style={{ opacity: expanded ? 1 : 0, transition: "opacity 160ms", minWidth: 0, flex: 1 }}>
                <p className="text-[12px] font-medium whitespace-nowrap leading-snug"
                  style={{ color: isActive ? "var(--text-1)" : "var(--text-2)" }}>
                  {label}
                </p>
                <p className="text-[10px] whitespace-nowrap leading-snug" style={{ color: "var(--text-3)" }}>{sub}</p>
              </div>
            </a>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="px-3 pt-2 pb-4 shrink-0 flex flex-col gap-0.5">

        {/* thin rule */}
        <div className="mb-2 h-px bg-white/[0.05]" />

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="relative flex items-center rounded-xl transition-all duration-200 group overflow-hidden w-full"
          style={{ padding: "9px 0" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
        >
          <span className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg
                           text-white/25 group-hover:text-white/60 transition-colors duration-200">
            {theme === "dark" ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
          </span>
          <span className="overflow-hidden ml-3 whitespace-nowrap text-[12px] text-white/40 group-hover:text-white/70 transition-colors"
            style={{ opacity: expanded ? 1 : 0, transition: "opacity 160ms" }}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </button>

        {/* Notifications — live feed popover */}
        <NotificationsBell expanded={expanded} />

        {/* User row + sign out */}
        <div className="flex items-center rounded-xl overflow-hidden" style={{ padding: "8px 0" }}>
          {/* avatar */}
          <span className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg
                           bg-white/[0.08] border border-white/[0.08]
                           text-[11px] font-semibold text-white/60">
            {userInitials ?? "U"}
          </span>

          {/* name — only in expanded */}
          <div className="overflow-hidden ml-3 flex-1"
            style={{ opacity: expanded ? 1 : 0, transition: "opacity 160ms", minWidth: 0 }}>
            <p className="text-[11px] text-white/50 whitespace-nowrap truncate leading-snug">
              {userName ?? "User"}
            </p>
            <p className="text-[9px] text-white/20 whitespace-nowrap leading-snug">MixLabs Studio</p>
          </div>

          {/* sign out — only in expanded */}
          {expanded && (
            <button onClick={signOut}
              className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0
                         text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all duration-200"
              title="Sign out">
              <LogOut size={13} />
            </button>
          )}
        </div>

        {/* Sign out when collapsed (standalone) */}
        {!expanded && (
          <button onClick={signOut}
            className="flex items-center rounded-xl transition-all duration-200 group overflow-hidden"
            style={{ padding: "9px 0" }}
            title="Sign out"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            <span className="w-8 h-8 flex items-center justify-center rounded-lg
                             text-white/20 group-hover:text-white/50 transition-colors duration-200">
              <LogOut size={15} strokeWidth={1.5} />
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
