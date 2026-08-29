import { DocumentRecord, TaskRecord, TaskPriority, ActionType, AuditRecord } from "./types";
import { getActiveAIProvider } from "./ai";
import { SAMPLE_DOCUMENTS } from "./sampleDocs";
import { normalizeDateToISO } from "./dateUtils";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

class ClarionStore {
  private documents: DocumentRecord[] = [];
  private standaloneTasks: TaskRecord[] = [];
  private auditLogs: AuditRecord[] = [];
  private inMemoryUsers: UserRecord[] = [];
  private initialized: boolean = false;

  constructor() {
    // Initialized lazily on first access or call
  }

  public async init() {
    if (this.initialized) return;
    this.initialized = true;

    // Seed demo data ONLY for demo user if store is empty
    if (this.documents.length === 0) {
      await this.seedDemoData();
    }
  }

  private async seedDemoData() {
    const sample1 = SAMPLE_DOCUMENTS[0];
    const doc1: DocumentRecord = {
      id: "doc-elec-001",
      userId: "demo-user-id",
      title: sample1.title,
      originalFilename: sample1.filename,
      mimeType: "application/pdf",
      fileSize: 142800,
      category: sample1.category,
      status: "VERIFICATION_REQUIRED",
      riskLevel: sample1.riskLevel,
      contentSummary: "Urgent electric utility disconnection warning for ConEdison account #9482-1049-22. Total overdue balance of $342.50 must be paid by September 02, 2026 at 5:00 PM EST to avoid service shutoff.",
      rawContent: sample1.rawText,
      createdAt: new Date("2026-08-18T10:00:00Z").toISOString(),
      updatedAt: new Date("2026-08-18T10:00:00Z").toISOString(),
      extraction: {
        id: "ext-elec-001",
        issuer: "ConEdison Utility Services",
        accountNumber: "9482-1049-22",
        totalAmount: 342.5,
        currency: "USD",
        issueDate: "2026-08-15",
        dueDate: "2026-09-02",
        plainLanguageSummary: "Urgent electric utility disconnection warning for ConEdison account #9482-1049-22. Total overdue balance of $342.50 must be paid by September 02, 2026 at 5:00 PM EST to avoid service shutoff.",
        priorityScore: 5,
        keyTakeaways: [
          "Total overdue balance is $342.50",
          "Hard deadline for payment is September 02, 2026 at 5:00 PM EST",
          "Service shutoff is scheduled for September 05, 2026 if unpaid",
          "Reconnection fee of $45.00 applies after shutoff"
        ],
        actionItems: [
          {
            title: "Pay $342.50 ConEdison Overdue Balance",
            description: "Pay online at www.conedison.com/pay-online or call 1-800-555-0199.",
            actionType: "PAYMENT",
            priority: "URGENT",
            suggestedDueDate: "2026-09-02"
          }
        ],
        questions: ["Verify if HEAP financial assistance applies before August 30."],
        confidenceScore: 0.98,
        humanVerified: false
      },
      deadlines: [
        {
          id: "dl-elec-1",
          title: "ConEdison Overdue Balance Payment Deadline",
          dueDate: "2026-09-02T17:00:00Z",
          severity: "URGENT",
          isCompleted: false,
          description: "Must pay $342.50 to avoid service shutoff scheduled for Sept 5."
        }
      ],
      tasks: [
        {
          id: "task-elec-1",
          title: "Pay $342.50 ConEdison Overdue Balance",
          description: "Pay online at www.conedison.com/pay-online or call 1-800-555-0199.",
          actionType: "PAYMENT",
          priority: "URGENT",
          status: "PENDING",
          dueDate: "2026-09-02T17:00:00Z",
          humanConfirmed: false
        }
      ]
    };

    const sample2 = SAMPLE_DOCUMENTS[1];
    const doc2: DocumentRecord = {
      id: "doc-lease-002",
      userId: "demo-user-id",
      title: sample2.title,
      originalFilename: sample2.filename,
      mimeType: "application/pdf",
      fileSize: 312000,
      category: sample2.category,
      status: "VERIFICATION_REQUIRED",
      riskLevel: sample2.riskLevel,
      contentSummary: "Residential Lease Agreement Renewal Notice for Apartment 4B at 142 West 73rd Street, New York, NY. Lease expires October 31, 2026. Renewal option requires written notice by September 15, 2026 with a 7% monthly rent increase to $3,425.00.",
      rawContent: sample2.rawText,
      createdAt: new Date("2026-08-20T14:30:00Z").toISOString(),
      updatedAt: new Date("2026-08-20T14:30:00Z").toISOString(),
      extraction: {
        id: "ext-lease-002",
        issuer: "AvalonBay Communities Management",
        accountNumber: "APT-4B-NY73",
        totalAmount: 3425.0,
        currency: "USD",
        issueDate: "2026-08-10",
        dueDate: "2026-09-15",
        plainLanguageSummary: "Residential Lease Agreement Renewal Notice for Apartment 4B at 142 West 73rd Street, New York, NY. Lease expires October 31, 2026. Renewal option requires written notice by September 15, 2026 with a 7% monthly rent increase to $3,425.00.",
        priorityScore: 4,
        keyTakeaways: [
          "Current lease expires October 31, 2026",
          "Renewal deadline to lock rate is September 15, 2026",
          "Monthly rent increases by 7% to $3,425.00",
          "Non-renewal notice must be served 60 days prior to lease end"
        ],
        actionItems: [
          {
            title: "Submit Written Notice of Lease Renewal or Termination",
            description: "Submit written intent to leasing office or resident portal.",
            actionType: "SUBMIT_FORM",
            priority: "HIGH",
            suggestedDueDate: "2026-09-15"
          }
        ],
        questions: ["Confirm if security deposit rollover applies to renewal term."],
        confidenceScore: 0.96,
        humanVerified: false
      },
      deadlines: [
        {
          id: "dl-lease-1",
          title: "Apartment 4B Lease Renewal Notice Deadline",
          dueDate: "2026-09-15T23:59:59Z",
          severity: "HIGH",
          isCompleted: false,
          description: "Must submit written renewal decision to avoid automatic month-to-month rate conversion."
        }
      ],
      tasks: [
        {
          id: "task-lease-1",
          title: "Submit Written Notice of Lease Renewal or Termination",
          description: "Submit written intent to leasing office or resident portal.",
          actionType: "SUBMIT_FORM",
          priority: "HIGH",
          status: "PENDING",
          dueDate: "2026-09-15T23:59:59Z",
          humanConfirmed: false
        }
      ]
    };

    this.documents.push(doc1, doc2);

    this.addAuditLog(
      doc1.id,
      doc1.title,
      "DOCUMENT_UPLOADED",
      "USER",
      `Uploaded ${sample1.filename} for demo environment`,
      "demo-user-id"
    );
  }

