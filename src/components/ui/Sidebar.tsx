"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, MessageSquare, User, LogOut } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/project",   label: "Projects",  icon: FolderOpen,      key: "project"   },
  { href: "/review",    label: "Review",    icon: MessageSquare,   key: "review"    },
  { href: "/member",    label: "Profile",   icon: User,            key: "member"    },
];

export default function Sidebar({ active }: { active?: string }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  // Don't render until JS runs so we know the real screen size
  if (!mounted) return null;

  if (isMobile) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-1 pt-2 border-t border-white/[0.07] bg-[#0A0A0A]/98 backdrop-blur-xl"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        {NAV.map(({ href, label, icon: Icon, key }) => {
          const isActive = pathname.startsWith(href) || active === key;
          return (
            <a key={href} href={href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all ${
                isActive ? "text-white" : "text-white/30"
              }`}>
              <Icon size={20} />
              <span className="text-[9px] tracking-wide font-light">{label}</span>
            </a>
          );
        })}
        <button onClick={signOut}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-white/30 transition-all">
          <LogOut size={20} />
          <span className="text-[9px] tracking-wide font-light">Out</span>
        </button>
      </nav>
    );
  }

  return (
    <aside className="w-16 flex flex-col items-center py-6 gap-2 border-r border-white/5 shrink-0">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white mb-4">
        ML
      </div>
      {NAV.map(({ href, label, icon: Icon, key }) => {
        const isActive = pathname.startsWith(href) || active === key;
        return (
          <a key={href} href={href} title={label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive ? "bg-white/10 text-white" : "text-white/20 hover:text-white/50 hover:bg-white/5"
            }`}>
            <Icon size={16} />
          </a>
        );
      })}
      <div className="flex-1" />
      <button onClick={signOut} title="Sign out"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-all">
        <LogOut size={16} />
      </button>
    </aside>
  );
}
