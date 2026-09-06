"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  UploadCloud,
  CheckSquare,
  History,
  Settings,
  Shield,
  X,
  Sparkles
} from "lucide-react";
import { clsx } from "clsx";

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onCloseMobile
}) => {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Overview & attention items"
    },
    {
      name: "🤖 AI Copilot",
      href: "/dashboard/copilot",
      icon: Bot,
      description: "Intelligent chat assistant"
    },
    {
      name: "Upload Document",
      href: "/dashboard/upload",
      icon: UploadCloud,
      description: "Analyze new notices/bills"
    },
    {
      name: "Tasks & Deadlines",
      href: "/dashboard/tasks",
      icon: CheckSquare,
      description: "Human-verified action items"
    },
    {
      name: "Audit & Activity",
      href: "/dashboard/audit",
      icon: History,
      description: "Transparent AI decision trail"
    },
    {
      name: "Settings & AI Config",
      href: "/dashboard/settings",
      icon: Settings,
      description: "Keys & privacy preferences"
    }
  ];

  const renderNavList = (onItemClick?: () => void) => (
    <div className="space-y-1">
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Core Workspace
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onItemClick && onItemClick()}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
              isActive
                ? "bg-clarion-600/20 text-clarion-300 border border-clarion-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent"
            )}
          >
            <Icon
              className={clsx(
                "w-4 h-4 transition-colors shrink-0",
                isActive ? "text-clarion-400" : "text-slate-500 group-hover:text-slate-300"
              )}
            />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );

  const renderGuarantees = () => (
    <div className="pt-4 border-t border-slate-800/80 space-y-3">
      <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Guarantees
      </div>

      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>Zero Hallucination Policy</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Clarion AI highlights uncertainties and never executes external actions without your explicit 1-click human verification.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on md and up) */}
      <aside className="w-64 shrink-0 hidden md:block border-r border-slate-800 bg-slate-950/60 p-4 space-y-6">
        {renderNavList()}
        {renderGuarantees()}
      </aside>

      {/* Mobile Sidebar Drawer (visible on < md when isMobileOpen is true) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer container */}
          <aside className="relative z-10 w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 p-4 space-y-6 flex flex-col justify-between h-full shadow-2xl overflow-y-auto">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-clarion-700 to-sky-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-white">
                    Clarion <span className="text-clarion-400">AI</span>
                  </span>
                </div>
                <button
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Nav Links */}
              {renderNavList(onCloseMobile)}
            </div>

            {/* Mobile Guarantees Box */}
            {renderGuarantees()}
          </aside>
        </div>
      )}
    </>
  );
};
