import { agentTools } from "./tools";
import { AgentResponse, AgentTraceStep, IntentType, EmailDraft, PendingAction, DocumentSourceCitation } from "./types";
import { SessionMemory } from "./memory";
import { clarionStore } from "../store";
import { formatDateForDisplay } from "../dateUtils";
import { globalSmartDecisionEngine } from "./decisionEngine";

export class MockAgentEngine {
  async processQuery(
    userQuery: string,
    sessionId: string = "default-session",
    userId?: string
  ): Promise<AgentResponse> {
    const qLower = userQuery.toLowerCase().trim();
    const traceSteps: AgentTraceStep[] = [];
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const pendingAction = SessionMemory.getPendingAction(sessionId);
    const isConfirm = pendingAction && (
      /\b(yes|confirm|proceed|do it|ok|sure|yeah|accept)\b/i.test(qLower) ||
      (pendingAction.args?.title && qLower.includes(String(pendingAction.args.title).toLowerCase()))
    );
    const isCancel = pendingAction && /\b(no|cancel|never mind|don't|stop|reject)\b/i.test(qLower);

    if (pendingAction && isConfirm) {
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
        `User confirmed action: ${pendingAction.confirmationMessage}`
      );

      clarionStore.addAuditLog(
        pendingAction.documentId,
        pendingAction.documentTitle,
        "AGENT_ACTION_EXECUTED",
        "AI_SYSTEM",
        `Copilot executed tool ${pendingAction.toolName} with args: ${JSON.stringify(pendingAction.args)}`
      );

      SessionMemory.clearPendingAction(sessionId);

      return {
        text: resultMessage,
        traceSteps: [
          { id: `t1-${Date.now()}`, timestamp, step: "1. Understanding Request", detail: `User confirmed action: ${pendingAction.toolName}`, status: "COMPLETED" },
          { id: `t2-${Date.now()}`, timestamp, step: "2. Confirmation Recognized", detail: "Confirmed pending state-changing action", status: "COMPLETED" },
          { id: `t3-${Date.now()}`, timestamp, step: `3. Executing Tool → ${pendingAction.toolName}()`, detail: `Executed ${pendingAction.toolName}()`, status: "COMPLETED" },
          { id: `t4-${Date.now()}`, timestamp, step: "4. Action Completed Successfully", status: "COMPLETED" }
        ],
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

      return {
        text: "Action cancelled. No changes were made to your tasks or documents.",
        traceSteps: [
          { id: `t1-${Date.now()}`, timestamp, step: "1. Understanding Request", status: "COMPLETED" },
          { id: `t2-${Date.now()}`, timestamp, step: "2. LLM Intent Analysis", detail: "Cancelled proposed action", status: "COMPLETED" },
          { id: `t7-${Date.now()}`, timestamp, step: "7. Final Response", status: "COMPLETED" }
        ],
        intent: "CANCEL_ACTION",
        toolsUsed: []
      };
    }

    // 1. High-Priority Action Intent Detection (CREATE_TASK, COMPLETE_TASK, CREATE_REMINDER, DRAFT_EMAIL)
    const isRecommendationAction = !pendingAction && /\b(do that|do this|handle that|take care of that|action that|do it)\b/i.test(qLower);
    const isCreateTask = isRecommendationAction || /create\s+(a\s+)?task|add\s+(a\s+)?task|make\s+(a\s+)?task|new\s+task|remind\s+me\s+to\s+create\s+a\s+task/i.test(qLower);
    const isCompleteTask = /mark\s+.*?\s+as\s+(complete|done|finished)|complete\s+(the\s+)?.*?|finish\s+(the\s+)?.*?|done\s+with\s+(the\s+)?.*?/i.test(qLower);
    const isCreateReminder = /remind\s+me\s+to|remind\s+me\s+about|set\s+(a\s+)?reminder|create\s+(a\s+)?reminder/i.test(qLower);
    const isDraftEmail = /draft\s+(an?\s+)?email|write\s+(an?\s+)?email|compose\s+(an?\s+)?email/i.test(qLower);

    if (isCreateTask) {
      let rawTitle = userQuery
        .replace(/^(remind me to create a task|create a task to|add a task to|make a task to|create task to|add task to|make task to|create a task|add a task|make a task|create task|add task|make task|new task)\s*/i, "")
        .trim();

      let extractedDueDate = "Tomorrow";
      if (/\btomorrow\b/i.test(rawTitle) || /\btomorrow\b/i.test(userQuery)) {
        extractedDueDate = "Tomorrow";
        rawTitle = rawTitle.replace(/\s*tomorrow\b/gi, "").trim();
      } else if (/\btoday\b/i.test(rawTitle) || /\btoday\b/i.test(userQuery)) {
        extractedDueDate = "Today";
        rawTitle = rawTitle.replace(/\s*today\b/gi, "").trim();
      }

      if (isRecommendationAction || /^(do that|do this|do it|take care of that|handle that)$/i.test(rawTitle)) {
        const activeEntity = SessionMemory.resolveFollowUpEntity("it", sessionId);
        rawTitle = activeEntity ? `Pay ${activeEntity}` : "Pay recommended utility bill";
      } else if (rawTitle.length > 0) {
        rawTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
      } else {
        rawTitle = "Review project details";
      }

      const newPendingAction: PendingAction = {
        id: `action-${Date.now()}`,
        actionType: "CREATE_TASK",
        toolName: "createTask",
        args: { title: rawTitle, description: `Task created from prompt: "${userQuery}"`, priority: "HIGH", dueDate: extractedDueDate },
        confirmationMessage: `Action: CREATE TASK\nTitle: ${rawTitle}\nDue Date: ${extractedDueDate}\nPriority: HIGH`,
        timestamp: new Date().toISOString()
      };

      SessionMemory.setPendingAction(sessionId, newPendingAction);

      clarionStore.addAuditLog(
        undefined,
        undefined,
        "AGENT_ACTION_PROPOSED",
        "AI_SYSTEM",
        `Copilot proposed action: ${newPendingAction.confirmationMessage}`
      );

      const proposalText = `I can create this task for you 😊\n\n📋 **Task:** ${rawTitle}\n📅 **Due Date:** ${extractedDueDate}\n\nWould you like me to create it?`;

      return {
        text: proposalText,
        traceSteps: [
          { id: `t1-${Date.now()}`, timestamp, step: "1. Understanding Request", detail: `Analyzed user input: "${userQuery}"`, status: "COMPLETED" },
          { id: `t2-${Date.now()}`, timestamp, step: "2. Local Intent Classification", detail: "Action Intent Recognized: CREATE_TASK", status: "COMPLETED" },
          { id: `t4-${Date.now()}`, timestamp, step: "3. Proposed Action / Tool Selection → CREATE_TASK", detail: `Title: "${rawTitle}" | Due: ${extractedDueDate}`, status: "COMPLETED" },
          { id: `t5-${Date.now()}`, timestamp, step: "4. Waiting for Human Confirmation", detail: "Proposed state-changing action requiring explicit user approval", status: "COMPLETED" }
        ],
        intent: "CREATE_TASK",
        toolsUsed: ["createTask"],
        pendingAction: newPendingAction
      };
    }

    if (isCompleteTask) {
      const allTasks = await agentTools.getTasks(userId);
      const pendingTasks = allTasks.filter((t) => t.status === "PENDING");

      let taskSearchQuery = userQuery
        .replace(/^(mark|complete|finish)\s+(the\s+)?/i, "")
        .replace(/\s+(task\s+)?as\s+(complete|done|finished)$/i, "")
        .replace(/\s+task$/i, "")
        .trim();

      const matches = pendingTasks.filter((t) => {
        const titleLower = t.title.toLowerCase();
        const searchLower = taskSearchQuery.toLowerCase();
        return titleLower.includes(searchLower) || searchLower.includes(titleLower);
      });

      if (matches.length === 0) {
        return {
          text: `I couldn't find any pending task matching **"${taskSearchQuery || userQuery}"**. Please check your pending tasks list or specify the exact task name.`,
          traceSteps: [
            { id: `t1-${Date.now()}`, timestamp, step: "1. Understanding Request", detail: `Analyzed user input: "${userQuery}"`, status: "COMPLETED" },
            { id: `t2-${Date.now()}`, timestamp, step: "2. Local Intent Classification: COMPLETE_TASK", status: "COMPLETED" },
            { id: `t3-${Date.now()}`, timestamp, step: "3. Tool Selection: getTasks()", detail: "Searched pending tasks in Clarion store", status: "COMPLETED" },
            { id: `t4-${Date.now()}`, timestamp, step: "4. Result", detail: "No matching pending task found", status: "FAILED" }
          ],
          intent: "COMPLETE_TASK",
          toolsUsed: ["getTasks"]
        };
      }

      if (matches.length > 1) {
        let text = `I found multiple pending tasks matching **"${taskSearchQuery}"**:\n\n`;
        matches.forEach((t) => {
          text += `• **${t.title}**${t.dueDate ? ` (Due: ${t.dueDate})` : ""}\n`;
        });
        text += `\nPlease specify which task you would like to mark as complete.`;

        return {
          text,
          traceSteps: [
            { id: `t1-${Date.now()}`, timestamp, step: "1. Understanding Request", detail: `Analyzed user input: "${userQuery}"`, status: "COMPLETED" },
            { id: `t2-${Date.now()}`, timestamp, step: "2. Local Intent Classification: COMPLETE_TASK", status: "COMPLETED" },
            { id: `t3-${Date.now()}`, timestamp, step: "3. Tool Selection: getTasks()", detail: `Found ${matches.length} matching tasks`, status: "COMPLETED" },
            { id: `t4-${Date.now()}`, timestamp, step: "4. Ambiguity Resolution", detail: "Requested specific task selection", status: "COMPLETED" }
          ],
          intent: "COMPLETE_TASK",
          toolsUsed: ["getTasks"]
        };
      }

      const targetTask = matches[0];

      const newPendingAction: PendingAction = {
        id: `action-${Date.now()}`,
        actionType: "COMPLETE_TASK",
        toolName: "completeTask",
        args: { taskId: targetTask.id, title: targetTask.title },
        confirmationMessage: `Action: COMPLETE TASK\nTitle: ${targetTask.title}\nTask ID: ${targetTask.id}`,
        timestamp: new Date().toISOString()
      };

      SessionMemory.setPendingAction(sessionId, newPendingAction);

      clarionStore.addAuditLog(
        targetTask.documentId,
        targetTask.documentTitle,
        "AGENT_ACTION_PROPOSED",
        "AI_SYSTEM",
        `Copilot proposed action: ${newPendingAction.confirmationMessage}`
      );

      const proposalText = `I can mark this task as completed 😊\n\n📋 **Task:** ${targetTask.title}\n📌 **Current Status:** Pending\n\nWould you like me to mark it as complete?`;

      return {
        text: proposalText,
        traceSteps: [
          { id: `t1-${Date.now()}`, timestamp, step: "1. Understanding Request", detail: `Analyzed user input: "${userQuery}"`, status: "COMPLETED" },
          { id: `t2-${Date.now()}`, timestamp, step: "2. Local Intent Classification → COMPLETE_TASK", status: "COMPLETED" },
          { id: `t3-${Date.now()}`, timestamp, step: "3. Proposed Action / Tool Selection → COMPLETE_TASK", detail: `Task: "${targetTask.title}" (ID: ${targetTask.id})`, status: "COMPLETED" },
          { id: `t4-${Date.now()}`, timestamp, step: "4. Waiting for Human Confirmation", detail: "Proposed state-changing action requiring explicit user approval", status: "COMPLETED" }
        ],
        intent: "COMPLETE_TASK",
        toolsUsed: ["completeTask"],
        pendingAction: newPendingAction
      };
    }

    if (isCreateReminder) {
      let rawTitle = userQuery
        .replace(/^(remind me to|remind me about|set a reminder for|set reminder for|create a reminder for|create reminder for)\s*/i, "")
        .trim();

      let extractedDueDate = "Tomorrow";
      if (/\btomorrow\b/i.test(rawTitle) || /\btomorrow\b/i.test(userQuery)) {
        extractedDueDate = "Tomorrow";
        rawTitle = rawTitle.replace(/\s*tomorrow\b/gi, "").trim();
      }

      if (!rawTitle) rawTitle = "Upcoming deadline";

      const newPendingAction: PendingAction = {
        id: `action-${Date.now()}`,
        actionType: "CREATE_REMINDER",
        toolName: "createReminder",
        args: { title: rawTitle, dueDate: extractedDueDate },
        confirmationMessage: `Action: CREATE REMINDER\nTitle: ${rawTitle}\nDue Date: ${extractedDueDate}`,
        timestamp: new Date().toISOString()
      };

      SessionMemory.setPendingAction(sessionId, newPendingAction);

      clarionStore.addAuditLog(
        undefined,
        undefined,
        "AGENT_ACTION_PROPOSED",
        "AI_SYSTEM",
        `Copilot proposed action: ${newPendingAction.confirmationMessage}`
      );

      const proposalText = `I can set a reminder for **"${rawTitle}"** (${extractedDueDate}) 😊\n\nWould you like me to create it?`;

      return {
        text: proposalText,
        traceSteps: [
          { id: `t1-${Date.now()}`, timestamp, step: "1. Understanding Request", detail: `Analyzed user input: "${userQuery}"`, status: "COMPLETED" },
          { id: `t2-${Date.now()}`, timestamp, step: "2. Local Intent Classification", detail: "Action Intent Recognized: CREATE_REMINDER", status: "COMPLETED" },
          { id: `t4-${Date.now()}`, timestamp, step: "4. Proposed Action / Tool Selection: CREATE_REMINDER", detail: `Title: "${rawTitle}"`, status: "COMPLETED" },
          { id: `t5-${Date.now()}`, timestamp, step: "5. Waiting for Human Confirmation", detail: "Proposed state-changing action requiring explicit user approval", status: "COMPLETED" }
        ],
        intent: "CREATE_REMINDER",
        toolsUsed: ["createReminder"],
        pendingAction: newPendingAction
      };
    }

    if (isDraftEmail) {
      const emailDraft: EmailDraft = await agentTools.draftEmail({
        to: "Recipient",
        subject: `Regarding ${userQuery}`,
        body: `Dear Contact,\n\nI am writing regarding my recent inquiry: "${userQuery}". Please let me know the next steps.\n\nThank you,`
      });

      const draftText = `Here is a draft of your email to **${emailDraft.to}**:\n\n**Subject:** ${emailDraft.subject}\n\n\`\`\`\n${emailDraft.body}\n\`\`\`\n\n*You can review or edit this text before sending it manually.*`;

      return {
        text: draftText,
        traceSteps: [
          { id: `t1-${Date.now()}`, timestamp, step: "1. Understanding Request", detail: `Analyzed user input: "${userQuery}"`, status: "COMPLETED" },
          { id: `t2-${Date.now()}`, timestamp, step: "2. Local Intent Classification", detail: "Action Intent Recognized: DRAFT_EMAIL", status: "COMPLETED" },
          { id: `t7-${Date.now()}`, timestamp, step: "7. Final Response", detail: "Generated email draft for user review. Email will not be sent automatically.", status: "COMPLETED" }
        ],
        intent: "DRAFT_EMAIL",
        toolsUsed: ["draftEmail"],
        emailDraft
      };
    }

    // 2. Explicit workspace keywords check
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

    // Conversational & Greeting patterns (including typos, name intros, casual chat)
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
      // Extract user name if mentioned in intro patterns
      const nameMatch = userQuery.match(/(?:my\s*name\s*is|i\s*name\s*is|my\s*name|i\s*am|im|i'm|call\s*me)\s+([a-zA-Z]+)/i);
      if (nameMatch && nameMatch[1]) {
        const extracted = nameMatch[1].trim();
        const nonNames = ["a", "an", "the", "good", "nice", "fine", "hello", "hi", "hey", "here", "just", "doing", "very", "so"];
        if (!nonNames.includes(extracted.toLowerCase())) {
          const capitalized = extracted.charAt(0).toUpperCase() + extracted.slice(1).toLowerCase();
          SessionMemory.setUserName(sessionId, capitalized);
        }
      }
      const savedName = SessionMemory.getUserName(sessionId);

      let responseText = "";
      if (isComplimentPattern) {
        responseText = `Thank you${savedName ? `, ${savedName}` : ""}! 😊 That's really nice of you to say! I'm always happy to chat and help you stay organized.`;
      } else if (qLower.includes("tell me something") || qLower.includes("say something") || qLower.includes("tell me a joke")) {
        responseText = `Of course${savedName ? `, ${savedName}` : ""}! 😊 What would you like to talk about? I can chat with you or help manage your tasks, documents, and deadlines.`;
      } else if (isThanksPattern) {
        responseText = `You're very welcome${savedName ? `, ${savedName}` : ""}! 😊 Let me know whenever you need help with your documents or tasks.`;
      } else if (isHowAreYouPattern) {
        responseText = `Hello${savedName ? ` ${savedName}` : ""}! I'm doing great, thank you for asking 😊 How are you doing today?`;
      } else if (isNameQueryPattern) {
        responseText = `Nice to meet you${savedName ? `, ${savedName}` : ""}! 😊 I'm Clarion AI Copilot, your AI-powered administrative assistant.`;
      } else if (isCasualTalkPattern) {
        responseText = `Absolutely${savedName ? `, ${savedName}` : ""}! 😊 I'd be happy to chat with you and also help manage your documents, tasks, and deadlines.`;
      } else if (savedName && (isNameIntroPattern || isGreetingPattern)) {
        responseText = `Nice to meet you, ${savedName}! 😊 I'm Clarion AI Copilot, your AI-powered administrative assistant. How can I help you today?`;
      } else {
        responseText = `Hello${savedName ? ` ${savedName}` : ""}! 😊 How are you? I'm Clarion AI Copilot, ready to assist you with your administrative tasks, documents, and deadlines.`;
      }

      return {
        text: responseText,
        traceSteps: [
          { id: `t1-${Date.now()}`, timestamp, step: "1. Understanding Request", detail: `Analyzed prompt: "${userQuery}"`, status: "COMPLETED" },
          { id: `t2-${Date.now()}`, timestamp, step: "Local Intent Classification", detail: "CONVERSATIONAL", status: "COMPLETED" },
          { id: `t3-${Date.now()}`, timestamp, step: "Tool Selection", detail: "No workspace tools required", status: "COMPLETED" },
          { id: `t4-${Date.now()}`, timestamp, step: "Workspace Retrieval", detail: "Skipped", status: "COMPLETED" },
          { id: `t5-${Date.now()}`, timestamp, step: "Final Response", detail: "Local conversational fallback", status: "COMPLETED" }
        ],
        intent: "CONVERSATIONAL",
        toolsUsed: []
      };
    }

    // Step 1: Intent Detection
    let intent: IntentType = "GENERAL_HELP";

    if (
      qLower.includes("attention") ||
      qLower.includes("urgent") ||
      qLower.includes("need my attention") ||
      qLower.includes("anything critical") ||
      qLower.includes("what should i do") ||
      qLower.includes("take care of")
    ) {
      intent = "ATTENTION_QUERY";
    } else if (
      qLower.includes("task") ||
      qLower.includes("action item") ||
      qLower.includes("pending task") ||
      qLower.includes("to-do")
    ) {
      intent = "TASK_QUERY";
    } else if (
      qLower.includes("deadline") ||
      qLower.includes("due date") ||
      qLower.includes("when is") ||
      qLower.includes("coming up") ||
      qLower.includes("upcoming")
    ) {
      // Check if asking about specific entity vs general deadlines
      const resolvedEntity = SessionMemory.resolveFollowUpEntity(userQuery, sessionId);
      if (resolvedEntity && (qLower.includes("it") || qLower.includes("when") || qLower.includes("this") || qLower.includes("that") || qLower.includes("document"))) {
        intent = "FOLLOW_UP_QUERY";
      } else {
        intent = "DEADLINE_QUERY";
      }
    } else if (
      qLower.includes("summarize my recent") ||
      qLower.includes("summarize my documents") ||
      qLower.includes("all documents") ||
      qLower.includes("list my documents") ||
      qLower.includes("overview of documents")
    ) {
      intent = "SUMMARIZE_DOCS";
    } else if (
      qLower.includes("most urgent") ||
      qLower.includes("highest priority") ||
      qLower.includes("top urgent")
    ) {
      intent = "MOST_URGENT_DOC";
    } else if (
      qLower.includes("electricity") ||
      qLower.includes("bill") ||
      qLower.includes("brightgrid") ||
      qLower.includes("lease") ||
      qLower.includes("contract") ||
      qLower.includes("claim") ||
      qLower.includes("resume") ||
      qLower.includes("documentation")
    ) {
      intent = "DOCUMENT_SPECIFIC";
    } else {
      // Check follow-up pronoun resolution
      const resolvedEntity = SessionMemory.resolveFollowUpEntity(userQuery, sessionId);
      if (resolvedEntity) {
        intent = "FOLLOW_UP_QUERY";
      }
    }

    traceSteps.push({
      id: `trace-1-${Date.now()}`,
      timestamp,
      step: "Understood user request",
      detail: `Detected Intent: ${intent}`,
      status: "COMPLETED"
    });

    // Step 2: Route Intent to Tools & Generate Response
    switch (intent) {
      case "ATTENTION_QUERY": {
        traceSteps.push({
          id: `trace-2-${Date.now()}`,
          timestamp,
          step: "Selected Tool: SmartDecisionEngine",
          detail: "Evaluating workspace documents, RAG chunks, tasks, and deadlines for decision analysis",
          status: "COMPLETED"
        });

        const decisionRes = await globalSmartDecisionEngine.evaluateSmartActions(userId, userQuery);

        if (decisionRes.decision.recommendations.length === 0 && decisionRes.decision.facts.length === 0) {
          const text = "Your workspace is up to date! You have no urgent tasks, upcoming deadlines, or pending obligations right now.";
          return {
            text,
            traceSteps: [
              ...traceSteps,
              {
                id: `trace-3-${Date.now()}`,
                timestamp,
                step: "Retrieved workspace state & structured recommendations",
                detail: "Clean workspace: 0 urgent items found",
                status: "COMPLETED"
              }
            ],
            intent,
            facts: [],
            recommendations: [],
            toolsUsed: ["SmartDecisionEngine"]
          };
        }

        traceSteps.push({
          id: `trace-3-${Date.now()}`,
          timestamp,
          step: "Retrieved workspace state & structured recommendations",
          detail: `Found ${decisionRes.decision.recommendations.length} recommendation(s) and ${decisionRes.decision.facts.length} fact(s).`,
          status: "COMPLETED"
        });

        return {
          text: decisionRes.text,
          traceSteps,
          intent,
          toolsUsed: decisionRes.toolsUsed,
          facts: decisionRes.decision.facts,
          recommendations: decisionRes.decision.recommendations,
          sources: decisionRes.sources.length > 0 ? decisionRes.sources : undefined
        };
      }

      case "TASK_QUERY": {
        traceSteps.push({
          id: `trace-2-${Date.now()}`,
          timestamp,
          step: "Selected Tool: getTasks()",
          detail: "Retrieving action items from Clarion store",
          status: "COMPLETED"
        });

        const tasks = await agentTools.getTasks(userId);
        const pendingTasks = tasks.filter((t) => t.status === "PENDING");
        const completedTasks = tasks.filter((t) => t.status === "COMPLETED");

        traceSteps.push({
          id: `trace-3-${Date.now()}`,
          timestamp,
          step: `Retrieved ${tasks.length} total task(s)`,
          detail: `${pendingTasks.length} pending, ${completedTasks.length} completed`,
          status: "COMPLETED"
        });

        if (pendingTasks.length === 0) {
          return {
            text: "You currently have no pending tasks or action items requiring human verification.",
            traceSteps,
            intent,
            toolsUsed: ["getTasks"]
          };
        }

        let responseText = `You have **${pendingTasks.length} pending task(s)**:\n\n`;
        pendingTasks.forEach((t, idx) => {
          const dueStr = t.dueDate ? ` (Due: ${formatDateForDisplay(t.dueDate)})` : " (No deadline)";
          const priorityBadge = `[${t.priority}]`;
          responseText += `${idx + 1}. **${t.title}** ${priorityBadge}${dueStr}\n`;
          if (t.description) {
            responseText += `   *${t.description}*\n`;
          }
        });

        traceSteps.push({
          id: `trace-4-${Date.now()}`,
          timestamp,
          step: "Generated natural language synthesis",
          status: "COMPLETED"
        });

        return {
          text: responseText.trim(),
          traceSteps,
          intent,
          toolsUsed: ["getTasks"]
        };
      }

      case "DEADLINE_QUERY": {
        traceSteps.push({
          id: `trace-2-${Date.now()}`,
          timestamp,
          step: "Selected Tool: getUpcomingDeadlines()",
          detail: "Searching for administrative deadlines across documents and tasks",
          status: "COMPLETED"
        });

        const deadlines = await agentTools.getUpcomingDeadlines(userId);

        traceSteps.push({
          id: `trace-3-${Date.now()}`,
          timestamp,
          step: `Retrieved ${deadlines.length} deadline(s)`,
          detail: "Sorted chronologically by due date",
          status: "COMPLETED"
        });

        if (deadlines.length === 0) {
          return {
            text: "No upcoming administrative deadlines were found in your processed documents or tasks.",
            traceSteps,
            intent,
            toolsUsed: ["getUpcomingDeadlines"]
          };
        }

        let responseText = `Here are your upcoming administrative deadlines sorted by urgency:\n\n`;
        deadlines.forEach((dl, idx) => {
          responseText += `${idx + 1}. 📅 **${dl.title}**\n   • **Due Date:** ${formatDateForDisplay(dl.dueDate)}\n   • **Severity:** ${dl.severity}\n`;
          if (dl.documentTitle) {
            responseText += `   • **Source Document:** ${dl.documentTitle}\n`;
          }
          responseText += `\n`;
        });

        traceSteps.push({
          id: `trace-4-${Date.now()}`,
          timestamp,
          step: "Generated natural language synthesis",
          status: "COMPLETED"
        });

        return {
          text: responseText.trim(),
          traceSteps,
          intent,
          toolsUsed: ["getUpcomingDeadlines"]
        };
      }

      case "SUMMARIZE_DOCS": {
        traceSteps.push({
          id: `trace-2-${Date.now()}`,
          timestamp,
          step: "Selected Tool: getDocuments()",
          detail: "Fetching catalog of ingested workspace documents",
          status: "COMPLETED"
        });

        const docs = await agentTools.getDocuments(userId);

        traceSteps.push({
          id: `trace-3-${Date.now()}`,
          timestamp,
          step: `Retrieved ${docs.length} processed document(s)`,
          status: "COMPLETED"
        });

        if (docs.length === 0) {
          return {
            text: "Your workspace currently has no uploaded or processed documents. Upload a bill, contract, notice, or documentation to get started.",
            traceSteps,
            intent,
            toolsUsed: ["getDocuments"]
          };
        }

        let responseText = `Here is a summary of your **${docs.length} processed document(s)**:\n\n`;
        docs.forEach((doc, idx) => {
          const typeStr = doc.extraction?.documentType || doc.category;
          const subjectStr = doc.extraction?.issuer || doc.extraction?.subject || doc.title;
          const amountStr = doc.extraction?.totalAmount ? ` | Amount: $${doc.extraction.totalAmount.toFixed(2)}` : "";
          const dueStr = doc.extraction?.dueDate ? ` | Due: ${formatDateForDisplay(doc.extraction.dueDate)}` : "";

          responseText += `${idx + 1}. **${doc.title}**\n   • **Type:** ${typeStr} (Risk: ${doc.riskLevel})\n   • **Subject / Biller:** ${subjectStr}${amountStr}${dueStr}\n   • **Summary:** ${doc.extraction?.plainLanguageSummary || doc.contentSummary || "No summary available."}\n\n`;
        });

        traceSteps.push({
          id: `trace-4-${Date.now()}`,
          timestamp,
          step: "Generated natural language synthesis",
          status: "COMPLETED"
        });

        return {
          text: responseText.trim(),
          traceSteps,
          intent,
          toolsUsed: ["getDocuments"]
        };
      }

      case "MOST_URGENT_DOC": {
        traceSteps.push({
          id: `trace-2-${Date.now()}`,
          timestamp,
          step: "Selected Tool: getDocuments()",
          detail: "Evaluating document risk scores and deadline urgency",
          status: "COMPLETED"
        });

        const docs = await agentTools.getDocuments(userId);

        if (docs.length === 0) {
          return {
            text: "You have no processed documents in your workspace.",
            traceSteps,
            intent,
            toolsUsed: ["getDocuments"]
          };
        }

        // Sort by risk priority score (5 highest, 1 lowest) and deadline
        const sortedDocs = [...docs].sort((a, b) => {
          const pA = a.extraction?.priorityScore || (a.riskLevel === "URGENT" ? 5 : a.riskLevel === "HIGH" ? 4 : 2);
          const pB = b.extraction?.priorityScore || (b.riskLevel === "URGENT" ? 5 : b.riskLevel === "HIGH" ? 4 : 2);
          return pB - pA;
        });

        const topDoc = sortedDocs[0];
        SessionMemory.updateActiveDocument(sessionId, topDoc);

        traceSteps.push({
          id: `trace-3-${Date.now()}`,
          timestamp,
          step: `Identified top urgent document: ${topDoc.title}`,
          detail: `Risk Level: ${topDoc.riskLevel}`,
          status: "COMPLETED"
        });

        const amountStr = topDoc.extraction?.totalAmount ? `$${topDoc.extraction.totalAmount.toFixed(2)}` : "None";
        const dueStr = topDoc.extraction?.dueDate ? formatDateForDisplay(topDoc.extraction.dueDate) : "No deadline";

        let responseText = `The most urgent document in your workspace is **${topDoc.title}**.\n\n`;
        responseText += `• **Document Type:** ${topDoc.extraction?.documentType || topDoc.category}\n`;
        responseText += `• **Issuer / Subject:** ${topDoc.extraction?.issuer || topDoc.title}\n`;
        responseText += `• **Risk Level:** ${topDoc.riskLevel}\n`;
        responseText += `• **Financial Obligation:** ${amountStr}\n`;
        responseText += `• **Administrative Deadline:** ${dueStr}\n\n`;
        responseText += `**AI Summary:** ${topDoc.extraction?.plainLanguageSummary || topDoc.contentSummary}\n\n`;

        if (topDoc.tasks && topDoc.tasks.length > 0) {
          responseText += `**Required Actions:**\n`;
          topDoc.tasks.forEach((t) => {
            responseText += `• ${t.title}\n`;
          });
        }

        traceSteps.push({
          id: `trace-4-${Date.now()}`,
          timestamp,
          step: "Generated natural language synthesis",
          status: "COMPLETED"
        });

        return {
          text: responseText.trim(),
          traceSteps,
          activeEntity: topDoc.title,
          intent,
          toolsUsed: ["getDocuments"]
        };
      }

      case "DOCUMENT_SPECIFIC":
      case "FOLLOW_UP_QUERY": {
        const resolvedFollowUp = SessionMemory.resolveFollowUpEntity(userQuery, sessionId);
        const entityQuery = (userQuery.includes("electricity") || userQuery.includes("bill") || userQuery.includes("brightgrid"))
          ? "brightgrid"
          : resolvedFollowUp || userQuery;

        traceSteps.push({
          id: `trace-2-${Date.now()}`,
          timestamp,
          step: `Selected Tool: summarizeDocument()`,
          detail: `Searching workspace for matching document ("${entityQuery}")`,
          status: "COMPLETED"
        });

        const doc = await agentTools.summarizeDocument(entityQuery, userId);

        if (!doc) {
          return {
            text: `I couldn't find a matching document for "${userQuery}" in your workspace.`,
            traceSteps,
            intent,
            toolsUsed: ["summarizeDocument"]
          };
        }

        console.log(`[MockAgent] FOLLOW_UP_QUERY found doc: "${doc.title}" (dueDate: ${doc.extraction?.dueDate})`);

        SessionMemory.updateActiveDocument(sessionId, doc);

        traceSteps.push({
          id: `trace-3-${Date.now()}`,
          timestamp,
          step: `Retrieved document: ${doc.title}`,
          detail: `Type: ${doc.extraction?.documentType || doc.category}`,
          status: "COMPLETED"
        });

        const provider = doc.extraction?.issuer || doc.title;
        const amountStr = doc.extraction?.totalAmount ? `$${doc.extraction.totalAmount.toFixed(2)}` : "None (N/A)";
        const dueStr = doc.extraction?.dueDate
          ? `${formatDateForDisplay(doc.extraction.dueDate)} (${doc.extraction.dueDate})`
          : "No deadline";

        let responseText = `Here are the details for **${doc.title}** (${doc.extraction?.documentType || doc.category}):\n\n`;
        responseText += `• **Provider / Subject:** ${provider}\n`;
        if (doc.extraction?.accountNumber) {
          responseText += `• **Account Number:** ${doc.extraction.accountNumber}\n`;
        }
        responseText += `• **Financial Obligation:** ${amountStr}\n`;
        responseText += `• **Payment / Decision Deadline:** ${dueStr}\n\n`;
        responseText += `**Summary:** ${doc.extraction?.plainLanguageSummary || doc.contentSummary}\n\n`;

        if (doc.extraction?.extractedFacts && doc.extraction.extractedFacts.length > 0) {
          responseText += `**Key Extracted Attributes:**\n`;
          doc.extraction.extractedFacts.forEach((f) => {
            responseText += `• **${f.field}:** ${f.value}\n`;
          });
        }

        traceSteps.push({
          id: `trace-4-${Date.now()}`,
          timestamp,
          step: "Generated natural language synthesis",
          status: "COMPLETED"
        });

        const docCitation: DocumentSourceCitation = {
          documentId: doc.id,
          documentTitle: doc.title,
          category: doc.category,
          chunkIndex: 0,
          snippet: doc.extraction?.plainLanguageSummary || doc.contentSummary || doc.title,
          similarity: 0.95
        };

        return {
          text: responseText.trim(),
          traceSteps,
          activeEntity: doc.title,
          intent,
          toolsUsed: ["summarizeDocument"],
          sources: [docCitation]
        };
      }

      default: {
        traceSteps.push({
          id: `trace-2-${Date.now()}`,
          timestamp,
          step: "Selected Tool: getDocuments()",
          detail: "Providing general workspace guidance",
          status: "COMPLETED"
        });

        const docs = await agentTools.getDocuments(userId);
        const tasks = await agentTools.getTasks(userId);

        return {
          text: `I am Clarion AI Copilot, your administrative assistant. Currently in your workspace you have **${docs.length} document(s)** and **${tasks.length} task(s)**.\n\nYou can ask me:\n• *"What needs my attention?"*\n• *"What tasks are pending?"*\n• *"What deadlines are coming up?"*\n• *"Summarize my recent documents."*\n• *"Tell me about my electricity bill."*`,
          traceSteps,
          intent: "GENERAL_HELP",
          toolsUsed: ["getDocuments", "getTasks"]
        };
      }
    }
  }
}
