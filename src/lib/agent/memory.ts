import { ConversationContext, AgentMessage, PendingAction } from "./types";
import { DocumentRecord } from "../types";

export class SessionMemory {
  private static contexts: Map<string, ConversationContext> = new Map();

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

  static resolveFollowUpEntity(userQuery: string, sessionId: string = "default-session"): string | undefined {
    const ctx = this.getContext(sessionId);
    const qLower = userQuery.toLowerCase();

    const pronouns = ["it", "this", "that", "the bill", "the notice", "the claim", "when is it due", "how much is it"];
    const isFollowUp = pronouns.some((p) => qLower.includes(p));

    if (isFollowUp) {
      return ctx.lastDiscussedDocumentId || ctx.lastDiscussedIssuer || ctx.lastDiscussedDocumentTitle;
    }

    return undefined;
  }
}
