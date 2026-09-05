import { clarionStore } from "@/lib/store";
import { agentTools } from "@/lib/agent/tools";
import { DocumentRecord, TaskRecord, ActionType, TaskPriority } from "@/lib/types";
import { ActionIntentType, DocumentSourceCitation } from "@/lib/agent/types";
import { formatDateForDisplay, isValidDate } from "@/lib/dateUtils";

export type ObligationUrgency = "CRITICAL" | "HIGH" | "MEDIUM" | "UPCOMING";
export type ObligationType = "BILL_PAYMENT" | "DOCUMENT_DEADLINE" | "LEASE_CONTRACT_RENEWAL" | "HIGH_PRIORITY_TASK" | "OTHER";

export interface DeadlineInsight {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: ObligationType;
  urgency: ObligationUrgency;
  dueDate: string; // YYYY-MM-DD or ISO
  daysRemaining: number;
  amount?: number;
  currency?: string;
  sourceDocumentId?: string;
  sourceDocumentTitle?: string;
  sourceTaskId?: string;
  suggestedAction: string;
  actionType: ActionIntentType | ActionType;
  actionArgs: Record<string, any>;
  citation?: DocumentSourceCitation;
  status: "ACTIVE" | "COMPLETED" | "DISMISSED";
}

/**
 * Calculates urgency deterministically according to exact Step 10 rules:
 * - overdue (daysRemaining < 0) -> CRITICAL
 * - due today (daysRemaining === 0) -> CRITICAL
 * - due within 3 days (0 < daysRemaining <= 3) -> HIGH
 * - due within 7 days (3 < daysRemaining <= 7) -> MEDIUM
 * - later (daysRemaining > 7) -> UPCOMING
 */
export function calculateUrgency(
  dueDateStr: string,
  now: Date = new Date()
): { urgency: ObligationUrgency; daysRemaining: number } | null {
  if (!dueDateStr || !isValidDate(dueDateStr)) return null;

  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return null;

  // Normalize dates to start of day (midnight) for accurate diffDays
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diffMs = startOfDue.getTime() - startOfToday.getTime();
  const daysRemaining = Math.floor(diffMs / (1000 * 3600 * 24));

  let urgency: ObligationUrgency = "UPCOMING";
  if (daysRemaining < 0) {
    urgency = "CRITICAL"; // Overdue
  } else if (daysRemaining === 0) {
    urgency = "CRITICAL"; // Due Today
  } else if (daysRemaining <= 3) {
    urgency = "HIGH"; // Due within 3 days
  } else if (daysRemaining <= 7) {
    urgency = "MEDIUM"; // Due within 7 days
  } else {
    urgency = "UPCOMING"; // Distant deadline
  }

  return { urgency, daysRemaining };
}

/**
 * Proactively generates deadline & obligation insights for the specified userId.
 * Enforces strict user isolation, deduplication, and financial/citation tracking.
 */
