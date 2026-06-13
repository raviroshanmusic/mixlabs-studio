"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  User,
  LogOut,
  Bell,
  Settings,
  Plus,
  ChevronRight,
} from "lucide-react";

/* ── Nav definition ──────────────────────────────────────────────── */
const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    sub: "Overview & stats",
    icon: LayoutDashboard,
    key: "dashboard",
    color: "#818cf8",          // indigo
    glow: "rgba(129,140,248,0.18)",
  },
  {
    href: "/project",
    label: "Projects",
    sub: "All your work",
    icon: FolderOpen,
    key: "project",
    color: "#fb923c",          // amber-orange
    glow: "rgba(251,146,60,0.18)",
  },
  {
    href: "/review",
    label: "Review",
    sub: "Client feedback",
    icon: MessageSquare,
    key: "review",
    color: "#34d399",          // emerald
    glow: "rgba(52,211,153,0.18)",
    badge: 0,                  // set > 0 to show badge
  },
];

const NAV_UTILITY = [
  {
    href: "/member",
    label: "Profile",
    sub: "Your account",
    icon: User,
    key: "member",
    color: "#c084fc",          // purple
    glow: "rgba(192,132,252,0.18)",
  },
];

/* ── Component ───────────────────────────────────────────────────── */
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

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!mounted) return null;

  /* ── MOBILE bottom nav ─────────────────────────────────────────── */
  if (isMobile) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around
                   border-t border-white/[0.06] bg-[#060606]/95 backdrop-blur-2xl"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))", paddingTop: "10px" }}
      >
        {/* Left two nav items */}
        {NAV.slice(0, 2).map(({ href, label, icon: Icon, key, color }) => {
          const isActive = pathname.startsWith(href) || active === key;
          return (
            <a key={href} href={href}
              className="relative flex flex-col items-center gap-[5px] px-3 pb-1 group">
              {/* active dot above */}
              <span
                className="absolute -top-[10px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-all duration-300"
                style={{ background: isActive ? color : "transparent",
                         boxShadow: isActive ? `0 0 6px ${color}` : "none" }}
              />
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: isActive ? `${color}18` : "transparent",
                  color: isActive ? color : "rgba(255,255,255,0.3)",
                }}>
                <Icon size={18} />
              </span>
              <span className="text-[9px] tracking-wide font-light"
                style={{ color: isActive ? color : "rgba(255,255,255,0.3)" }}>
                {label}
              </span>
            </a>
          );
        })}

        {/* Center FAB — Quick Create */}
        <a href="/project"
          className="flex flex-col items-center gap-[5px] px-3 pb-1">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center -mt-4
                           bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.25)]
                           transition-all duration-200 active:scale-95">
            <Plus size={20} strokeWidth={2.5} />
          </span>
          <span className="text-[9px] tracking-wide font-light text-white/20">New</span>
        </a>

        {/* Right two nav items */}
        {[NAV[2], NAV_UTILITY[0]].map(({ href, label, icon: Icon, key, color, badge }: any) => {
          const isActive = pathname.startsWith(href) || active === key;
          return (
            <a key={href} href={href}
              className="relative flex flex-col items-center gap-[5px] px-3 pb-1">
              <span
                className="absolute -top-[10px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-all duration-300"
                style={{ background: isActive ? color : "transparent",
                         boxShadow: isActive ? `0 0 6px ${color}` : "none" }}
              />
              <span
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: isActive ? `${color}18` : "transparent",
                  color: isActive ? color : "rgba(255,255,255,0.3)",
                }}>
                <Icon size={18} />
                {badge > 0 && (
                  <span className="absolute top-1 right-1 w-[7px] h-[7px] rounded-full bg-[#34d399]
                                   ring-1 ring-black" />
                )}
              </span>
              <span className="text-[9px] tracking-wide font-light"
                style={{ color: isActive ? color : "rgba(255,255,255,0.3)" }}>
                {label}
              </span>
            </a>
          );
        })}
      </nav>
    );
  }

  /* ── DESKTOP expandable sidebar ────────────────────────────────── */
  const w = expanded ? "224px" : "56px";

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="relative flex flex-col shrink-0 border-r border-white/[0.05] bg-[#060606] overflow-hidden"
      style={{
        width: w,
        minWidth: w,
        transition: "width 280ms cubic-bezier(0.4,0,0.2,1), min-width 280ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* subtle vertical gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />

      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-3 pt-5 pb-5">
        <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center
                         text-[10px] font-black text-black shrink-0
                         shadow-[0_0_20px_rgba(255,255,255,0.15)]">
          ML
        </span>
        <div className="overflow-hidden" style={{ opacity: expanded ? 1 : 0, transition: "opacity 200ms" }}>
          <p className="text-[11px] font-semibold text-white whitespace-nowrap tracking-wide">MixLabs</p>
          <p className="text-[9px] text-white/30 whitespace-nowrap tracking-wider uppercase">Studio OS</p>
        </div>
      </div>

      {/* ── Quick Create ── */}
      <div className="px-2 mb-4">
        <a href="/project"
          className="flex items-center gap-3 rounded-xl overflow-hidden group cursor-pointer
                     transition-all duration-200 hover:bg-white/[0.06]"
          style={{ padding: expanded ? "8px 10px" : "8px 10px" }}>
          <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0
                           group-hover:bg-white/20 transition-all duration-200">
            <Plus size={14} className="text-white/60 group-hover:text-white transition-colors" />
          </span>
          <span className="overflow-hidden whitespace-nowrap text-[12px] font-medium text-white/50
                           group-hover:text-white/80 transition-colors"
            style={{ opacity: expanded ? 1 : 0, transition: "opacity 180ms" }}>
            Quick Create
          </span>
        </a>
      </div>

      {/* ── Divider ── */}
      <div className="mx-3 mb-3 h-px bg-white/[0.05]" />

      {/* ── Main nav ── */}
      <nav className="flex flex-col gap-1 px-2 flex-1">
        {NAV.map(({ href, label, sub, icon: Icon, key, color, glow, badge }: any) => {
          const isActive = pathname.startsWith(href) || active === key;
          return (
            <a key={href} href={href}
              className="relative flex items-center gap-3 rounded-xl overflow-hidden
                         transition-all duration-200 group"
              style={{
                padding: "9px 10px",
                background: isActive ? glow : "transparent",
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {/* active left bar */}
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300"
                style={{
                  height: isActive ? "60%" : "0%",
                  background: color,
                  boxShadow: isActive ? `0 0 8px ${color}` : "none",
                }}
              />

              {/* icon */}
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 relative"
                style={{
                  background: isActive ? `${color}22` : "transparent",
                  color: isActive ? color : "rgba(255,255,255,0.25)",
                }}>
                <Icon size={15} />
                {badge > 0 && (
                  <span className="absolute top-[5px] right-[5px] w-[6px] h-[6px] rounded-full bg-[#34d399]
                                   ring-1 ring-[#060606]" />
                )}
              </span>

              {/* label + sub */}
              <div className="overflow-hidden"
                style={{ opacity: expanded ? 1 : 0, transition: "opacity 180ms", minWidth: 0 }}>
                <p className="text-[12px] font-medium whitespace-nowrap leading-tight"
                  style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.5)" }}>
                  {label}
                </p>
                <p className="text-[10px] whitespace-nowrap text-white/20 leading-tight mt-[1px]">
                  {sub}
                </p>
              </div>

              {/* chevron on hover */}
              {expanded && (
                <ChevronRight size={12} className="ml-auto shrink-0 opacity-0 group-hover:opacity-30
                                                   transition-opacity text-white" />
              )}
            </a>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="px-2 pb-4 flex flex-col gap-1">

        {/* Notification bell */}
        <button
          className="flex items-center gap-3 rounded-xl transition-all duration-200 hover:bg-white/[0.04] group"
          style={{ padding: "9px 10px" }}
        >
          <span className="relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                           text-white/20 group-hover:text-white/50 transition-colors">
            <Bell size={15} />
            {/* live badge placeholder */}
            <span className="absolute top-[5px] right-[5px] w-[6px] h-[6px] rounded-full bg-[#f59e0b]
                             ring-1 ring-[#060606]" />
          </span>
          <span className="overflow-hidden whitespace-nowrap text-[12px] text-white/30
                           group-hover:text-white/60 transition-colors"
            style={{ opacity: expanded ? 1 : 0, transition: "opacity 180ms" }}>
            Notifications
          </span>
        </button>

        {/* Settings → member page */}
        {NAV_UTILITY.map(({ href, label, sub, icon: Icon, key, color, glow }: any) => {
          const isActive = pathname.startsWith(href) || active === key;
          return (
            <a key={href} href={href}
              className="relative flex items-center gap-3 rounded-xl overflow-hidden
                         transition-all duration-200 group"
              style={{ padding: "9px 10px", background: isActive ? glow : "transparent" }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300"
                style={{ height: isActive ? "60%" : "0%", background: color, boxShadow: isActive ? `0 0 8px ${color}` : "none" }}
              />
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                style={{ background: isActive ? `${color}22` : "transparent", color: isActive ? color : "rgba(255,255,255,0.25)" }}>
                <Icon size={15} />
              </span>
              <div className="overflow-hidden" style={{ opacity: expanded ? 1 : 0, transition: "opacity 180ms" }}>
                <p className="text-[12px] font-medium whitespace-nowrap leading-tight"
                  style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.5)" }}>{label}</p>
                <p className="text-[10px] whitespace-nowrap text-white/20 leading-tight mt-[1px]">{sub}</p>
              </div>
            </a>
          );
        })}

        {/* Divider */}
        <div className="mx-1 my-1 h-px bg-white/[0.05]" />

        {/* User avatar + sign out */}
        <div className="flex items-center gap-3 rounded-xl px-[10px] py-[9px]">
          {/* avatar */}
          <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center
                           text-[11px] font-bold text-white/60 shrink-0 border border-white/[0.08]">
            {userInitials ?? "U"}
          </span>
          <div className="flex-1 overflow-hidden" style={{ opacity: expanded ? 1 : 0, transition: "opacity 180ms" }}>
            <p className="text-[11px] font-medium text-white/60 whitespace-nowrap truncate leading-tight">
              {userName ?? "User"}
            </p>
            <p className="text-[9px] text-white/20 whitespace-nowrap leading-tight">MixLabs Studio</p>
          </div>
          {/* logout */}
          {expanded && (
            <button onClick={signOut}
              className="w-7 h-7 rounded-lg flex items-center justify-center
                         text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all shrink-0">
              <LogOut size={13} />
            </button>
          )}
        </div>
        {/* logout when collapsed */}
        {!expanded && (
          <button onClick={signOut}
            className="flex items-center justify-center rounded-xl transition-all duration-200
                       hover:bg-white/[0.04] mx-1"
            style={{ padding: "9px 10px" }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center
                             text-white/20 hover:text-white/40 transition-colors">
              <LogOut size={15} />
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
