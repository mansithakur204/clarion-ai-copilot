import { GoogleGenAI } from "@google/genai";
import { agentTools } from "./tools";
import { AgentResponse, AgentTraceStep, IntentType, PendingAction, ActionIntentType, EmailDraft } from "./types";
import { SessionMemory } from "./memory";
import { clarionStore } from "../store";

const GEMINI_MODEL_NAME = "gemini-3.6-flash";

export class GeminiAgentEngine {
  private getApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  }

  isAvailable(): boolean {
    const key = this.getApiKey();
    return !!key && key.trim() !== "";
  }

  async processQuery(
    userQuery: string,
    sessionId: string = "default-session",
    userId?: string
  ): Promise<AgentResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const traceSteps: AgentTraceStep[] = [];
    const qLower = userQuery.trim().toLowerCase();

    // Step 1: Understanding Request
    traceSteps.push({
      id: `trace-1-${Date.now()}`,
      timestamp,
      step: "1. Understanding Request",
      detail: `Analyzed user input: "${userQuery.substring(0, 60)}${userQuery.length > 60 ? "..." : ""}"`,
      status: "COMPLETED"
    });

    const pendingAction = SessionMemory.getPendingAction(sessionId);

    // Check for explicit Confirmation or Cancellation when a pending action exists
    const isConfirm = pendingAction && (
      /\b(yes|confirm|proceed|do it|ok|sure|yeah|accept)\b/i.test(qLower) ||
      (pendingAction.args?.title && qLower.includes(String(pendingAction.args.title).toLowerCase()))
    );
    const isCancel = pendingAction && /\b(no|cancel|never mind|don't|stop|reject)\b/i.test(qLower);

    if (pendingAction && isConfirm) {
      traceSteps.push({
        id: `trace-2-${Date.now()}`,
        timestamp,
        step: "2. LLM Intent Analysis",
        detail: "User confirmed pending state-changing action",
        status: "COMPLETED"
      });

      let resultMessage = "";
      if (pendingAction.actionType === "CREATE_TASK") {
        const t = await agentTools.createTask({
          title: pendingAction.args.title,
          description: pendingAction.args.description,
          priority: pendingAction.args.priority,
          dueDate: pendingAction.args.dueDate,
          documentId: pendingAction.documentId,
          userId
        });
        resultMessage = `✅ Done! I created the task "${t.title}".`;
      } else if (pendingAction.actionType === "CREATE_REMINDER") {
        const r = await agentTools.createReminder({
          title: pendingAction.args.title,
          dueDate: pendingAction.args.dueDate,
          documentId: pendingAction.documentId,
          userId
        });
        resultMessage = `Done! I set a reminder for **"${r.title.replace('[REMINDER] ', '')}"**${r.dueDate ? ` on **${r.dueDate}**` : ""}.`;
      } else if (pendingAction.actionType === "COMPLETE_TASK") {
        const completed = await agentTools.completeTask(pendingAction.args.taskId || pendingAction.args.title, userId);
        const taskTitle = completed?.title || pendingAction.args.title;
        resultMessage = `✅ Done! I marked "${taskTitle}" as completed. 🎉`;
      }

      clarionStore.addAuditLog(
        pendingAction.documentId,
        pendingAction.documentTitle,
        "AGENT_ACTION_CONFIRMED",
        "USER",
        `User confirmed action: ${pendingAction.confirmationMessage}`,
        userId
      );

      clarionStore.addAuditLog(
        pendingAction.documentId,
        pendingAction.documentTitle,
        "AGENT_ACTION_EXECUTED",
        "AI_SYSTEM",
        `Copilot executed tool ${pendingAction.toolName} with args: ${JSON.stringify(pendingAction.args)}`,
        userId
      );

      SessionMemory.clearPendingAction(sessionId);

      traceSteps.push({
        id: `trace-6-${Date.now()}`,
        timestamp,
        step: "6. Action Execution",
        detail: `Successfully executed tool ${pendingAction.toolName}()`,
        status: "COMPLETED"
      });

      traceSteps.push({
        id: `trace-7-${Date.now()}`,
        timestamp,
        step: "7. Final Response",
        detail: "Confirmed action execution and updated workspace store",
        status: "COMPLETED"
      });

      return {
        text: resultMessage,
        traceSteps,
        intent: "CONFIRM_ACTION",
        toolsUsed: [pendingAction.toolName]
      };
    }

    if (pendingAction && isCancel) {
      clarionStore.addAuditLog(
        pendingAction.documentId,
        pendingAction.documentTitle,
        "AGENT_ACTION_CANCELLED",
        "USER",
        `User cancelled pending action: ${pendingAction.confirmationMessage}`
      );

      SessionMemory.clearPendingAction(sessionId);

      traceSteps.push({
        id: `trace-2-${Date.now()}`,
        timestamp,
        step: "2. LLM Intent Analysis",
        detail: "User cancelled proposed action",
        status: "COMPLETED"
      });

      traceSteps.push({
        id: `trace-7-${Date.now()}`,
        timestamp,
        step: "7. Final Response",
        detail: "Cancelled action; no changes made to workspace",
        status: "COMPLETED"
      });

      return {
        text: "Action cancelled. No changes were made to your tasks or documents.",
        traceSteps,
        intent: "CANCEL_ACTION",
        toolsUsed: []
      };
    }

    const hasWorkspaceKeyword =
      qLower.includes("task") ||
      qLower.includes("deadline") ||
      qLower.includes("document") ||
      qLower.includes("bill") ||
      qLower.includes("lease") ||
      qLower.includes("due") ||
      qLower.includes("urgent") ||
      qLower.includes("pay") ||
      qLower.includes("remind") ||
      qLower.includes("attention") ||
      qLower.includes("action") ||
      qLower.includes("create") ||
      qLower.includes("complete") ||
      qLower.includes("email") ||
      qLower.includes("draft") ||
      qLower.includes("summary") ||
      qLower.includes("overview");

    const isGreetingPattern = /^(hi|hello|helo|hallo|hey|greetings|good\s*(morning|afternoon|evening))/i.test(qLower) || qLower === "hi" || qLower === "hello" || qLower === "hey" || qLower === "helo";
    const isHowAreYouPattern = /how\s*(are|r)\s*(you|u)|how's\s*it\s*going|hows\s*it\s*going|how\s*do\s*you\s*do/i.test(qLower);
    const isNameIntroPattern = /(?:my\s*name|i\s*name|i\s*am|im|i'm|call\s*me)\s*(?:is|was)?\s*([a-zA-Z]+)/i.test(qLower);
    const isNameQueryPattern = /what\s*(is|'s)\s*your\s*name|who\s*are\s*you|who\s*made\s*you|introduce\s*yourself/i.test(qLower);
    const isCasualTalkPattern = /you\s*can\s*talk|can\s*we\s*talk|talk\s*to\s*me|tell\s*me\s*something|say\s*something|tell\s*me\s*a\s*joke/i.test(qLower);
    const isComplimentPattern = /you\s*(are|'re|re)\s*(nice|cool|awesome|great|helpful|smart|kind|sweet|good|amazing)/i.test(qLower);
    const isThanksPattern = /thank\s*you|thanks|thx|appreciate/i.test(qLower);

    const isConversational =
      (!hasWorkspaceKeyword && (isGreetingPattern || isHowAreYouPattern || isNameIntroPattern || isNameQueryPattern || isCasualTalkPattern || isComplimentPattern || isThanksPattern)) ||
      (!hasWorkspaceKeyword && userQuery.trim().length > 0 && userQuery.trim().length <= 35 && !qLower.includes("?"));

    if (isConversational) {
      const nameMatch = userQuery.match(/(?:my\s*name\s*is|i\s*name\s*is|my\s*name|i\s*am|im|i'm|call\s*me)\s+([a-zA-Z]+)/i);
      if (nameMatch && nameMatch[1]) {
        const extracted = nameMatch[1].trim();
        const nonNames = ["a", "an", "the", "good", "nice", "fine", "hello", "hi", "hey", "here", "just", "doing", "very", "so"];
        if (!nonNames.includes(extracted.toLowerCase())) {
          const capitalized = extracted.charAt(0).toUpperCase() + extracted.slice(1).toLowerCase();
          SessionMemory.setUserName(sessionId, capitalized);
        }
      }
      traceSteps.push({
        id: `trace-2-${Date.now()}`,
        timestamp,
        step: "2. Local Intent Classification",
        detail: "CONVERSATIONAL - Greeting / General Prompt Recognized",
        status: "COMPLETED"
      });

      traceSteps.push({
        id: `trace-3-${Date.now()}`,
        timestamp,
        step: "3. Tool Selection",
        detail: "No workspace tools required",
        status: "COMPLETED"
      });

      traceSteps.push({
        id: `trace-4-${Date.now()}`,
        timestamp,
        step: "4. Workspace Retrieval",
        detail: "Skipped (conversational prompt)",
        status: "COMPLETED"
      });

      const historyContext = SessionMemory.getContext(sessionId).history.slice(-6);

      const conversationalPrompt = `You are Clarion AI Copilot, a friendly, intelligent, and reassuring administrative assistant.

USER PROMPT: "${userQuery}"

RECENT CHAT CONTEXT:
${historyContext.map((h) => `${h.sender}: ${h.text}`).join("\n")}

STRICT INSTRUCTIONS:
1. Greet the user warmly by name if they introduce themselves (e.g. "Mansi").
2. Answer conversational questions naturally, concisely, and warmly.
3. Introduce yourself as Clarion AI Copilot and explain how you can help manage their administrative workload, documents, tasks, and deadlines if relevant.
4. Do not invent any document facts or fake dates.

Write your response:`;

      const finalRes = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: conversationalPrompt,
        config: { temperature: 0.3 }
      });

      const text = (finalRes.text || "Hello! I am your Clarion AI Copilot. How can I assist you today?").trim();

      traceSteps.push({
        id: `trace-5-${Date.now()}`,
        timestamp,
        step: "5. Final Response",
        detail: "Gemini conversational response",
        status: "COMPLETED"
      });

      return {
        text,
        traceSteps,
        intent: "GENERAL_HELP",
        toolsUsed: []
      };
    }

    // Step 2: Intent Analysis & Tool Decision via Gemini 3.6 Flash for Workspace Requests
    traceSteps.push({
      id: `trace-2-${Date.now()}`,
      timestamp,
      step: "2. LLM Intent Analysis",
      detail: `@google/genai SDK (${GEMINI_MODEL_NAME}) analyzing request & action intent`,
      status: "COMPLETED"
    });

    const activeEntity = SessionMemory.resolveFollowUpEntity(userQuery, sessionId);
    const historyContext = SessionMemory.getContext(sessionId).history.slice(-6);

    // Context retrieval step for workspace queries
    const targetDoc = await agentTools.summarizeDocument(activeEntity || userQuery);
    if (targetDoc) {
      SessionMemory.updateActiveDocument(sessionId, targetDoc);
    }

    traceSteps.push({
      id: `trace-3-${Date.now()}`,
      timestamp,
      step: "3. Workspace Context Retrieval",
      detail: targetDoc ? `Retrieved document context: "${targetDoc.title}" (${targetDoc.extraction?.issuer || "Workspace"})` : "Retrieved general workspace records",
      status: "COMPLETED"
    });

    const actionDecisionPrompt = `You are Clarion AI Copilot's intent & action classifier. Analyze the user prompt and decide whether this request is:
1. CREATE_TASK: User wants to create a new task or action item.
2. CREATE_REMINDER: User wants a reminder for a date, payment, or document.
3. COMPLETE_TASK: User wants to mark an existing task complete.
4. DRAFT_EMAIL: User wants an email draft written to a vendor, landlord, or contact.
5. READ_ONLY_QUERY: User asks a question, requests a summary, or has a conversation.

Available Workspace Context:
- Active Document: ${targetDoc ? `"${targetDoc.title}" (Issuer: ${targetDoc.extraction?.issuer || "N/A"}, Due Date: ${targetDoc.extraction?.dueDate || "None"})` : "None"}

User Message: "${userQuery}"

Respond ONLY with a JSON object:
{
  "actionType": "CREATE_TASK" | "CREATE_REMINDER" | "COMPLETE_TASK" | "DRAFT_EMAIL" | "READ_ONLY_QUERY",
  "title": "Short title for task/reminder/subject",
  "description": "Short details",
  "dueDate": "YYYY-MM-DD or string (e.g. tomorrow, 2026-09-02) or null",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "emailTo": "Recipient email or organization name if DRAFT_EMAIL",
  "emailSubject": "Email subject if DRAFT_EMAIL",
  "emailBody": "Complete professional email text if DRAFT_EMAIL",
  "reasoning": "1-sentence explanation"
}`;

    let actionType = "READ_ONLY_QUERY";
    let title = userQuery;
    let description = "";
    let dueDate = targetDoc?.extraction?.dueDate || "Tomorrow";
    let priority = "HIGH";
    let emailTo = "";
    let emailSubject = "";
    let emailBody = "";
    let reasoning = "Read-only workspace analysis via Gemini 3.6 Flash";

    try {
      const decisionRes = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: actionDecisionPrompt,
        config: { responseMimeType: "application/json", temperature: 0.1 }
      });

      if (decisionRes.text) {
        const parsed = JSON.parse(decisionRes.text);
        actionType = parsed.actionType || "READ_ONLY_QUERY";
        title = parsed.title || title;
        description = parsed.description || "";
        dueDate = parsed.dueDate || dueDate;
        priority = parsed.priority || priority;
        emailTo = parsed.emailTo || "";
        emailSubject = parsed.emailSubject || "";
        emailBody = parsed.emailBody || "";
        reasoning = parsed.reasoning || reasoning;
      }
    } catch (err: any) {
      const isQuota = String(err).includes("429") || String(err).includes("RESOURCE_EXHAUSTED");
      if (isQuota) {
        console.warn("[GeminiEngine] API quota unavailable (429)");
        throw err;
      }
      console.warn("[GeminiEngine] Action classifier fallback:", err?.message || err);
    }

    // Step 4: Proposed Action / Tool Selection
    traceSteps.push({
      id: `trace-4-${Date.now()}`,
      timestamp,
      step: `4. Proposed Action / Tool Selection: ${actionType}`,
      detail: reasoning,
      status: "COMPLETED"
    });

    // Handle Email Drafting Exception (No confirmation required, never auto-send)
    if (actionType === "DRAFT_EMAIL") {
      const emailDraft: EmailDraft = await agentTools.draftEmail({
        to: emailTo || targetDoc?.extraction?.issuer || "Recipient",
        subject: emailSubject || `Regarding ${targetDoc?.title || "Account Action"}`,
        body: emailBody || `Dear ${targetDoc?.extraction?.issuer || "Team"},\n\nI am writing regarding ${targetDoc?.title || "my account"}. Please let me know the next steps.\n\nThank you,`,
        documentId: targetDoc?.id
      });

      traceSteps.push({
        id: `trace-7-${Date.now()}`,
        timestamp,
        step: "7. Final Response",
        detail: "Generated email draft for user review. Email will not be sent automatically.",
        status: "COMPLETED"
      });

      const draftText = `Here is a draft of your email to **${emailDraft.to}**:

**Subject:** ${emailDraft.subject}

\`\`\`
${emailDraft.body}
\`\`\`

*You can review or edit this text before sending it manually.*`;

      return {
        text: draftText,
        traceSteps,
        intent: "DRAFT_EMAIL",
        toolsUsed: ["draftEmail"],
        emailDraft
      };
    }

    // Handle State-Changing Action Proposals (Require Confirmation)
    if (actionType === "CREATE_TASK" || actionType === "CREATE_REMINDER" || actionType === "COMPLETE_TASK") {
      const newPendingAction: PendingAction = {
        id: `action-${Date.now()}`,
        actionType: actionType as ActionIntentType,
        toolName: actionType === "CREATE_TASK" ? "createTask" : actionType === "CREATE_REMINDER" ? "createReminder" : "completeTask",
        args: { title, description, priority, dueDate, taskId: title },
        confirmationMessage: `Action: ${actionType.replace('_', ' ')}\nTitle: ${title}\nDue Date: ${dueDate || "None"}\nPriority: ${priority}`,
        timestamp: new Date().toISOString(),
        documentId: targetDoc?.id,
        documentTitle: targetDoc?.title
      };

      SessionMemory.setPendingAction(sessionId, newPendingAction);

      clarionStore.addAuditLog(
        targetDoc?.id,
        targetDoc?.title,
        "AGENT_ACTION_PROPOSED",
        "AI_SYSTEM",
        `Copilot proposed action: ${newPendingAction.confirmationMessage}`
      );

      // Step 5: Waiting for Human Confirmation
      traceSteps.push({
        id: `trace-5-${Date.now()}`,
        timestamp,
        step: "5. Waiting for Human Confirmation",
        detail: "Proposed state-changing action requiring explicit user approval before execution",
        status: "COMPLETED"
      });

      const proposalText = `I can execute the following action for you:

• **Action:** ${actionType.replace('_', ' ')}
• **Details:** ${title}
${targetDoc ? `• **Related Document:** ${targetDoc.title}` : ""}
${dueDate ? `• **Due Date:** ${dueDate}` : ""}
• **Priority:** ${priority}

Would you like me to proceed?`;

      return {
        text: proposalText,
        traceSteps,
        intent: actionType as IntentType,
        toolsUsed: [newPendingAction.toolName],
        pendingAction: newPendingAction
      };
    }

    // Fallback Read-Only Queries
    let retrievedDataStr = "No tool data retrieved.";
    const docs = await agentTools.getDocuments(userId);
    const tasks = await agentTools.getTasks(userId);
    const deadlines = await agentTools.getUpcomingDeadlines(userId);

    retrievedDataStr = JSON.stringify({ docs: docs.slice(0, 3), tasks: tasks.slice(0, 5), deadlines: deadlines.slice(0, 3) });

    const finalPrompt = `You are Clarion AI Copilot, a helpful, privacy-first administrative assistant.

USER PROMPT: "${userQuery}"

RETRIEVED WORKSPACE DATA:
"""
${retrievedDataStr}
"""

STRICT INSTRUCTIONS:
1. Greet the user warmly if they introduce themselves or say hello.
2. Format response cleanly using Markdown (**bold**, bullet points •).
3. If workspace data was retrieved, use exact facts. Never invent fake dates or amounts.

Write your final response:`;

    const finalRes = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: finalPrompt,
      config: { temperature: 0.3 }
    });

    traceSteps.push({
      id: `trace-7-${Date.now()}`,
      timestamp,
      step: "7. Final Response",
      detail: `Synthesized response via ${GEMINI_MODEL_NAME}`,
      status: "COMPLETED"
    });

    return {
      text: (finalRes.text || "I have analyzed your workspace.").trim(),
      traceSteps,
      intent: "GENERAL_HELP",
      toolsUsed: ["getDocuments", "getTasks"]
    };
  }
}
