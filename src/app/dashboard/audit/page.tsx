"use client";

import React, { useEffect, useState } from "react";
import { History, Cpu, User } from "lucide-react";
import { AuditRecord } from "@/lib/types";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/audit");
      const data = await res.json();
      if (data.success) {
        setLogs(data.auditLogs);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <History className="w-7 h-7 text-clarion-400" />
          <span>Audit Trail & Activity Log</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Complete transparent ledger of AI decisions, document extractions, and human verification overrides.
        </p>
      </div>

      {/* Audit List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">
          Loading audit records...
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <History className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No activity recorded yet</h3>
        </div>
      ) : (
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Action Event & Details</span>
            <span>Actor & Timestamp</span>
          </div>

          <div className="space-y-4">
            {logs.map((log) => {
              const isAI = log.actor === "AI_SYSTEM";

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs min-w-0"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isAI
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {isAI ? <Cpu className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
                        {/* Event Action Label - Never Truncated */}
                        <span className="font-bold text-white uppercase text-[11px] tracking-wider shrink-0">
                          {log.action.replace(/_/g, " ")}
                        </span>

                        {/* Document Name - Truncated with CSS Ellipsis & Native Hover Tooltip */}
                        {log.documentTitle && (
                          <div
                            className="flex items-center gap-1.5 text-slate-400 text-[11px] min-w-0 max-w-[200px] sm:max-w-[280px] md:max-w-[380px] lg:max-w-[480px]"
                            title={`Document: ${log.documentTitle}`}
                          >
                            <span className="shrink-0 text-slate-600">•</span>
                            <span className="shrink-0 text-slate-400 font-medium">Doc:</span>
                            <strong className="text-slate-200 truncate font-semibold">
                              {log.documentTitle}
                            </strong>
                          </div>
                        )}
                      </div>

                      <p className="text-slate-300 leading-relaxed font-mono text-[11px] break-words">
                        {log.details}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 self-end sm:self-center">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        isAI ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {log.actor}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1 font-mono">
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
