export type CategoryType =
  | "BILL"
  | "NOTICE"
  | "CONTRACT"
  | "STATEMENT"
  | "TAX"
  | "HEALTHCARE"
  | "DOCUMENTATION"
  | "RESUME"
  | "OTHER";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ActionType =
  | "PAYMENT"
  | "CANCEL_SUBSCRIPTION"
  | "DISPUTE"
  | "RENEWAL"
  | "SUBMIT_FORM"
  | "VERIFICATION"
  | "GENERAL";

export type DocumentStatus =
  | "PENDING_ANALYSIS"
  | "ANALYSIS_COMPLETE"
  | "VERIFICATION_REQUIRED"
  | "VERIFIED"
  | "ARCHIVED";

export type DocumentIndexingStatus = "PENDING" | "INDEXING" | "INDEXED" | "FAILED";

export interface ExtractedFact {
  field: string;
  value: string;
  confidence: number; // 0.0 to 1.0
  isVerified: boolean;
  notes?: string;
}

export interface DocumentAnalysisResult {
  category: CategoryType;
  documentType?: string; // Human-friendly specific document type (e.g. "Utility Bill", "Lease Agreement", "College Notice")
  subject?: string;      // Primary subject / entity of the document
  issuer: string;
  accountNumber?: string;
  totalAmount?: number;
  currency: string;
  issueDate?: string;
  dueDate?: string;
  plainLanguageSummary: string;
  priorityScore: number; // 1 to 5
  riskLevel: RiskLevel;
  keyTakeaways: string[];
  actionItems: Array<{
    title: string;
    description: string;
    actionType: ActionType;
    priority: TaskPriority;
    suggestedDueDate?: string;
  }>;
  questions: string[]; // Clarifications needed from user
  confidenceScore: number;
  extractedFacts: ExtractedFact[];
  rawTextExcerpt?: string;
  usedFallback?: boolean;
  providerUsed?: string;
  fallbackReason?: string;
  originalError?: string;
}

export interface TaskRecord {
  id: string;
  documentId?: string;
  documentTitle?: string;
  title: string;
  description?: string;
  actionType: ActionType;
  priority: TaskPriority;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DISMISSED";
  dueDate?: string;
  humanConfirmed: boolean;
  createdAt?: string;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  category: CategoryType;
  status: DocumentStatus;
  indexingStatus?: DocumentIndexingStatus;
  riskLevel: RiskLevel;
  contentSummary?: string;
  rawContent?: string;
  usedFallback?: boolean;
  fallbackReason?: string;
  createdAt: string;
  updatedAt: string;
  extraction?: {
    id: string;
    documentType?: string;
    subject?: string;
    issuer?: string;
    accountNumber?: string;
    totalAmount?: number;
    currency: string;
    issueDate?: string;
    dueDate?: string;
    plainLanguageSummary: string;
    priorityScore: number;
    keyTakeaways: string[];
    actionItems: Array<{
      title: string;
      description: string;
      actionType: ActionType;
      priority: TaskPriority;
      suggestedDueDate?: string;
    }>;
    questions: string[];
    confidenceScore: number;
    extractedFacts?: ExtractedFact[];
    humanVerified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
  };
  deadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    severity: RiskLevel;
    isCompleted: boolean;
    description?: string;
  }>;
  tasks: TaskRecord[];
}

export interface AuditRecord {
  id: string;
  documentId?: string;
  documentTitle?: string;
  action: string;
  actor: "AI_SYSTEM" | "USER";
  details: string;
  createdAt: string;
}
