import { agentTools } from "./tools";
import { SmartDecision, SmartRecommendation, DocumentSourceCitation } from "./types";
import { DocumentRecord, TaskRecord } from "../types";
import { formatDateForDisplay } from "../dateUtils";

export interface DecisionEngineResult {
  decision: SmartDecision;
  text: string;
  sources: DocumentSourceCitation[];
  toolsUsed: string[];
}

export class SmartDecisionEngine {
  /**
   * Evaluates user workspace data deterministically to generate structured recommendations and facts.
   * Ensures strict user isolation by scoping all store queries to userId.
   */
  async evaluateSmartActions(
    userId: string | undefined,
    userQuery: string
  ): Promise<DecisionEngineResult> {
    const qLower = userQuery.toLowerCase().trim();
    const toolsUsed: string[] = [];
    const facts: string[] = [];
    const recommendations: SmartRecommendation[] = [];
    let sources: DocumentSourceCitation[] = [];

    if (!userId) {
      return {
        decision: { facts: ["No authenticated user context provided."], recommendations: [] },
        text: "Please sign in to view your personalized administrative recommendations.",
        sources: [],
        toolsUsed: []
      };
    }

    // 1. Fetch user-scoped documents, tasks, and deadlines
    const docs: DocumentRecord[] = await agentTools.getDocuments(userId);
    toolsUsed.push("getDocuments");

    const tasks: TaskRecord[] = await agentTools.getTasks(userId);
    toolsUsed.push("getTasks");

    const deadlines = await agentTools.getUpcomingDeadlines(userId);
    toolsUsed.push("getUpcomingDeadlines");

    // 2. Execute RAG Vector Search for semantic evidence grounding
    try {
      const ragChunks = await agentTools.searchDocumentKnowledge(userQuery, userId);
      toolsUsed.push("searchDocumentKnowledge");
      sources = ragChunks.map((chunk) => ({
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        category: chunk.documentCategory,
        chunkIndex: chunk.chunkIndex,
        snippet: chunk.content.length > 180 ? chunk.content.substring(0, 180) + "..." : chunk.content,
        similarity: chunk.similarity
      }));
    } catch (e) {
      console.warn("[DecisionEngine RAG Error]", e);
    }

    // Determine query focus
    const isSpecificBillQuery =
      docs.length > 0 && (
        qLower.includes("bill") ||
        qLower.includes("what should i do about this bill") ||
        qLower.includes("electricity") ||
        qLower.includes("brightgrid") ||
        qLower.includes("lease") ||
        qLower.includes("notice")
      );

    if (isSpecificBillQuery) {
      // Find matching document for this specific query
      const targetDoc = await agentTools.summarizeDocument(userQuery, userId);
      if (targetDoc && targetDoc.userId === userId) {
        const issuer = targetDoc.extraction?.issuer || targetDoc.title;
        const amount = targetDoc.extraction?.totalAmount;
        const dueDate = targetDoc.extraction?.dueDate;
        const formattedDue = dueDate ? formatDateForDisplay(dueDate) : "No specified deadline";

        facts.push(
          `FACT: Document "${targetDoc.title}" issued by ${issuer}.`
        );
        if (amount) {
          facts.push(`FACT: Total obligation amount is $${amount.toFixed(2)} due on ${formattedDue}.`);
        }
        if (targetDoc.extraction?.plainLanguageSummary) {
          facts.push(`FACT: Summary - ${targetDoc.extraction.plainLanguageSummary}`);
        }

        const recId = `rec-doc-${targetDoc.id}`;
        const recTitle = `${issuer} - ${targetDoc.category}`;
        const recReason = amount
          ? `Outstanding payment obligation of $${amount.toFixed(2)} due on ${formattedDue} (${targetDoc.riskLevel} Risk).`
          : `Important document requiring review (${targetDoc.riskLevel} Risk).`;
        const recStep = amount
          ? `Create a payment task to pay $${amount.toFixed(2)} before ${formattedDue}.`
          : `Review extracted details and submit necessary confirmation.`;

        recommendations.push({
          id: recId,
          title: recTitle,
          reason: recReason,
          suggestedAction: recStep,
          actionType: amount ? "CREATE_TASK" : "SUBMIT_FORM",
          actionArgs: {
            title: `Pay $${amount ? amount.toFixed(2) : ""} ${issuer} ${targetDoc.category}`,
            dueDate: dueDate || "Tomorrow",
            priority: targetDoc.riskLevel === "URGENT" ? "URGENT" : "HIGH",
            documentId: targetDoc.id
          },
          sourceDocumentId: targetDoc.id,
          sourceDocumentTitle: targetDoc.title,
          category: targetDoc.category,
          dueDate: dueDate,
          amount: amount,
          priority: targetDoc.riskLevel === "URGENT" ? "URGENT" : "HIGH"
        });

        let text = `### 📌 Fact Analysis\n`;
        facts.forEach((f) => { text += `• ${f}\n`; });
        text += `\n### 💡 Smart Recommendation\n`;
        text += `• **What Needs Attention:** ${recTitle}\n`;
        text += `• **Why:** ${recReason}\n`;
        text += `• **Recommended Next Step:** ${recStep}\n`;

        return {
          decision: { facts, recommendations },
          text: text.trim(),
          sources,
          toolsUsed
        };
      }
    }

    // General attention / urgent / daily action queries
    // Filter high-risk documents
    const urgentDocs = docs.filter(
      (d) => d.userId === userId && (d.riskLevel === "URGENT" || d.riskLevel === "HIGH")
    );

    // Filter pending high-priority tasks
    const pendingUrgentTasks = tasks.filter(
      (t) => t.status === "PENDING" && (t.priority === "URGENT" || t.priority === "HIGH")
    );

    // Filter imminent deadlines
    const urgentDeadlines = deadlines.filter((dl) => dl.severity === "URGENT" || dl.severity === "HIGH");

    // Populate FACTS from stored user data
    if (urgentDocs.length > 0) {
      urgentDocs.forEach((d) => {
        const amountStr = d.extraction?.totalAmount ? ` ($${d.extraction.totalAmount.toFixed(2)})` : "";
        const dueStr = d.extraction?.dueDate ? ` due ${formatDateForDisplay(d.extraction.dueDate)}` : "";
        facts.push(`FACT: High-risk document "${d.title}" [${d.category}]${amountStr}${dueStr}.`);
      });
    }

    if (pendingUrgentTasks.length > 0) {
      pendingUrgentTasks.forEach((t) => {
        const dueStr = t.dueDate ? ` due ${formatDateForDisplay(t.dueDate)}` : "";
        facts.push(`FACT: Pending high-priority task "${t.title}" (${t.priority})${dueStr}.`);
      });
    }

    if (urgentDeadlines.length > 0) {
      urgentDeadlines.slice(0, 3).forEach((dl) => {
        facts.push(`FACT: Upcoming deadline "${dl.title}" due ${formatDateForDisplay(dl.dueDate)} (${dl.severity}).`);
      });
    }

    // Populate RECOMMENDATIONS from urgent items
    urgentDocs.forEach((doc) => {
      const issuer = doc.extraction?.issuer || doc.title;
      const amount = doc.extraction?.totalAmount;
      const dueDate = doc.extraction?.dueDate;
      const formattedDue = dueDate ? formatDateForDisplay(dueDate) : "Soon";

      recommendations.push({
        id: `rec-doc-${doc.id}`,
        title: `${issuer} - ${doc.category} (${doc.riskLevel} Risk)`,
        reason: doc.extraction?.plainLanguageSummary || doc.contentSummary || `Requires attention due to ${doc.riskLevel} priority level.`,
        suggestedAction: amount
          ? `Set a payment reminder or task to pay $${amount.toFixed(2)} before ${formattedDue}.`
          : `Review ${doc.title} details and verify key facts.`,
        actionType: "CREATE_TASK",
        actionArgs: {
          title: `Take action on ${doc.title}`,
          dueDate: dueDate || "Tomorrow",
          priority: doc.riskLevel === "URGENT" ? "URGENT" : "HIGH",
          documentId: doc.id
        },
        sourceDocumentId: doc.id,
        sourceDocumentTitle: doc.title,
        category: doc.category,
        dueDate: dueDate,
        amount: amount,
        priority: doc.riskLevel === "URGENT" ? "URGENT" : "HIGH"
      });
    });

    pendingUrgentTasks.forEach((task) => {
      if (!recommendations.some((r) => r.sourceDocumentId === task.documentId && task.documentId)) {
        recommendations.push({
          id: `rec-task-${task.id}`,
          title: `Pending Task: ${task.title}`,
          reason: `High priority task (${task.priority}) is pending completion.`,
          suggestedAction: `Complete task "${task.title}" to update your workspace state.`,
          actionType: "COMPLETE_TASK",
          actionArgs: {
            taskId: task.id,
            title: task.title
          },
          sourceDocumentId: task.documentId,
          sourceDocumentTitle: task.documentTitle,
          dueDate: task.dueDate,
          priority: task.priority
        });
      }
    });

    // Check if NO urgent items exist
    if (recommendations.length === 0) {
      if (docs.length > 0 || tasks.length > 0 || deadlines.length > 0) {
        const noUrgencyFact = `FACT: Your workspace contains 0 high-risk documents, 0 urgent tasks, and no immediate critical deadlines.`;
        facts.push(noUrgencyFact);
      }

      return {
        decision: { facts, recommendations: [] },
        text: `Good news! Everything in your workspace is up to date. You have no urgent items or overdue obligations requiring immediate attention today.`,
        sources,
        toolsUsed
      };
    }

    // Synthesize response text with clear FACT, RECOMMENDATION, ACTION distinction
    let text = `Here is your Smart Action & Decision analysis based on your live workspace data:\n\n`;

    text += `### 📌 FACT (Supported by stored documents & tasks)\n`;
    facts.forEach((f) => {
      text += `• ${f}\n`;
    });

    text += `\n### 💡 RECOMMENDATION (Suggested actions)\n`;
    recommendations.forEach((rec, idx) => {
      text += `${idx + 1}. **What Needs Attention:** ${rec.title}\n`;
      text += `   • **Why:** ${rec.reason}\n`;
      text += `   • **Recommended Next Step:** ${rec.suggestedAction}\n`;
      if (rec.sourceDocumentTitle) {
        text += `   • **Source Document:** ${rec.sourceDocumentTitle}\n`;
      }
      text += `\n`;
    });

    text += `### ⚡ ACTION (Requires your explicit confirmation)\n`;
    text += `Review the recommendations below. You can click any recommended action button to initiate task or reminder creation with human confirmation.`;

    return {
      decision: { facts, recommendations },
      text: text.trim(),
      sources,
      toolsUsed
    };
  }
}

export const globalSmartDecisionEngine = new SmartDecisionEngine();
