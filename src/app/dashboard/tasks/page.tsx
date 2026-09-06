"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, Plus, CheckCircle2, ArrowRight } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { ActionType, TaskPriority } from "@/lib/types";
import { formatDateForDisplay, isValidDate } from "@/lib/dateUtils";

interface TaskItem {
  id: string;
  documentId?: string;
  documentTitle?: string;
  title: string;
  description?: string;
  actionType: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DISMISSED";
  dueDate?: string;
  humanConfirmed: boolean;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // New task form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newActionType, setNewActionType] = useState<ActionType>("GENERAL");
  const [newPriority, setNewPriority] = useState<TaskPriority>("MEDIUM");
  const [newDueDate, setNewDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleTask = async (taskId: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId })
      });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: t.status === "COMPLETED" ? "PENDING" : "COMPLETED"
                }
              : t
          )
        );
      }
    } catch (err) {
      console.error("Failed to update task status", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          actionType: newActionType,
          priority: newPriority,
          dueDate: newDueDate ? newDueDate : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewTitle("");
        setNewDescription("");
        setNewActionType("GENERAL");
        setNewPriority("MEDIUM");
        setNewDueDate("");
        setShowAddForm(false);
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to create task", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === "PENDING") return t.status === "PENDING";
    if (filterStatus === "COMPLETED") return t.status === "COMPLETED";
    return true;
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const getTaskSortCategory = (task: TaskItem) => {
    if (!task.dueDate || !isValidDate(task.dueDate)) return 4; // No deadline
    const d = new Date(task.dueDate);
    if (isNaN(d.getTime())) return 4;
    if (d < todayStart) return 1; // Overdue
    if (d <= todayEnd) return 2; // Due today
    return 3; // Upcoming
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const catA = getTaskSortCategory(a);
    const catB = getTaskSortCategory(b);

    if (catA !== catB) {
      return catA - catB;
    }

    if (a.dueDate && b.dueDate && isValidDate(a.dueDate) && isValidDate(b.dueDate)) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    return 0;
  });

  const formatDueDate = (dueDateStr?: string) => {
    return formatDateForDisplay(dueDateStr, "No deadline");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-clarion-400 shrink-0" />
            <span>Tasks & Administrative Deadlines</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Human-verified action items generated directly from processed documents or custom entry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start sm:self-center">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-xl bg-clarion-600 hover:bg-clarion-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-clarion-600/20 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? "Cancel" : "Add Task"}</span>
          </button>

          {/* Filter buttons */}
          <div className="flex items-center gap-1 sm:gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                filterStatus === "ALL" ? "bg-clarion-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilterStatus("PENDING")}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                filterStatus === "PENDING" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Pending ({tasks.filter((t) => t.status === "PENDING").length})
            </button>
            <button
              onClick={() => setFilterStatus("COMPLETED")}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                filterStatus === "COMPLETED" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Completed ({tasks.filter((t) => t.status === "COMPLETED").length})
            </button>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <form onSubmit={handleCreateTask} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-clarion-400" />
            <span>Create Custom Task</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-400">Task Title *</label>
              <input
                type="text"
                placeholder="e.g., I have to complete project"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-clarion-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-400">Description (Optional)</label>
              <input
                type="text"
                placeholder="Additional details..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-clarion-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Task Type</label>
              <select
                value={newActionType}
                onChange={(e) => setNewActionType(e.target.value as ActionType)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-clarion-500"
              >
                <option value="GENERAL">General</option>
                <option value="PAYMENT">Payment</option>
                <option value="RENEWAL">Renewal</option>
                <option value="DISPUTE">Dispute</option>
                <option value="SUBMIT_FORM">Submit Form</option>
                <option value="VERIFICATION">Verification</option>
                <option value="CANCEL_SUBSCRIPTION">Cancel Subscription</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-clarion-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-slate-400">Due Date (Optional - leave blank for No deadline)</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-clarion-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-750"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newTitle.trim()}
              className="px-5 py-2 rounded-xl bg-clarion-600 hover:bg-clarion-500 text-white text-xs font-bold shadow-md"
            >
              {isSubmitting ? "Saving..." : "Save Task"}
            </button>
          </div>
        </form>
      )}

      {/* Task Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 animate-pulse">
          Loading tasks & deadlines...
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No matching tasks found</h3>
          <p className="text-xs text-slate-500">
            Process a document or create custom tasks using the &quot;Add Task&quot; button above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedTasks.map((task) => {
            const isDone = task.status === "COMPLETED";
            const cat = getTaskSortCategory(task);

            return (
              <div
                key={task.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isDone
                    ? "bg-slate-950/40 border-slate-850 opacity-60"
                    : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                      isDone
                        ? "bg-emerald-500 border-emerald-400 text-slate-950"
                        : "border-slate-700 hover:border-clarion-400 bg-slate-950"
                    }`}
                  >
                    {isDone && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-clarion-500/10 text-clarion-400 border border-clarion-500/20">
                        {task.actionType}
                      </span>
                      <RiskBadge level={task.priority} />
                      {task.documentTitle && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          From: {task.documentTitle}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-base font-bold ${isDone ? "line-through text-slate-500" : "text-white"}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Deadline</span>
                    {task.dueDate ? (
                      <div>
                        <span
                          className={`text-xs font-bold ${
                            isDone
                              ? "text-slate-500"
                              : cat === 1
                              ? "text-rose-400"
                              : cat === 2
                              ? "text-amber-300"
                              : "text-amber-400"
                          }`}
                        >
                          {formatDueDate(task.dueDate)}
                        </span>
                        {!isDone && cat === 1 && (
                          <span className="text-[10px] text-rose-400 font-bold block">Overdue</span>
                        )}
                        {!isDone && cat === 2 && (
                          <span className="text-[10px] text-amber-300 font-bold block">Due Today</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 italic block">
                        No deadline
                      </span>
                    )}
                  </div>

                  {task.documentId && (
                    <Link
                      href={`/dashboard/documents/${task.documentId}`}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors"
                      title="View Source Document"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
