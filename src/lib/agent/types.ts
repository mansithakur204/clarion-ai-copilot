import { DocumentRecord, TaskRecord, RiskLevel, ActionType, TaskPriority } from "../types";

export type IntentType =
  | "ATTENTION_QUERY"
  | "TASK_QUERY"
  | "DEADLINE_QUERY"
  | "SUMMARIZE_DOCS"
  | "MOST_URGENT_DOC"
  | "DOCUMENT_SPECIFIC"
  | "FOLLOW_UP_QUERY"
  | "GENERAL_HELP"
  | "CONVERSATIONAL"
  | "CREATE_TASK"
  | "COMPLETE_TASK"
  | "CREATE_REMINDER"
  | "DRAFT_EMAIL"
  | "CONFIRM_ACTION"
  | "CANCEL_ACTION";

export type ActionIntentType =
  | "CREATE_TASK"
  | "COMPLETE_TASK"
  | "CREATE_REMINDER"
  | "DRAFT_EMAIL"
  | "CONFIRM_ACTION"
  | "CANCEL_ACTION"
  | "READ_ONLY_QUERY";

export interface PendingAction {
  id: string;
  actionType: ActionIntentType;
  toolName: string;
  args: Record<string, any>;
  confirmationMessage: string;
  timestamp: string;
  documentId?: string;
  documentTitle?: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  documentId?: string;
}

export interface AgentTraceStep {
  id: string;
  timestamp: string;
  step: string;
  detail?: string;
  status: "COMPLETED" | "RUNNING" | "FAILED";
}

export interface AgentMessage {
  id: string;
  sender: "USER" | "AI";
  text: string;
  timestamp: string;
  traceSteps?: AgentTraceStep[];
  activeEntity?: string;
  pendingAction?: PendingAction;
  emailDraft?: EmailDraft;
}

export interface ConversationContext {
  userName?: string;
  lastDiscussedDocumentId?: string;
  lastDiscussedDocumentTitle?: string;
  lastDiscussedIssuer?: string;
  lastDiscussedSubject?: string;
  pendingAction?: PendingAction;
  history: AgentMessage[];
}

export interface AgentResponse {
  text: string;
  traceSteps: AgentTraceStep[];
  activeEntity?: string;
  intent: IntentType;
  toolsUsed: string[];
  pendingAction?: PendingAction;
  emailDraft?: EmailDraft;
}

export interface AgentTool {
  name: string;
  description: string;
  execute: (params?: any) => Promise<any>;
}
