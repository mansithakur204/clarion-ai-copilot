"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DailyBriefingCard from "@/components/dashboard/DailyBriefingCard";
import UpcomingObligationsSection from "@/components/dashboard/UpcomingObligationsSection";
import { AttentionBanner } from "@/components/AttentionBanner";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { DocumentRecord, TaskRecord } from "@/lib/types";
import { formatDateForDisplay, isValidDate } from "@/lib/dateUtils";
import {
  UploadCloud,
  FileText,
  Calendar,
  ArrowRight,
  DollarSign,
  Eye,
  Sparkles,
  RefreshCw,
  CheckSquare
} from "lucide-react";

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [docRes, taskRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/tasks")
      ]);
      const docData = await docRes.json();
      const taskData = await taskRes.json();

      if (docData.success) {
        setDocuments(docData.documents);
      }
      if (taskData.success) {
        setTasks(taskData.tasks);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute metrics
  const totalFinancialCommitment = documents.reduce((acc, doc) => {
    return acc + (doc.extraction?.totalAmount || 0);
  }, 0);

  const unverifiedCount = documents.filter(
    (d) => !d.extraction?.humanVerified
  ).length;

  const urgentCount = documents.filter((d) => d.riskLevel === "URGENT").length;

  // Pending tasks (includes document-generated, custom, and Copilot-created tasks)
  const pendingTasks = tasks.filter((t) => t.status === "PENDING");

  // Sort pending tasks by due date
  const sortedPendingTasks = [...pendingTasks].sort((a, b) => {
    if (!a.dueDate || !isValidDate(a.dueDate)) return 1;
    if (!b.dueDate || !isValidDate(b.dueDate)) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Workspace Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time administrative copilot status & pending verification items.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            title="Refresh Workspace"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/dashboard/upload"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-clarion-600 to-sky-500 hover:from-clarion-500 hover:to-sky-400 text-white font-semibold text-xs sm:text-sm shadow-md shadow-clarion-500/20 flex items-center gap-2 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </Link>
        </div>
      </div>

      {/* AI Daily Briefing Section */}
      <DailyBriefingCard />

      {/* Proactive Deadline & Obligation Intelligence Section */}
      <UpcomingObligationsSection onActionComplete={fetchDashboardData} />

      {/* Immediate Attention Banner */}
      <AttentionBanner documents={documents} tasks={tasks} />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Unverified Extractions</span>
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline gap-2">
            <span>{unverifiedCount}</span>
            <span className="text-xs text-amber-400 font-normal">Needs Review</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Requires 1-click human confirmation
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Tasks</span>
            <CheckSquare className="w-4 h-4 text-clarion-400" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline gap-2">
            <span>{pendingTasks.length}</span>
            <span className="text-xs text-clarion-300 font-normal">Active</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {urgentCount > 0 ? `${urgentCount} urgent shutoff / escalation` : "Tracked by Clarion"}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Financial Liability</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            ${totalFinancialCommitment.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400">
            Sum of detected bills & property taxes
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Processed Records</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {documents.length}
          </div>
          <p className="text-[11px] text-slate-400">
            100% Audit trail logged
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Documents & Tasks Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Recent Documents & What Clarion Understood */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-clarion-400" />
              <span>What Clarion Understood (Recent Documents)</span>
            </h2>
            <Link
              href="/dashboard/upload"
              className="text-xs text-clarion-400 hover:text-clarion-300 font-semibold flex items-center gap-1"
            >
              <span>Process New Document</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 animate-pulse">
              Loading administrative records...
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-300">No documents uploaded yet</h3>
              <p className="text-xs text-slate-500">
                Upload a bill, lease contract, or notice to begin AI extraction.
              </p>
              <Link
                href="/dashboard/upload"
                className="inline-flex px-4 py-2 rounded-xl bg-clarion-600 text-white text-xs font-semibold"
              >
                Upload Document
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-clarion-400 bg-clarion-500/10 px-2 py-0.5 rounded">
                          {doc.category}
                        </span>
                        <RiskBadge level={doc.riskLevel} />
                        <StatusBadge
                          status={doc.status}
                          humanVerified={doc.extraction?.humanVerified}
                        />
                      </div>
                      <h3 className="text-base font-bold text-white">{doc.title}</h3>
                    </div>

                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 self-start sm:self-center transition-colors border border-slate-700/80"
                    >
                      <span>Review Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {doc.contentSummary && (
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                      {doc.contentSummary}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between pt-1 text-xs text-slate-400 gap-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-4">
                      {doc.extraction?.issuer && (
                        <span>Issuer: <strong className="text-slate-200">{doc.extraction.issuer}</strong></span>
                      )}
                      {doc.extraction?.totalAmount !== undefined && (
                        <span>
                          Amount: <strong className="text-emerald-400">${doc.extraction.totalAmount.toFixed(2)}</strong>
                        </span>
                      )}
                    </div>
                    {doc.extraction?.dueDate && (
                      <span className="text-amber-400 font-semibold">
                        Due: {new Date(doc.extraction.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1 col): Upcoming Tasks & Deadlines Timeline */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Upcoming Tasks & Deadlines</span>
          </h2>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            {isLoading ? (
              <p className="text-xs text-slate-500 py-4 text-center animate-pulse">
                Loading tasks & deadlines...
              </p>
            ) : sortedPendingTasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No pending tasks found.
              </p>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                {sortedPendingTasks.map((task) => (
                  <div key={task.id} className="relative pl-7 space-y-1">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-amber-400 ring-4 ring-slate-900" />
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-semibold text-white">{task.title}</div>
                      {task.documentTitle && (
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          ({task.documentTitle})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-amber-400 font-bold">
                      {formatDateForDisplay(task.dueDate, "No deadline")}
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 text-center">
              <Link
                href="/dashboard/tasks"
                className="text-xs text-clarion-400 hover:text-clarion-300 font-semibold inline-flex items-center gap-1"
              >
                <span>View All Tasks & Reminders ({pendingTasks.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
