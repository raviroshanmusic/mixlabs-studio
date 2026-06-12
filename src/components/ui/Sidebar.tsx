"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, FolderOpen, MessageSquare, User, LogOut } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/project", label: "Projects", icon: FolderOpen, key: "project" },
  { href: "/review", label: "Review Room", icon: MessageSquare, key: "review" },
  { href: "/member", label: "Profile", icon: User, key: "member" },
];

export default function Sidebar({ active }: { active?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-16 flex flex-col items-center py-6 gap-2 border-r border-white/5 shrink-0">
      {/* Logo */}
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white mb-4">
        ML
      </div>

      {NAV.map(({ href, label, icon: Icon, key }) => {
        const isActive = pathname.startsWith(href) || active === key;
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive ? "bg-white/10 text-white" : "text-white/20 hover:text-white/50 hover:bg-white/5"
            }`}
          >
            <Icon size={16} />
          </Link>
        );
      })}

      <div className="flex-1" />

      <button
        onClick={signOut}
        title="Sign out"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white/20 hover:text-white/50 hover:bg-white/5 transition-all"
      >
        <LogOut size={16} />
      </button>
    </aside>
  );
}
