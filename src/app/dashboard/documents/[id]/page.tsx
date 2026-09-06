"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { DocumentRecord, ActionType, TaskPriority } from "@/lib/types";
import { formatDateToYYYYMMDD, formatDateForDisplay } from "@/lib/dateUtils";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Calendar,
  DollarSign,
  Plus,
  ShieldCheck,
  FileText,
  UserCheck,
  Sparkles,
  History,
  Zap
} from "lucide-react";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable verification fields
  const [issuer, setIssuer] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [summary, setSummary] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  // New manual task state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskActionType, setNewTaskActionType] = useState<ActionType>("PAYMENT");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("HIGH");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);

  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/documents/${docId}`);
      const data = await res.json();

      if (data.success && data.document) {
        const d: DocumentRecord = data.document;
        setDoc(d);

        if (d.extraction) {
          setIssuer(d.extraction.issuer || "");
          setAccountNumber(d.extraction.accountNumber || "");
          setTotalAmount(
            d.extraction.totalAmount ? String(d.extraction.totalAmount) : ""
          );
          setDueDate(formatDateToYYYYMMDD(d.extraction.dueDate));
          setSummary(d.extraction.plainLanguageSummary || "");
          setIsVerified(d.extraction.humanVerified || false);
        }
      }
    } catch (err) {
      console.error("Failed to load document", err);
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleSaveVerification = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issuer,
          accountNumber,
          totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
          dueDate,
          plainLanguageSummary: summary
        })
      });
      const data = await res.json();
      if (data.success) {
        setDoc(data.document);
        setIsVerified(true);
      }
    } catch (err) {
      console.error("Failed to verify", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          description: `Action item associated with ${doc?.title}`,
          actionType: newTaskActionType,
          priority: newTaskPriority,
          dueDate: newTaskDueDate || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewTaskTitle("");
        setNewTaskDueDate("");
        setShowAddTask(false);
        fetchDocument();
      }
    } catch (err) {
      console.error("Failed to add task", err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-slate-500 animate-pulse">
        Fetching AI document extraction...
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Document Not Found</h2>
        <Link href="/dashboard" className="text-clarion-400 font-semibold text-xs inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const extraction = doc.extraction;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 w-full">
      {/* Back button & Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="text-xs text-slate-400 hover:text-white font-semibold inline-flex items-center gap-1.5 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {doc.title}
            </h1>
            <RiskBadge level={doc.riskLevel} />
            <StatusBadge status={doc.status} humanVerified={isVerified} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveVerification}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${isVerified
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20"
              }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{isVerified ? "Update Verification" : "Confirm & Verify AI Facts"}</span>
          </button>
        </div>
      </div>

      {/* Resilient Provider Fallback Banner */}
      {doc.usedFallback && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3 shadow-lg">
          <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-200">
              Google Gemini is temporarily unavailable. Clarion automatically switched to the Local Processing Engine and continued processing your document.
            </p>
            <p className="text-amber-400/80 text-[11px]">
              {doc.fallbackReason || "All administrative facts, tasks, and deadlines were extracted safely locally."}
            </p>
          </div>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (5 cols): Original Document Text Excerpt */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Original Document Text</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">{doc.originalFilename}</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 leading-relaxed max-h-[600px] overflow-y-auto whitespace-pre-wrap">
            {doc.rawContent || "No raw text available."}
          </div>
        </div>

        {/* Right Column (7 cols): AI Insights, Plain Language Summary & Verification Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Plain Language Summary Box */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-clarion-500/30 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-clarion-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Plain-Language Explanation</span>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Confidence: {((extraction?.confidenceScore || 0.9) * 100).toFixed(0)}%
              </span>
            </div>

            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-850 text-xs sm:text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-clarion-500"
            />
          </div>

          {/* Extracted Key Facts - Generic Human Verification Grid */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Extracted Intelligence & Attributes
                </h3>
              </div>
              <span className="text-xs text-amber-400 font-medium">
                {isVerified ? "✓ Verified" : "Review & Correct if needed"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Detected Document Type</label>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-clarion-300 font-bold">
                  {extraction?.documentType || doc.category}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Subject / Entity / Name</label>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-semibold focus:outline-none focus:border-clarion-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Financial Obligation</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="None (N/A)"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-bold focus:outline-none focus:border-clarion-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Administrative Deadline</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-bold focus:outline-none focus:border-clarion-500"
                />
              </div>
            </div>

            {/* Dynamic Extracted Attributes Grid */}
            {extraction?.extractedFacts && extraction.extractedFacts.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Dynamic Extracted Attributes ({extraction.extractedFacts.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {extraction.extractedFacts.map((fact, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between gap-2">
                      <span className="text-slate-400 font-medium shrink-0">{fact.field}:</span>
                      <span className="text-slate-200 font-semibold text-right truncate">{fact.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clarification Questions Flagged by AI */}
          {extraction?.questions && extraction.questions.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <HelpCircle className="w-4 h-4" />
                <span>AI Clarification Questions & Ambiguities</span>
              </div>
              <ul className="space-y-2">
                {extraction.questions.map((q, i) => (
                  <li key={i} className="text-xs text-amber-200/90 flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Required Action Items & Task Generator */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-clarion-400" />
                <span>Associated Tasks & Action Items ({doc.tasks.length})</span>
              </h3>
              <button
                onClick={() => setShowAddTask(!showAddTask)}
                className="text-xs text-clarion-400 hover:text-clarion-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {showAddTask && (
              <form onSubmit={handleAddTask} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <input
                  type="text"
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newTaskActionType}
                    onChange={(e) => setNewTaskActionType(e.target.value as ActionType)}
                    className="p-2 rounded bg-slate-900 text-xs text-slate-300 border border-slate-800"
                  >
                    <option value="PAYMENT">Payment</option>
                    <option value="RENEWAL">Renewal</option>
                    <option value="DISPUTE">Dispute</option>
                    <option value="VERIFICATION">Verification</option>
                    <option value="GENERAL">General</option>
                  </select>

                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="p-2 rounded bg-slate-900 text-xs text-slate-300 border border-slate-800"
                  >
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>

                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    placeholder="Due Date (Optional)"
                    className="p-2 rounded bg-slate-900 text-xs text-slate-300 border border-slate-800"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-clarion-600 hover:bg-clarion-500 text-white text-xs font-bold transition-colors"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            )}

            {doc.tasks.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-950/60 rounded-xl border border-slate-850">
                No administrative action items or tasks required for this document.
              </p>
            ) : (
              <div className="space-y-3">
                {doc.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-200">{task.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                          {task.actionType}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-slate-400 text-[11px] leading-relaxed">{task.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-emerald-400 font-semibold block">
                        {task.status}
                      </span>
                      {task.dueDate ? (
                        <span className="text-[10px] text-amber-400 font-bold">
                          {formatDateForDisplay(task.dueDate)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">
                          No deadline
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
