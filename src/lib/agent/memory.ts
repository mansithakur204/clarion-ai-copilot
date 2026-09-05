import { ConversationContext, AgentMessage, PendingAction, SmartRecommendation, DocumentSourceCitation } from "./types";
import { DocumentRecord, TaskRecord } from "../types";
import { DeadlineInsight } from "../briefing/deadlineIntelligence";

export interface UnifiedWorkspaceContext {
  userId: string;
  userName?: string;
  recentTurns: { sender: string; text: string }[];
  activeDocument?: {
    id: string;
    title: string;
    issuer?: string;
    subject?: string;
    dueDate?: string;
    amount?: number;
  };
  relevantRagChunks: DocumentSourceCitation[];
  recentDocuments: { id: string; title: string; category: string; dueDate?: string; amount?: number }[];
  pendingTasks: { id: string; title: string; priority: string; dueDate?: string }[];
  upcomingObligations: { id: string; title: string; urgency: string; dueDate: string; amount?: number }[];
  pendingAction?: PendingAction;
}

export class SessionMemory {
  // Map of userId/sessionId -> ConversationContext to ensure strict user boundary isolation
  private static contexts: Map<string, ConversationContext> = new Map();
  // Store executed actions per session/user
  private static executedActions: Map<string, { taskId?: string; timestamp: string }> = new Map();

  static getContext(sessionId: string = "default-session"): ConversationContext {
    if (!this.contexts.has(sessionId)) {
      this.contexts.set(sessionId, { history: [] });
    }
    return this.contexts.get(sessionId)!;
  }

  static addMessage(sessionId: string = "default-session", msg: AgentMessage): void {
    const ctx = this.getContext(sessionId);
    ctx.history.push(msg);
    if (ctx.history.length > 20) {
      ctx.history = ctx.history.slice(-20);
    }
  }

  static updateActiveDocument(sessionId: string = "default-session", doc: DocumentRecord): void {
    const ctx = this.getContext(sessionId);
    ctx.lastDiscussedDocumentId = doc.id;
    ctx.lastDiscussedDocumentTitle = doc.title;
    ctx.lastDiscussedIssuer = doc.extraction?.issuer || doc.title;
    ctx.lastDiscussedSubject = doc.extraction?.subject || doc.title;
  }

  static setPendingAction(sessionId: string = "default-session", action: PendingAction): void {
    const ctx = this.getContext(sessionId);
    ctx.pendingAction = action;
  }

  static getPendingAction(sessionId: string = "default-session"): PendingAction | undefined {
    const ctx = this.getContext(sessionId);
    return ctx.pendingAction;
  }

  static clearPendingAction(sessionId: string = "default-session"): void {
    const ctx = this.getContext(sessionId);
    ctx.pendingAction = undefined;
  }

  static setUserName(sessionId: string = "default-session", name: string): void {
    const ctx = this.getContext(sessionId);
    ctx.userName = name;
  }

  static getUserName(sessionId: string = "default-session"): string | undefined {
    const ctx = this.getContext(sessionId);
    return ctx.userName;
  }

  static clear(sessionId: string = "default-session"): void {
    this.contexts.set(sessionId, { history: [] });
  }

  static markActionExecuted(actionId: string, taskId?: string): void {
    if (actionId) {
      this.executedActions.set(actionId, { taskId, timestamp: new Date().toISOString() });
    }
  }

  static isActionExecuted(actionId: string): boolean {
    if (!actionId) return false;
    return this.executedActions.has(actionId);
  }

  static getExecutedAction(actionId: string) {
    if (!actionId) return undefined;
    return this.executedActions.get(actionId);
  }

  /**
   * Deterministic local query-context entity resolution.
   * Resolves pronouns ('it', 'this', 'that', 'the bill', 'the document', 'the lease', 'the deadline', 'that task')
   * against active document context or history turns.
   */
  static resolveFollowUpEntity(userQuery: string, sessionId: string = "default-session"): string | undefined {
    const ctx = this.getContext(sessionId);
    const qLower = userQuery.toLowerCase().trim();

    const pronouns = [
      "it", "this", "that",
      "the bill", "the notice", "the claim", "the document", "the lease", "the contract",
      "that task", "the task", "the deadline",
      "when is it due", "how much is it", "who issued it", "when does it expire"
    ];

    const isFollowUp = pronouns.some((p) => qLower.includes(p));

    if (isFollowUp) {
      // 1. Check last discussed document metadata
      if (ctx.lastDiscussedDocumentId || ctx.lastDiscussedIssuer || ctx.lastDiscussedDocumentTitle) {
        return ctx.lastDiscussedDocumentId || ctx.lastDiscussedIssuer || ctx.lastDiscussedDocumentTitle;
      }

      // 2. Scan recent conversation history for document/bill keywords
      for (let i = ctx.history.length - 1; i >= 0; i--) {
        const msg = ctx.history[i];
        if (msg.activeEntity) return msg.activeEntity;
        if (msg.pendingAction?.documentTitle) return msg.pendingAction.documentTitle;
        if (msg.pendingAction?.documentId) return msg.pendingAction.documentId;
        if (msg.sources && msg.sources.length > 0) return msg.sources[0].documentId;
      }
    }

    return undefined;
  }
}
