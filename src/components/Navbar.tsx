"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Sparkles, Cpu, LogOut, Menu, X } from "lucide-react";

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      router.push("/login");
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white md:hidden cursor-pointer flex items-center justify-center transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-clarion-700 via-clarion-500 to-sky-400 flex items-center justify-center shadow-lg shadow-clarion-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Clarion <span className="text-clarion-400 font-extrabold">AI</span>
              </span>
              <span className="text-[9px] sm:text-[10px] tracking-wider uppercase text-slate-400 block -mt-1 font-medium">
                AI Life & Admin Copilot
              </span>
            </div>
          </Link>
        </div>

        {/* Status Indicators & Navigation Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Privacy First Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy-First Architecture</span>
          </div>

          {/* Active AI Engine Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>Human-in-the-Loop AI Engine</span>
          </div>

          {/* Authenticated User info & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-2 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium">
              <div className="w-6 h-6 rounded-full bg-clarion-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              <span className="hidden md:inline font-semibold">{user?.name || "Workspace User"}</span>
            </div>

            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 sm:px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors flex items-center gap-1 text-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px] font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