  // --- USER AUTH & DB METHODS ---

  public async createUser(name: string, email: string, passwordHash: string): Promise<UserRecord> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const dbUser = await prisma.user.create({
        data: {
          name,
          email: cleanEmail,
          passwordHash
        }
      });
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        passwordHash: dbUser.passwordHash
      };
    } catch (err) {
      const newUser: UserRecord = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        email: cleanEmail,
        passwordHash,
        createdAt: new Date().toISOString()
      };
      this.inMemoryUsers.push(newUser);
      return newUser;
    }
  }

  public async getUserByEmail(email: string): Promise<UserRecord | undefined> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: cleanEmail }
      });
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          passwordHash: dbUser.passwordHash
        };
      }
    } catch (err) {
      // Fallback
    }
    return this.inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  public async getUserById(id: string): Promise<UserRecord | undefined> {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id }
      });
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          passwordHash: dbUser.passwordHash
        };
      }
    } catch (err) {
      // Fallback
    }
    return this.inMemoryUsers.find((u) => u.id === id);
  }

  // --- USER DATA ISOLATION METHODS ---

  public async getDocuments(userId?: string): Promise<DocumentRecord[]> {
    await this.init();
    if (!userId) return [];
    return this.documents.filter((d) => d.userId === userId);
  }

  public async getDocumentById(id: string, userId?: string): Promise<DocumentRecord | undefined> {
    await this.init();
    const doc = this.documents.find((d) => d.id === id);
    if (!doc) return undefined;
    if (userId && doc.userId !== userId) return undefined;
    return doc;
  }

  public async addDocument(
    title: string,
    filename: string,
    rawText: string,
    category: any = "OTHER",
    userId: string = "demo-user-id"
  ): Promise<DocumentRecord> {
    await this.init();
    const provider = getActiveAIProvider();
    const analysis = await provider.analyzeDocument(rawText, filename);

    const newDocId = `doc-${Date.now()}`;
    const newDoc: DocumentRecord = {
      id: newDocId,
      userId,
      title: title || filename.replace(/\.[^/.]+$/, ""),
      originalFilename: filename,
      mimeType: "text/plain",
      fileSize: rawText.length,
      category: analysis.category || category,
      status: "VERIFICATION_REQUIRED",
      riskLevel: analysis.riskLevel,
      contentSummary: analysis.plainLanguageSummary,
      rawContent: rawText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usedFallback: analysis.usedFallback || false,
      fallbackReason: analysis.fallbackReason,
      extraction: {
        id: `ext-${Date.now()}`,
        documentType: analysis.documentType,
        subject: analysis.subject || analysis.issuer,
        issuer: analysis.issuer,
        accountNumber: analysis.accountNumber,
        totalAmount: analysis.totalAmount,
        currency: analysis.currency,
        issueDate: analysis.issueDate,
        dueDate: analysis.dueDate,
        plainLanguageSummary: analysis.plainLanguageSummary,
        priorityScore: analysis.priorityScore,
        keyTakeaways: analysis.keyTakeaways,
        actionItems: analysis.actionItems,
        questions: analysis.questions,
        confidenceScore: analysis.confidenceScore,
        extractedFacts: analysis.extractedFacts,
        humanVerified: false
      },
      deadlines: [],
      tasks: []
    };

    // Auto-create document tasks
    if (analysis.actionItems && analysis.actionItems.length > 0) {
      analysis.actionItems.forEach((item, index) => {
        const task: TaskRecord = {
          id: `task-${newDocId}-${index}`,
          title: item.title,
          description: item.description,
          actionType: item.actionType || "GENERAL",
          priority: item.priority || "MEDIUM",
          status: "PENDING",
          dueDate: item.suggestedDueDate ? normalizeDateToISO(item.suggestedDueDate) : undefined,
          humanConfirmed: false,
          createdAt: new Date().toISOString(),
          documentId: newDocId,
          documentTitle: newDoc.title
        };
        newDoc.tasks.push(task);
      });
    }

    this.documents.unshift(newDoc);

    this.addAuditLog(
      newDoc.id,
      newDoc.title,
      "DOCUMENT_UPLOADED",
      "USER",
      `Uploaded ${filename} (${rawText.length} bytes)`,
      userId
    );

    if (analysis.usedFallback) {
      this.addAuditLog(
        newDoc.id,
        newDoc.title,
        "AI_PROVIDER_FALLBACK",
        "AI_SYSTEM",
        "Google Gemini unavailable (quota/rate limit). Switched automatically to Local Mock Engine.",
        userId
      );
    }

    const providerLabel = analysis.providerUsed || provider.name;
    this.addAuditLog(
      newDoc.id,
      newDoc.title,
      "AI_ANALYSIS_COMPLETED",
      "AI_SYSTEM",
      `Processed via ${providerLabel}. Resulted in category ${newDoc.category} and risk level ${newDoc.riskLevel}.`,
      userId
    );

    return newDoc;
  }

  public async verifyExtraction(
    documentId: string,
    updates: {
      issuer?: string;
      accountNumber?: string;
      totalAmount?: number;
      dueDate?: string;
      plainLanguageSummary?: string;
    },
    userId?: string
  ): Promise<DocumentRecord | undefined> {
    await this.init();
    const doc = await this.getDocumentById(documentId, userId);
    if (!doc || !doc.extraction) return undefined;

    if (updates.issuer !== undefined) doc.extraction.issuer = updates.issuer;
    if (updates.accountNumber !== undefined) doc.extraction.accountNumber = updates.accountNumber;
    if (updates.totalAmount !== undefined) doc.extraction.totalAmount = updates.totalAmount;
    if (updates.dueDate !== undefined) doc.extraction.dueDate = updates.dueDate;
    if (updates.plainLanguageSummary !== undefined) doc.extraction.plainLanguageSummary = updates.plainLanguageSummary;

    doc.extraction.humanVerified = true;
    doc.extraction.verifiedAt = new Date().toISOString();
    doc.extraction.verifiedBy = "Authenticated User";
    doc.status = "VERIFIED";
    doc.updatedAt = new Date().toISOString();

    this.addAuditLog(
      doc.id,
      doc.title,
      "HUMAN_VERIFICATION_COMPLETE",
      "USER",
      `Human user verified & confirmed extracted information.`,
      userId || doc.userId
    );

    return doc;
  }

  public async getAllTasks(userId?: string): Promise<TaskRecord[]> {
    await this.init();
    if (!userId) return [];
    const docs = this.documents.filter((d) => d.userId === userId);

    const documentTasks: TaskRecord[] = docs.flatMap((doc) =>
      doc.tasks.map((task) => ({
        ...task,
        documentId: doc.id,
        documentTitle: doc.title,
        riskLevel: doc.riskLevel
      }))
    );

    // Read persisted standalone tasks from Prisma DB for userId
    let dbTasks: TaskRecord[] = [];
    try {
      const dbRecords = await prisma.task.findMany({
        where: { userId }
      });
      dbTasks = dbRecords.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description || undefined,
        actionType: (t.actionType as ActionType) || "GENERAL",
        priority: (t.priority as TaskPriority) || "MEDIUM",
        status: (t.status as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DISMISSED") || "PENDING",
        dueDate: t.dueDate ? t.dueDate.toISOString() : undefined,
        humanConfirmed: t.humanConfirmed,
        createdAt: t.createdAt.toISOString(),
        documentId: t.documentId || undefined
      }));
    } catch (err) {}

    const inMemoryStandalone = this.standaloneTasks.filter(
      (t) => (t as any).userId === userId
    );

    const mergedMap = new Map<string, TaskRecord>();
    inMemoryStandalone.forEach((t) => mergedMap.set(t.id, t));
    dbTasks.forEach((t) => mergedMap.set(t.id, t));

    const allStandalone = Array.from(mergedMap.values());
    const docTaskIds = new Set(documentTasks.map((t) => t.id));
    const standaloneFiltered = allStandalone.filter((t) => !docTaskIds.has(t.id));

    return [...documentTasks, ...standaloneFiltered];
  }

  public async getTasks(userId?: string): Promise<TaskRecord[]> {
    return this.getAllTasks(userId);
  }

  public async toggleTaskStatus(
    taskId: string,
    userId?: string
  ): Promise<{ taskId: string; newStatus: string } | undefined> {
    await this.init();
    const docs = userId ? this.documents.filter((d) => d.userId === userId) : this.documents;

    for (const doc of docs) {
      const task = doc.tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
        try {
          await prisma.task.updateMany({
            where: { id: taskId },
            data: { status: task.status }
          });
        } catch (e) {}

        this.addAuditLog(
          doc.id,
          doc.title,
          "TASK_STATUS_UPDATED",
          "USER",
          `Task "${task.title}" updated to status ${task.status}.`,
          userId || doc.userId
        );
        return { taskId, newStatus: task.status };
      }
    }

    const userTasks = userId ? this.standaloneTasks.filter((t) => (t as any).userId === userId) : this.standaloneTasks;
    const standaloneTask = userTasks.find((t) => t.id === taskId || t.title.toLowerCase().includes(taskId.toLowerCase()));
    if (standaloneTask) {
      standaloneTask.status = standaloneTask.status === "COMPLETED" ? "PENDING" : "COMPLETED";
      try {
        await prisma.task.updateMany({
          where: { id: standaloneTask.id },
          data: { status: standaloneTask.status }
        });
      } catch (e) {}

      this.addAuditLog(
        standaloneTask.documentId,
        standaloneTask.documentTitle,
        "TASK_STATUS_UPDATED",
        "USER",
        `Task "${standaloneTask.title}" updated to status ${standaloneTask.status}.`,
        userId
      );
      return { taskId: standaloneTask.id, newStatus: standaloneTask.status };
    }

    return undefined;
  }

  public async addCustomTask(params: {
    title: string;
    description?: string;
    actionType?: ActionType;
    priority?: TaskPriority;
    dueDate?: string;
    documentId?: string;
    userId?: string;
    isCopilotCreated?: boolean;
  }): Promise<TaskRecord> {
    await this.init();
    const { title, description, actionType = "GENERAL", priority = "MEDIUM", dueDate, documentId, userId = "demo-user-id", isCopilotCreated = false } = params;

    let targetDoc: DocumentRecord | undefined;
    if (documentId) {
      targetDoc = this.documents.find((d) => d.id === documentId && (d.userId === userId || !userId));
    }

    const parsedDueDate = normalizeDateToISO(dueDate);

    const newTask: TaskRecord = {
      id: `task-custom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title,
      description: description || (targetDoc ? `Action item associated with ${targetDoc.title}` : "Custom user task"),
      actionType,
      priority,
      status: "PENDING",
      dueDate: parsedDueDate,
      humanConfirmed: true,
      createdAt: new Date().toISOString(),
      documentId: targetDoc?.id,
      documentTitle: targetDoc?.title
    };

    (newTask as any).userId = userId;

    if (targetDoc) {
      targetDoc.tasks.push(newTask);
    } else {
      this.standaloneTasks.unshift(newTask);
    }

    // Persist in Prisma SQLite DB
    try {
      await prisma.task.create({
        data: {
          id: newTask.id,
          userId,
          documentId: targetDoc?.id || null,
          title: newTask.title,
          description: newTask.description,
          actionType: newTask.actionType,
          priority: newTask.priority,
          status: newTask.status,
          dueDate: parsedDueDate ? new Date(parsedDueDate) : null,
          humanConfirmed: true
        }
      });
    } catch (err) {
      console.warn("Failed to persist task in Prisma DB:", err);
    }

    const auditAction = isCopilotCreated ? "TASK_CREATED_BY_COPILOT" : "TASK_CREATED";
    const auditActor = isCopilotCreated ? "AI_SYSTEM" : "USER";

    this.addAuditLog(
      targetDoc?.id,
      targetDoc?.title,
      auditAction,
      auditActor,
      `Created task "${title}" with priority ${priority}${parsedDueDate ? ` due on ${parsedDueDate.split("T")[0]}` : " (no deadline)"}.`,
      userId
    );

    return newTask;
  }

  public async addTaskToDocument(
    documentId: string,
    title: string,
    description: string,
    actionType: ActionType,
    priority: TaskPriority,
    dueDate?: string,
    userId?: string
  ): Promise<any> {
    return this.addCustomTask({
      documentId,
      title,
      description,
      actionType,
      priority,
      dueDate,
      userId
    });
  }

  public async getAuditLogs(userId?: string): Promise<AuditRecord[]> {
    await this.init();
    if (!userId) return [];
    return this.auditLogs.filter((log) => (log as any).userId === userId);
  }

  public addAuditLog(
    documentId: string | undefined,
    documentTitle: string | undefined,
    action: string,
    actor: "AI_SYSTEM" | "USER",
    details: string,
    userId?: string
  ) {
    const entry: AuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      documentId,
      documentTitle,
      action,
      actor,
      details,
      createdAt: new Date().toISOString()
    };
    (entry as any).userId = userId;
    this.auditLogs.unshift(entry);
  }
}

// Global singleton instance for app runtime across Next.js reloads
const globalForClarion = globalThis as unknown as {
  clarionStore: ClarionStore | undefined;
};

export const clarionStore = globalForClarion.clarionStore ?? new ClarionStore();

if (process.env.NODE_ENV !== "production") {
  globalForClarion.clarionStore = clarionStore;
}
