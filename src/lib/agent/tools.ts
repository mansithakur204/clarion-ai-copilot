import { clarionStore } from "../store";
import { DocumentRecord, TaskRecord, TaskPriority, ActionType } from "../types";
import { isValidDate } from "../dateUtils";
import { EmailDraft } from "./types";
import { searchVectorStore, VectorSearchResult } from "../rag/search";

export interface UrgentItemResult {
  urgentDocuments: DocumentRecord[];
  urgentTasks: TaskRecord[];
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    severity: string;
    documentTitle?: string;
  }>;
}

export const agentTools = {
  /**
   * Read Tool 1: getDocuments()
   */
  async getDocuments(userId?: string): Promise<DocumentRecord[]> {
    return await clarionStore.getDocuments(userId);
  },

  /**
   * Read Tool 2: getTasks()
   */
  async getTasks(userId?: string): Promise<TaskRecord[]> {
    return await clarionStore.getAllTasks(userId);
  },

  /**
   * Read Tool 3: getUpcomingDeadlines()
   */
  async getUpcomingDeadlines(userId?: string) {
    const docs = await clarionStore.getDocuments(userId);
    const tasks = await clarionStore.getTasks(userId);

    const deadlinesList: Array<{
      id: string;
      title: string;
      dueDate: string;
      severity: string;
      type: "DOCUMENT_DEADLINE" | "TASK_DEADLINE";
      documentId?: string;
      documentTitle?: string;
    }> = [];

    docs.forEach((doc) => {
      if (doc.extraction?.dueDate && isValidDate(doc.extraction.dueDate)) {
        deadlinesList.push({
          id: `doc-dl-${doc.id}`,
          title: `${doc.extraction.issuer || doc.title} Action Deadline`,
          dueDate: doc.extraction.dueDate,
          severity: doc.riskLevel,
          type: "DOCUMENT_DEADLINE",
          documentId: doc.id,
          documentTitle: doc.title
        });
      }
    });

    tasks.forEach((task) => {
      if (task.dueDate && task.status === "PENDING" && isValidDate(task.dueDate)) {
        deadlinesList.push({
          id: `task-dl-${task.id}`,
          title: task.title,
          dueDate: task.dueDate,
          severity: task.priority,
          type: "TASK_DEADLINE",
          documentId: task.documentId,
          documentTitle: task.documentTitle
        });
      }
    });

    deadlinesList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return deadlinesList;
  },

  /**
   * Read Tool 4: getUrgentItems()
   */
  async getUrgentItems(userId?: string): Promise<UrgentItemResult> {
    const docs = await clarionStore.getDocuments(userId);
    const tasks = await clarionStore.getTasks(userId);
    const deadlines = await this.getUpcomingDeadlines(userId);

    const urgentDocuments = docs.filter(
      (d) => d.riskLevel === "URGENT" || d.riskLevel === "HIGH"
    );

    const urgentTasks = tasks.filter(
      (t) => t.status === "PENDING" && (t.priority === "URGENT" || t.priority === "HIGH")
    );

    return {
      urgentDocuments,
      urgentTasks,
      upcomingDeadlines: deadlines.slice(0, 5)
    };
  },

  /**
   * Read Tool 5: summarizeDocument(documentIdOrQuery)
   */
  async summarizeDocument(queryOrId?: string, userId?: string): Promise<DocumentRecord | undefined> {
    const docs = await clarionStore.getDocuments(userId);
    if (docs.length === 0) return undefined;
    if (!queryOrId) return docs[0];

    const q = queryOrId.toLowerCase().trim();

    let match = docs.find((d) => d.id === queryOrId || d.id === q);
    if (match) return match;

    match = docs.find(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        q.includes(d.title.toLowerCase()) ||
        d.originalFilename.toLowerCase().includes(q) ||
        (d.extraction?.issuer && (d.extraction.issuer.toLowerCase().includes(q) || q.includes(d.extraction.issuer.toLowerCase()))) ||
        (d.extraction?.subject && (d.extraction.subject.toLowerCase().includes(q) || q.includes(d.extraction.subject.toLowerCase()))) ||
        (d.extraction?.documentType && d.extraction.documentType.toLowerCase().includes(q))
    );

    return match;
  },

  /**
   * Action Tool 6: createTask()
   */
  async createTask(params: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    documentId?: string;
    userId?: string;
  }): Promise<TaskRecord> {
    return await clarionStore.addCustomTask({
      title: params.title,
      description: params.description || `Task created by Clarion AI Copilot`,
      priority: params.priority || "HIGH",
      dueDate: params.dueDate,
      documentId: params.documentId,
      userId: params.userId,
      isCopilotCreated: true
    });
  },

  /**
   * Action Tool 7: completeTask()
   */
  async completeTask(taskIdOrQuery: string, userId?: string): Promise<TaskRecord | undefined> {
    const allTasks = await clarionStore.getAllTasks(userId);
    let target = allTasks.find((t) => t.id === taskIdOrQuery);

    if (!target) {
      const q = taskIdOrQuery.toLowerCase();
      target = allTasks.find(
        (t) => t.title.toLowerCase().includes(q) || (t.documentTitle && t.documentTitle.toLowerCase().includes(q))
      );
    }

    if (target) {
      await clarionStore.toggleTaskStatus(target.id, userId);
      return { ...target, status: "COMPLETED" };
    }
    return undefined;
  },

  /**
   * Action Tool 8: createReminder()
   */
  async createReminder(params: {
    title: string;
    dueDate?: string;
    documentId?: string;
    userId?: string;
  }): Promise<TaskRecord> {
    return await clarionStore.addCustomTask({
      title: `[REMINDER] ${params.title}`,
      description: `Automated reminder created by Clarion AI Copilot`,
      priority: "HIGH",
      actionType: "GENERAL",
      dueDate: params.dueDate,
      documentId: params.documentId,
      userId: params.userId
    });
  },

  /**
   * Action Tool 9: draftEmail()
   */
  async draftEmail(params: {
    to: string;
    subject: string;
    body: string;
    documentId?: string;
  }): Promise<EmailDraft> {
    return {
      to: params.to,
      subject: params.subject,
      body: params.body,
      documentId: params.documentId
    };
  },

  /**
   * RAG Vector Search Tool 10: searchDocumentKnowledge(query, userId)
   */
  async searchDocumentKnowledge(query: string, userId?: string): Promise<VectorSearchResult[]> {
    if (!userId) return [];
    try {
      return await searchVectorStore(userId, query, 4);
    } catch (err) {
      console.warn("[searchDocumentKnowledge Error]", err);
      return [];
    }
  }
};
