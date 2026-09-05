"use client";

import React, { useState, useEffect } from "react";
import { DeadlineInsight } from "@/lib/briefing/deadlineIntelligence";
import {
  AlertTriangle,
  Clock,
  FileText,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  XCircle,
  Loader2,
  Zap,
  DollarSign
} from "lucide-react";
import Link from "next/link";

interface UpcomingObligationsSectionProps {
  onActionComplete?: () => void;
}

export default function UpcomingObligationsSection({ onActionComplete }: UpcomingObligationsSectionProps) {
  const [insights, setInsights] = useState<DeadlineInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeConfirmId, setActiveConfirmId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const fetchObligations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/dashboard/obligations");
      const data = await res.json();
      if (data.success && data.insights) {
        setInsights(data.insights);
      }
    } catch (err) {
      console.error("[UpcomingObligations] Error loading insights:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchObligations();
  }, []);

  const handleInitiateAction = (id: string) => {
    setActiveConfirmId(id);
    setErrorMap((prev) => ({ ...prev, [id]: "" }));
  };

  const handleCancelAction = () => {
    setActiveConfirmId(null);
  };

  const handleConfirmAction = async (item: DeadlineInsight) => {
    if (executingId === item.id || completedIds.has(item.id)) return;

    setExecutingId(item.id);
    setErrorMap((prev) => ({ ...prev, [item.id]: "" }));

    try {
      const res = await fetch("/api/copilot/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM",
          sessionId: "dashboard-session",
          pendingAction: {
            id: `action-${item.id}`,
            actionType: item.actionType || "CREATE_TASK",
            toolName: item.actionType === "COMPLETE_TASK" ? "completeTask" : "createTask",
            args: { ...item.actionArgs },
            confirmationMessage: `Action: ${item.title}\nReason: ${item.description}`,
            timestamp: new Date().toISOString(),
            documentId: item.sourceDocumentId,
            documentTitle: item.sourceDocumentTitle
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCompletedIds((prev) => new Set(prev).add(item.id));
        setActiveConfirmId(null);
        if (onActionComplete) onActionComplete();
      } else {
        throw new Error(data.error || "Action execution failed.");
      }
    } catch (err: any) {
      setErrorMap((prev) => ({ ...prev, [item.id]: err.message || "Failed to confirm action." }));
    } finally {
      setExecutingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 text-center text-slate-500 text-xs animate-pulse">
        Evaluating proactive deadline & obligation intelligence...
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>No urgent obligations or upcoming deadlines. Your workspace is fully up to date.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Upcoming & Needs Attention</span>
          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            {insights.length} Obligation{insights.length > 1 ? "s" : ""}
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((item) => {
          const isConfirming = activeConfirmId === item.id;
          const isExecuting = executingId === item.id;
          const isCompleted = completedIds.has(item.id);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-slate-900/80 border transition-all space-y-3 ${
                isCompleted
                  ? "border-emerald-500/40 bg-emerald-950/20"
                  : isConfirming
                  ? "border-amber-500/60 ring-1 ring-amber-500/30"
                  : item.urgency === "CRITICAL"
                  ? "border-rose-500/40 hover:border-rose-500/60"
                  : item.urgency === "HIGH"
                  ? "border-amber-500/40 hover:border-amber-500/60"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {/* Card Header: Urgency & Countdown Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      item.urgency === "CRITICAL"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                        : item.urgency === "HIGH"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : item.urgency === "MEDIUM"
                        ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                        : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    }`}
                  >
                    {item.urgency}
                  </span>

                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {item.daysRemaining < 0
                      ? `Overdue by ${Math.abs(item.daysRemaining)} day(s)`
                      : item.daysRemaining === 0
                      ? "Due Today"
                      : `Due in ${item.daysRemaining} day(s)`}
                  </span>
                </div>

                {item.amount && (
                  <span className="text-xs font-extrabold text-emerald-400 flex items-center">
                    <DollarSign className="w-3 h-3" />
                    {item.amount.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white tracking-tight">{item.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{item.description}</p>
              </div>

              {/* Step 1: Normal View */}
              {!isConfirming && !isCompleted && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  {item.sourceDocumentId && item.sourceDocumentTitle ? (
                    <Link
                      href={`/dashboard/documents/${item.sourceDocumentId}`}
                      className="text-[11px] font-semibold text-clarion-400 hover:underline flex items-center gap-1 truncate max-w-[180px]"
                    >
                      <FileText className="w-3 h-3 text-clarion-400 shrink-0" />
                      <span className="truncate">{item.sourceDocumentTitle}</span>
                    </Link>
                  ) : (
                    <span className="text-[11px] text-slate-500">Workspace Task</span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleInitiateAction(item.id)}
                    className="text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-500 px-3 py-1 rounded-lg flex items-center gap-1 transition-all shadow-md cursor-pointer shrink-0"
                  >
                    <span>Take Action</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Step 2: Step 9 Confirmation View */}
              {isConfirming && (
                <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-2 text-xs animate-fadeIn">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Confirm Action Execution
                  </div>

                  <div className="text-slate-300 space-y-1 text-[11px]">
                    <div><strong className="text-slate-400">Action:</strong> {item.suggestedAction}</div>
                    <div><strong className="text-slate-400">Priority:</strong> {item.urgency}</div>
                  </div>

                  {errorMap[item.id] && (
                    <div className="text-rose-400 text-[11px] flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      <span>{errorMap[item.id]}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={() => handleConfirmAction(item)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow cursor-pointer"
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Confirm</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isExecuting}
                      onClick={handleCancelAction}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-semibold hover:bg-slate-700 transition-all border border-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Success View */}
              {isCompleted && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Action Confirmed & Task Created
                  </span>
                  <Link href="/dashboard/tasks" className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
                    <span>View Tasks</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
