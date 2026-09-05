"use client";

import React, { useEffect, useState } from "react";
import { DailyBriefingData } from "@/lib/briefing/dailyBriefing";
import {
  Sparkles,
  AlertTriangle,
  Clock,
  FileText,
  CheckCircle2,
  Calendar,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Sun,
  Sunset,
  Moon
} from "lucide-react";
import Link from "next/link";

export default function DailyBriefingCard() {
  const [briefing, setBriefing] = useState<DailyBriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/briefing");
      const data = await res.json();
      if (data.success && data.briefing) {
        setBriefing(data.briefing);
      } else {
        throw new Error(data.error || "Failed to load briefing");
      }
    } catch (err: any) {
      console.warn("Briefing error:", err);
      setError(err.message || "Failed to load briefing");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  const getGreetingIcon = (greetingStr: string) => {
    if (greetingStr.includes("Morning")) return <Sun className="w-5 h-5 text-amber-400" />;
    if (greetingStr.includes("Afternoon")) return <Sunset className="w-5 h-5 text-amber-400" />;
    return <Moon className="w-5 h-5 text-sky-400" />;
  };

  if (isLoading) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-800 rounded-lg" />
          <div className="h-4 w-24 bg-slate-800 rounded-lg" />
        </div>
        <div className="h-16 bg-slate-950/60 rounded-2xl border border-slate-850" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="h-28 bg-slate-950/60 rounded-2xl" />
          <div className="h-28 bg-slate-950/60 rounded-2xl" />
          <div className="h-28 bg-slate-950/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-300">Clarion Daily Briefing</h3>
          <p className="text-xs text-slate-500">Your workspace is up to date.</p>
        </div>
        <button
          onClick={fetchBriefing}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-750 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Sync</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-clarion-950/40 border border-slate-800 shadow-xl space-y-5">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-clarion-950 border border-clarion-800/60 flex items-center justify-center shrink-0">
            {getGreetingIcon(briefing.greeting)}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>👋 {briefing.greeting}{briefing.userName ? `, ${briefing.userName}` : ""}</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Here is your Clarion Daily Briefing.
            </p>
          </div>
        </div>

        <button
          onClick={fetchBriefing}
          className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all text-xs font-semibold flex items-center gap-1.5 shrink-0"
          title="Refresh Daily Briefing"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* AI / Workspace Summary Banner */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-clarion-500/20 flex items-start gap-3 shadow-inner">
        <Sparkles className="w-4 h-4 text-clarion-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-clarion-400 uppercase tracking-wider">
              {briefing.isAiGenerated ? "AI Copilot Intelligence Summary" : "Workspace Briefing Summary"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Updated {new Date(briefing.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
            &ldquo;{briefing.summary}&rdquo;
          </p>
        </div>
      </div>

      {/* Briefing Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Section 1: Needs Attention */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-850 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-rose-400">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Needs Attention</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[10px]">
                {briefing.needsAttention.length}
              </span>
            </div>

            {briefing.needsAttention.length === 0 ? (
              <div className="py-4 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">
                  Nothing urgent requires your attention right now.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {briefing.needsAttention.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900/90 border border-rose-500/20 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-100 truncate">{item.title}</span>
                      {item.amount && (
                        <span className="text-xs font-bold text-emerald-400 shrink-0">
                          ${item.amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                    {item.dueDate && (
                      <span className="text-[10px] text-rose-400 font-bold block">
                        Due: {item.dueDate}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/dashboard/tasks"
            className="text-[11px] text-clarion-400 hover:text-clarion-300 font-semibold inline-flex items-center gap-1 pt-2 border-t border-slate-850"
          >
            <span>Manage Tasks ({briefing.stats.pendingTasks})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Section 2: Upcoming */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-850 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Upcoming</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px]">
                {briefing.stats.upcomingDeadlines + briefing.upcoming.length}
              </span>
            </div>

            {briefing.upcoming.length === 0 && briefing.stats.upcomingDeadlines === 0 ? (
              <div className="py-4 text-center space-y-1">
                <Calendar className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No upcoming deadlines.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                    <span>Approaching Deadlines</span>
                    <strong className="text-amber-400">{briefing.stats.upcomingDeadlines}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                    <span>Pending Tasks</span>
                    <strong className="text-clarion-300">{briefing.stats.pendingTasks}</strong>
                  </div>
                </div>

                {briefing.upcoming.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 block truncate">{item.title}</span>
                    {item.date && <span className="text-[10px] text-amber-400 font-medium block">Date: {item.date}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/dashboard/tasks"
            className="text-[11px] text-clarion-400 hover:text-clarion-300 font-semibold inline-flex items-center gap-1 pt-2 border-t border-slate-850"
          >
            <span>View Timeline</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Section 3: Document Insights */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-850 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-sky-400">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Document Insights</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 text-[10px]">
                {briefing.stats.totalDocuments} Total
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Searchable RAG Index</span>
                  <strong className="text-emerald-400">{briefing.stats.indexedDocuments} / {briefing.stats.totalDocuments}</strong>
                </div>
              </div>

              {briefing.documentInsights.map((insight, idx) => (
                <p key={idx} className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-850 leading-relaxed">
                  • {insight}
                </p>
              ))}
            </div>
          </div>

          <Link
            href="/dashboard/upload"
            className="text-[11px] text-clarion-400 hover:text-clarion-300 font-semibold inline-flex items-center gap-1 pt-2 border-t border-slate-850"
          >
            <span>Upload New Document</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
