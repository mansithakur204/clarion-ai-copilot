import { MockAgentEngine } from "./mockAgent";
import { GeminiAgentEngine } from "./geminiAgent";
import { AgentResponse, AgentTraceStep } from "./types";
import { SessionMemory } from "./memory";

export class AgentOrchestrator {
  private mockEngine: MockAgentEngine;
  private geminiEngine: GeminiAgentEngine;

  constructor() {
    this.mockEngine = new MockAgentEngine();
    this.geminiEngine = new GeminiAgentEngine();
  }

  async runAgent(
    userMessage: string,
    sessionId: string = "default-session",
    userId?: string
  ): Promise<AgentResponse> {
    const qLower = userMessage.trim().toLowerCase();
    const hasKey = this.geminiEngine.isAvailable();

    const pendingAction = SessionMemory.getPendingAction(sessionId);
    const isConfirm = pendingAction && (
      /\b(yes|confirm|proceed|do it|ok|sure|yeah|accept)\b/i.test(qLower) ||
      (pendingAction.args?.title && qLower.includes(String(pendingAction.args.title).toLowerCase()))
    );
    const isCancel = pendingAction && /\b(no|cancel|never mind|don't|stop|reject)\b/i.test(qLower);

    const isCreateTask = /create\s+(a\s+)?task|add\s+(a\s+)?task|make\s+(a\s+)?task|new\s+task|remind\s+me\s+to\s+create\s+a\s+task/i.test(qLower);
    const isCompleteTask = /mark\s+.*?\s+as\s+(complete|done|finished)|complete\s+(the\s+)?.*?|finish\s+(the\s+)?.*?|done\s+with\s+(the\s+)?.*?/i.test(qLower);
    const isCreateReminder = /remind\s+me\s+to|remind\s+me\s+about|set\s+(a\s+)?reminder|create\s+(a\s+)?reminder/i.test(qLower);
    const isDraftEmail = /draft\s+(an?\s+)?email|write\s+(an?\s+)?email|compose\s+(an?\s+)?email/i.test(qLower);

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
      (!hasWorkspaceKeyword && userMessage.trim().length > 0 && userMessage.trim().length <= 35 && !qLower.includes("?"));

    const isTaskQuery = qLower.includes("what tasks are pending") || qLower.includes("list my tasks") || qLower.includes("pending tasks") || qLower.includes("show my tasks");
    const isDeadlineQuery = qLower.includes("what deadlines are coming up") || qLower.includes("upcoming deadlines") || qLower.includes("when is due");
    const isAttentionQuery =
      qLower.includes("what needs my attention") ||
      qLower.includes("what is urgent") ||
      qLower.includes("anything critical") ||
      qLower.includes("take care of") ||
      qLower.includes("what should i do") ||
      qLower.includes("anything urgent");
    const isDocumentQuery = qLower.includes("summarize my recent documents") || qLower.includes("summarize my documents") || qLower.includes("list my documents") || qLower.includes("overview of documents");

    const hasResolvedFollowUp = !!SessionMemory.resolveFollowUpEntity(userMessage, sessionId);
    const isFollowUpQuery = hasResolvedFollowUp && (qLower.includes("it") || qLower.includes("this") || qLower.includes("that") || qLower.includes("when") || qLower.includes("due") || qLower.includes("document"));

    let matchedIntentName = "";
    if (isConfirm) matchedIntentName = "CONFIRM_ACTION";
    else if (isCancel) matchedIntentName = "CANCEL_ACTION";
    else if (isCreateTask) matchedIntentName = "CREATE_TASK";
    else if (isCompleteTask) matchedIntentName = "COMPLETE_TASK";
    else if (isCreateReminder) matchedIntentName = "CREATE_REMINDER";
    else if (isDraftEmail) matchedIntentName = "DRAFT_EMAIL";
    else if (isConversational) matchedIntentName = "CONVERSATIONAL";
    else if (isFollowUpQuery) matchedIntentName = "FOLLOW_UP_QUERY";
    else if (isTaskQuery) matchedIntentName = "TASK_QUERY";
    else if (isDeadlineQuery) matchedIntentName = "DEADLINE_QUERY";
    else if (isAttentionQuery) matchedIntentName = "ATTENTION_QUERY";
    else if (isDocumentQuery) matchedIntentName = "DOCUMENT_QUERY";

    if (matchedIntentName) {
      console.log(`[AgentOrchestrator] Local action intent detected: ${matchedIntentName}`);
      console.log(`[AgentOrchestrator] Routing directly to MockAgentEngine`);
      return await this.mockEngine.processQuery(userMessage, sessionId, userId);
    }

    if (hasKey) {
      try {
        console.log(`[AgentOrchestrator] Routing open-ended request to GeminiAgentEngine...`);
        return await this.geminiEngine.processQuery(userMessage, sessionId, userId);
      } catch (err: any) {
        const errMsg = (err?.message || String(err)).toLowerCase();
        const isQuotaError =
          errMsg.includes("429") ||
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("quota") ||
          errMsg.includes("rate limit");

        if (isQuotaError) {
          console.warn("[GeminiEngine] API quota unavailable (429)");
          console.warn("[AgentOrchestrator] Using local fallback");
          const fallbackRes = await this.mockEngine.processQuery(userMessage, sessionId, userId);
          const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

          const quotaNoticeStep: AgentTraceStep = {
            id: `quota-notice-${Date.now()}`,
            timestamp,
            step: "Gemini Quota Notice",
            detail: "Gemini API quota temporarily unavailable — using local agent fallback.",
            status: "COMPLETED"
          };

          return {
            ...fallbackRes,
            traceSteps: [quotaNoticeStep, ...fallbackRes.traceSteps]
          };
        }

        console.error("🔴 [AgentOrchestrator] GeminiAgentEngine execution failed:", err?.message || err);
        throw err;
      }
    }

    console.log(`[AgentOrchestrator] GEMINI_API_KEY missing, using MockAgentEngine fallback.`);
    return await this.mockEngine.processQuery(userMessage, sessionId, userId);
  }
}

export const globalAgentOrchestrator = new AgentOrchestrator();
