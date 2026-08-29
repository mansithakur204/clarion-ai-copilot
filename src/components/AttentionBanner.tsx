"use client";

import React from "react";
import Link from "next/link";
import { AlertOctagon, ArrowRight, CheckCircle } from "lucide-react";
import { DocumentRecord, TaskRecord } from "@/lib/types";

interface AttentionBannerProps {
  documents: DocumentRecord[];
  tasks?: TaskRecord[];
}

export const AttentionBanner: React.FC<AttentionBannerProps> = ({ documents, tasks = [] }) => {
  const unverifiedDocs = documents.filter((d) => !d.extraction?.humanVerified);
  const urgentDocs = documents.filter((d) => d.riskLevel === "URGENT");
  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
  const upcomingDeadlines = documents
    .flatMap((d) => d.deadlines)
    .filter((dl) => !dl.isCompleted);

  const activeItemCount = Math.max(pendingTasks.length, upcomingDeadlines.length);

  if (unverifiedDocs.length === 0 && urgentDocs.length === 0 && pendingTasks.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-300">All Administrative Notices Verified</h4>
            <p className="text-xs text-slate-400">No pending unverified AI extractions or critical overdue warnings.</p>
          </div>
        </div>
      </div>
    );
  }

  const primaryAttentionDoc = urgentDocs[0] || unverifiedDocs[0];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-amber-950/30 to-slate-900 border border-amber-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 mt-0.5 sm:mt-0">
          <AlertOctagon className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
              Immediate Attention Required
            </span>
            <span className="text-xs text-slate-400">
              ({unverifiedDocs.length} unverified AI extraction{unverifiedDocs.length > 1 ? "s" : ""},{" "}
              {activeItemCount} active task{activeItemCount > 1 ? "s" : ""}/deadline{activeItemCount > 1 ? "s" : ""})
            </span>
          </div>
          <h3 className="text-base font-semibold text-white">
            {primaryAttentionDoc ? primaryAttentionDoc.title : "Pending Workspace Action Items Detected"}
          </h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {primaryAttentionDoc?.contentSummary ||
              "Clarion AI detected active tasks and deadlines that need human attention to prevent late fees or service interruption."}
          </p>
        </div>
      </div>

      {primaryAttentionDoc && (
        <Link
          href={`/dashboard/documents/${primaryAttentionDoc.id}`}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 self-end sm:self-center"
        >
          <span>Review & Verify Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
};
