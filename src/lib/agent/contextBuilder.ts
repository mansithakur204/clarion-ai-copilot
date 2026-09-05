import { clarionStore } from "@/lib/store";
import { agentTools } from "@/lib/agent/tools";
import { SessionMemory, UnifiedWorkspaceContext } from "@/lib/agent/memory";
import { getProactiveDeadlineInsights, DeadlineInsight } from "@/lib/briefing/deadlineIntelligence";
import { DocumentSourceCitation } from "@/lib/agent/types";
import { DocumentRecord, TaskRecord } from "@/lib/types";

export interface BuildContextOptions {
  userId?: string;
  sessionId?: string;
  userQuery?: string;
  ragChunks?: DocumentSourceCitation[];
}

export async function buildUnifiedWorkspaceContext(
  options: BuildContextOptions
): Promise<UnifiedWorkspaceContext> {
  const { userId = "guest", sessionId = "default-session", userQuery = "", ragChunks = [] } = options;

  const memoryCtx = SessionMemory.getContext(sessionId);
  const recentTurns = memoryCtx.history.slice(-6).map((m) => ({
    sender: m.sender,
    text: m.text
  }));

  let activeDocRecord: DocumentRecord | undefined;
  if (memoryCtx.lastDiscussedDocumentId && userId) {
    activeDocRecord = await clarionStore.getDocumentById(memoryCtx.lastDiscussedDocumentId, userId);
  }

  let activeDocSummary;
  if (activeDocRecord) {
    activeDocSummary = {
      id: activeDocRecord.id,
      title: activeDocRecord.title,
      issuer: activeDocRecord.extraction?.issuer || activeDocRecord.title,
      subject: activeDocRecord.extraction?.subject || activeDocRecord.title,
      dueDate: activeDocRecord.extraction?.dueDate,
      amount: activeDocRecord.extraction?.totalAmount
    };
  } else if (memoryCtx.lastDiscussedDocumentTitle) {
    activeDocSummary = {
      id: memoryCtx.lastDiscussedDocumentId || "unknown",
      title: memoryCtx.lastDiscussedDocumentTitle,
      issuer: memoryCtx.lastDiscussedIssuer,
      subject: memoryCtx.lastDiscussedSubject
    };
  }

  let userDocs: DocumentRecord[] = [];
  let userTasks: TaskRecord[] = [];
  let userObligations: DeadlineInsight[] = [];

  if (userId) {
    try {
      userDocs = await clarionStore.getDocuments(userId);
      userTasks = await clarionStore.getTasks(userId);
      userObligations = await getProactiveDeadlineInsights(userId);
    } catch (e) {
      console.warn("[ContextBuilder Warning] Failed to load workspace collections for user:", userId, e);
    }
  }

  const recentDocuments = userDocs.slice(0, 3).map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    dueDate: d.extraction?.dueDate,
    amount: d.extraction?.totalAmount
  }));

  const pendingTasks = userTasks
    .filter((t) => t.status === "PENDING")
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate
    }));

  const upcomingObligations = userObligations.slice(0, 3).map((o) => ({
    id: o.id,
    title: o.title,
    urgency: o.urgency,
    dueDate: o.dueDate,
    amount: o.amount
  }));

  return {
    userId,
    userName: memoryCtx.userName,
    recentTurns,
    activeDocument: activeDocSummary,
    relevantRagChunks: ragChunks.slice(0, 3),
    recentDocuments,
    pendingTasks,
    upcomingObligations,
    pendingAction: memoryCtx.pendingAction
  };
}

/**
 * Formats a UnifiedWorkspaceContext into a compact text block for LLM prompts.
 */
export function formatContextForPrompt(ctx: UnifiedWorkspaceContext): string {
  const parts: string[] = [];

  if (ctx.userName) {
    parts.push(`User Name: ${ctx.userName}`);
  }

  if (ctx.activeDocument) {
    parts.push(
      `Active Discussed Entity: "${ctx.activeDocument.title}" (Issuer: ${ctx.activeDocument.issuer || "N/A"}, Due: ${ctx.activeDocument.dueDate || "N/A"}, Amount: ${ctx.activeDocument.amount ? `$${ctx.activeDocument.amount.toFixed(2)}` : "N/A"})`
    );
  }

  if (ctx.pendingAction) {
    parts.push(
      `Pending Action Awaiting Confirmation: [Type: ${ctx.pendingAction.actionType}, Title: "${ctx.pendingAction.args?.title || "Action"}", Status: ${ctx.pendingAction.status || "PENDING"}]`
    );
  }

  if (ctx.relevantRagChunks.length > 0) {
    parts.push(`Retrieved Document Evidence:\n` + ctx.relevantRagChunks.map((c) => `• "${c.documentTitle}" (${c.category}): "${c.snippet}"`).join("\n"));
  }

  if (ctx.recentDocuments.length > 0) {
    parts.push(`Recent Workspace Documents: ` + ctx.recentDocuments.map((d) => `"${d.title}" (${d.category})`).join(", "));
  }

  if (ctx.pendingTasks.length > 0) {
    parts.push(`Pending Tasks: ` + ctx.pendingTasks.map((t) => `"${t.title}" [${t.priority}]`).join(", "));
  }

  if (ctx.upcomingObligations.length > 0) {
    parts.push(`Upcoming Obligations: ` + ctx.upcomingObligations.map((o) => `"${o.title}" [Urgency: ${o.urgency}, Due: ${o.dueDate}]`).join(", "));
  }

  if (ctx.recentTurns.length > 0) {
    parts.push(`Recent Conversation:\n` + ctx.recentTurns.map((t) => `${t.sender}: ${t.text}`).join("\n"));
  }

  return parts.join("\n\n");
}
