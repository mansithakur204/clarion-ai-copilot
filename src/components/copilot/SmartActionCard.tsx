"use client";

import React, { useState } from "react";
import { SmartRecommendation } from "@/lib/agent/types";
import {
  FileText,
  ArrowRight,
  Zap,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Loader2,
  Check
} from "lucide-react";
import Link from "next/link";

interface SmartActionCardProps {
  recommendations?: SmartRecommendation[];
  onTakeAction?: (recommendation: SmartRecommendation) => void;
  onActionComplete?: (recommendation: SmartRecommendation, result: any) => void;
}

type ActionStep = "RECOMMENDED" | "CONFIRMING" | "EXECUTING" | "COMPLETED" | "CANCELLED";

interface CardState {
  step: ActionStep;
  executedTitle?: string;
  error?: string;
}

export default function SmartActionCard({
  recommendations,
  onTakeAction,
  onActionComplete
}: SmartActionCardProps) {
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});

  if (!recommendations || recommendations.length === 0) return null;

  const updateState = (id: string, newState: Partial<CardState>) => {
    setCardStates((prev) => {
      const current = prev[id] || { step: "RECOMMENDED" };
      return {
        ...prev,
        [id]: {
          ...current,
          ...newState
        }
      };
    });
  };

  const handleInitiateConfirmation = (rec: SmartRecommendation) => {
    updateState(rec.id, { step: "CONFIRMING", error: undefined });
    if (onTakeAction) {
      onTakeAction(rec);
    }
  };

  const handleCancelConfirmation = (rec: SmartRecommendation) => {
    updateState(rec.id, { step: "CANCELLED" });
  };

  const handleConfirmAction = async (rec: SmartRecommendation) => {
    const currentState = cardStates[rec.id];
    if (currentState?.step === "EXECUTING" || currentState?.step === "COMPLETED") {
      return; // Prevent duplicate clicks
    }

    updateState(rec.id, { step: "EXECUTING", error: undefined });

    try {
      const res = await fetch("/api/copilot/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM",
          sessionId: "dashboard-session",
          pendingAction: {
            id: `action-${rec.id}`,
            actionType: rec.actionType || "CREATE_TASK",
            toolName: rec.actionType === "COMPLETE_TASK" ? "completeTask" : "createTask",
            args: {
              title: rec.actionArgs?.title || rec.title,
              description: rec.reason,
              priority: rec.priority || "HIGH",
              dueDate: rec.dueDate || "Tomorrow",
              documentId: rec.sourceDocumentId,
              taskId: rec.actionArgs?.taskId
            },
            confirmationMessage: `Action: ${rec.title}\nReason: ${rec.reason}`,
            timestamp: new Date().toISOString(),
            documentId: rec.sourceDocumentId,
            documentTitle: rec.sourceDocumentTitle
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const title = data.executedRecord?.title || rec.actionArgs?.title || rec.title;
        updateState(rec.id, {
          step: "COMPLETED",
          executedTitle: title
        });
        if (onActionComplete) {
          onActionComplete(rec, data.executedRecord);
        }
      } else {
        throw new Error(data.error || "Action execution failed.");
      }
    } catch (err: any) {
      updateState(rec.id, {
        step: "CONFIRMING",
        error: err.message || "Failed to execute action."
      });
    }
  };

  return (
    <div className="w-full max-w-[85%] mt-2 space-y-3">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
        <Zap className="w-4 h-4 text-amber-400" />
        <span>Smart Decision & Action Recommendations</span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => {
          const state = cardStates[rec.id] || { step: rec.status === "COMPLETED" ? "COMPLETED" : "RECOMMENDED" };

          return (
            <div
              key={rec.id}
              className={`p-4 rounded-2xl bg-slate-900/95 border transition-all shadow-xl space-y-3 ${
                state.step === "COMPLETED"
                  ? "border-emerald-500/40 bg-emerald-950/20"
                  : state.step === "CONFIRMING" || state.step === "EXECUTING"
                  ? "border-amber-500/60 ring-1 ring-amber-500/30"
                  : "border-amber-500/30 hover:border-amber-500/50"
              }`}
            >
              {/* Header: Title & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {state.step === "COMPLETED" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : state.step === "CONFIRMING" || state.step === "EXECUTING" ? (
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    {rec.title}
                  </h4>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {state.step === "COMPLETED" && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Completed
                    </span>
                  )}

                  {state.step === "CANCELLED" && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      Cancelled
                    </span>
                  )}

                  {state.step !== "COMPLETED" && rec.priority && (
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        rec.priority === "URGENT"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : rec.priority === "HIGH"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {rec.priority}
                    </span>
                  )}
                </div>
              </div>

              {/* Why Details */}
              <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                <span className="font-semibold text-amber-300/90 block mb-0.5">Why:</span>
                <p>{rec.reason}</p>
              </div>

              {/* STEP 1: RECOMMENDED VIEW */}
              {state.step === "RECOMMENDED" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 flex-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-emerald-300 font-medium">
                      {rec.suggestedAction}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rec.sourceDocumentId && rec.sourceDocumentTitle && (
                      <Link
                        href={`/dashboard/documents/${rec.sourceDocumentId}`}
                        className="text-[11px] font-semibold text-clarion-400 hover:text-clarion-300 bg-clarion-950/80 hover:bg-clarion-900 border border-clarion-500/30 px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <FileText className="w-3 h-3 text-clarion-400" />
                        <span className="truncate max-w-[140px]">{rec.sourceDocumentTitle}</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => handleInitiateConfirmation(rec)}
                      className="text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-500 px-3 py-1 rounded-lg flex items-center gap-1 transition-all shadow-md cursor-pointer shrink-0"
                    >
                      <span>Take Action</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CONFIRMATION VIEW (Human-in-the-loop controls) */}
              {(state.step === "CONFIRMING" || state.step === "EXECUTING") && (
                <div className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Human Confirmation Required Before Execution
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-300">
                    <div>
                      <strong className="text-slate-400">What will happen:</strong>{" "}
                      <span className="text-white font-medium">{rec.suggestedAction}</span>
                    </div>
                    <div>
                      <strong className="text-slate-400">Exact Task to Create:</strong>{" "}
                      <span className="text-clarion-300 font-semibold">{rec.actionArgs?.title || rec.title}</span>
                      {rec.dueDate && <span className="text-slate-400 ml-2">(Due: {rec.dueDate})</span>}
                    </div>
                    {rec.sourceDocumentTitle && (
                      <div>
                        <strong className="text-slate-400">Source Document:</strong>{" "}
                        <span className="text-clarion-400">{rec.sourceDocumentTitle}</span>
                      </div>
                    )}
                  </div>

                  {state.error && (
                    <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{state.error}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={state.step === "EXECUTING"}
                      onClick={() => handleConfirmAction(rec)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      {state.step === "EXECUTING" ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing Action...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Action</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={state.step === "EXECUTING"}
                      onClick={() => handleCancelConfirmation(rec)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-all border border-slate-700 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: SUCCESS STATE VIEW */}
              {state.step === "COMPLETED" && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Action Successfully Executed & Persisted
                    </span>
                    <Link
                      href="/dashboard/tasks"
                      className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>View in Tasks</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <p className="text-slate-300 text-[11px]">
                    Created workspace task: <strong className="text-white">&quot;{state.executedTitle || rec.title}&quot;</strong>. State updated and duplicate requests disabled.
                  </p>
                </div>
              )}

              {/* CANCELLED STATE VIEW RE-INITIATE */}
              {state.step === "CANCELLED" && (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Action cancelled. No changes were made.</span>
                  <button
                    type="button"
                    onClick={() => updateState(rec.id, { step: "RECOMMENDED" })}
                    className="text-[11px] text-amber-400 hover:underline font-semibold"
                  >
                    Re-open Recommendation
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