export async function getProactiveDeadlineInsights(
  userId: string,
  now: Date = new Date()
): Promise<DeadlineInsight[]> {
  if (!userId) return [];

  const docs: DocumentRecord[] = await clarionStore.getDocuments(userId);
  const tasks: TaskRecord[] = await clarionStore.getTasks(userId);

  const insights: DeadlineInsight[] = [];
  const dedupKeys = new Set<string>();

  // 1. Process Document-derived Deadlines & Financial Obligations
  for (const doc of docs) {
    if (doc.userId !== userId) continue; // Strict user isolation

    const ext = doc.extraction;
    const dueDate = ext?.dueDate;

    if (dueDate && isValidDate(dueDate)) {
      const urgencyResult = calculateUrgency(dueDate, now);
      if (!urgencyResult) continue;

      const { urgency, daysRemaining } = urgencyResult;
      const issuer = ext?.issuer || doc.title;
      const amount = ext?.totalAmount;
      const category = doc.category;

      let obligationType: ObligationType = "DOCUMENT_DEADLINE";
      if (category === "BILL" || (amount && amount > 0)) {
        obligationType = "BILL_PAYMENT";
      } else if (category === "CONTRACT" || doc.title.toLowerCase().includes("lease")) {
        obligationType = "LEASE_CONTRACT_RENEWAL";
      }

      const formattedDueDate = formatDateForDisplay(dueDate);
      let description = ext?.plainLanguageSummary || doc.contentSummary || `Action required by ${formattedDueDate}.`;
      if (amount) {
        description = `Financial obligation of $${amount.toFixed(2)} due on ${formattedDueDate}. ${description}`;
      }

      const dedupKeyDoc = doc.id ? `doc-${doc.id}` : `doc-${dueDate}`;
      const dedupKeyTitleDate = `${doc.title.toLowerCase().trim()}-${dueDate}`;
      const dedupKeyIssuerDate = `${issuer.toLowerCase().trim()}-${dueDate}`;
      if (dedupKeys.has(dedupKeyDoc) || dedupKeys.has(dedupKeyTitleDate) || dedupKeys.has(dedupKeyIssuerDate)) continue;
      dedupKeys.add(dedupKeyDoc);
      dedupKeys.add(dedupKeyTitleDate);
      dedupKeys.add(dedupKeyIssuerDate);

      // Create Citation
      const citation: DocumentSourceCitation = {
        documentId: doc.id,
        documentTitle: doc.title,
        category: doc.category,
        chunkIndex: 0,
        snippet: doc.contentSummary || doc.rawContent?.substring(0, 150) || doc.title,
        similarity: 1.0
      };

      insights.push({
        id: `obl-doc-${doc.id}`,
        userId,
        title: `${issuer} - ${doc.category}`,
        description,
        type: obligationType,
        urgency,
        dueDate,
        daysRemaining,
        amount,
        currency: ext?.currency || "USD",
        sourceDocumentId: doc.id,
        sourceDocumentTitle: doc.title,
        suggestedAction: amount
          ? `Create task: Pay $${amount.toFixed(2)} to ${issuer} by ${formattedDueDate}`
          : `Create task: Process ${doc.title} before ${formattedDueDate}`,
        actionType: "CREATE_TASK",
        actionArgs: {
          title: `Pay $${amount ? amount.toFixed(2) : ""} ${issuer}`,
          dueDate,
          priority: urgency === "CRITICAL" ? "URGENT" : urgency === "HIGH" ? "HIGH" : "MEDIUM",
          documentId: doc.id
        },
        citation,
        status: "ACTIVE"
      });
    }
  }

  // 2. Process Pending Tasks with Deadlines or High Priorities
  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
  for (const task of pendingTasks) {
    if (task.dueDate && isValidDate(task.dueDate)) {
      const urgencyResult = calculateUrgency(task.dueDate, now);
      if (!urgencyResult) continue;

      const { urgency, daysRemaining } = urgencyResult;
      const formattedDueDate = formatDateForDisplay(task.dueDate);

      const dedupKeyDoc = task.documentId ? `doc-${task.documentId}` : null;
      const dedupKeyTitleDate = `${task.title.toLowerCase().trim()}-${task.dueDate}`;
      
      let isDuplicate = (dedupKeyDoc && dedupKeys.has(dedupKeyDoc)) || dedupKeys.has(dedupKeyTitleDate);
      if (!isDuplicate) {
        const taskTitleWords = task.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
        for (const key of Array.from(dedupKeys)) {
          if (key.endsWith(`-${task.dueDate}`)) {
            const prefix = key.slice(0, -(task.dueDate.length + 1)).toLowerCase();
            if (taskTitleWords.some(word => word.length > 3 && prefix.includes(word))) {
              isDuplicate = true;
              break;
            }
          }
        }
      }
      if (isDuplicate) continue;
      if (dedupKeyDoc) dedupKeys.add(dedupKeyDoc);
      dedupKeys.add(dedupKeyTitleDate);

      insights.push({
        id: `obl-task-${task.id}`,
        userId,
        title: task.title,
        description: task.description || `Pending task due ${formattedDueDate}.`,
        type: "HIGH_PRIORITY_TASK",
        urgency,
        dueDate: task.dueDate,
        daysRemaining,
        sourceDocumentId: task.documentId,
        sourceDocumentTitle: task.documentTitle,
        sourceTaskId: task.id,
        suggestedAction: `Complete task "${task.title}"`,
        actionType: "COMPLETE_TASK",
        actionArgs: {
          taskId: task.id,
          title: task.title
        },
        status: "ACTIVE"
      });
    } else if (!task.dueDate && (task.priority === "URGENT" || task.priority === "HIGH")) {
      const dedupKey = `task-priority-${task.id}`;
      if (dedupKeys.has(dedupKey)) continue;
      dedupKeys.add(dedupKey);

      insights.push({
        id: `obl-task-priority-${task.id}`,
        userId,
        title: task.title,
        description: task.description || `High priority task (${task.priority}).`,
        type: "HIGH_PRIORITY_TASK",
        urgency: task.priority === "URGENT" ? "CRITICAL" : "HIGH",
        dueDate: new Date().toISOString().split("T")[0],
        daysRemaining: 0,
        sourceDocumentId: task.documentId,
        sourceDocumentTitle: task.documentTitle,
        sourceTaskId: task.id,
        suggestedAction: `Complete high-priority task "${task.title}"`,
        actionType: "COMPLETE_TASK",
        actionArgs: {
          taskId: task.id,
          title: task.title
        },
        status: "ACTIVE"
      });
    }
  }

  // 3. Sort Insights by Urgency Hierarchy (CRITICAL -> HIGH -> MEDIUM -> UPCOMING) & daysRemaining
  const urgencyWeight: Record<ObligationUrgency, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    UPCOMING: 1
  };

  insights.sort((a, b) => {
    const weightDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    if (weightDiff !== 0) return weightDiff;
    return a.daysRemaining - b.daysRemaining;
  });

  return insights;
}
