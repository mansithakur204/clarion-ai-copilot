import { NextResponse } from "next/server";
import { globalAgentOrchestrator } from "@/lib/agent/orchestrator";
import { clarionStore, prisma } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "A valid non-empty message is required." },
        { status: 400 }
      );
    }

    // Determine user-scoped session ID (e.g., user-uuid)
    const effectiveSessionId = user ? `user-${user.id}` : (sessionId || "dashboard-session");

    // Persist user prompt if user is authenticated
    if (user) {
      try {
        await prisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId: effectiveSessionId,
            role: "user",
            content: message.trim()
          }
        });
      } catch (e) {
        console.warn("Failed to persist user chat message", e);
      }
    }

    // Audit log: query received
    clarionStore.addAuditLog(
      undefined,
      undefined,
      "AGENT_QUERY_RECEIVED",
      "USER",
      `Copilot query received: "${message.substring(0, 80)}${message.length > 80 ? "..." : ""}"`,
      user?.id
    );

    // Execute Agentic Orchestrator
    const agentResponse = await globalAgentOrchestrator.runAgent(message, effectiveSessionId, user?.id);

    // Audit log: tool execution
    if (agentResponse.toolsUsed && agentResponse.toolsUsed.length > 0) {
      clarionStore.addAuditLog(
        undefined,
        undefined,
        "AGENT_TOOL_USED",
        "AI_SYSTEM",
        `Agent executed tools [${agentResponse.toolsUsed.join(", ")}] for intent ${agentResponse.intent}`,
        user?.id
      );
    }

    // Persist assistant response if user is authenticated
    if (user) {
      try {
        await prisma.chatMessage.create({
          data: {
            userId: user.id,
            sessionId: effectiveSessionId,
            role: "assistant",
            content: agentResponse.text,
            intent: agentResponse.intent || null,
            toolsUsedJson: agentResponse.toolsUsed ? JSON.stringify(agentResponse.toolsUsed) : null,
            pendingActionJson: agentResponse.pendingAction ? JSON.stringify(agentResponse.pendingAction) : null
          }
        });
      } catch (e) {
        console.warn("Failed to persist assistant chat response", e);
      }
    }

    return NextResponse.json({ success: true, response: agentResponse });
  } catch (error: any) {
    console.error("Copilot API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Copilot processing failed." },
      { status: 500 }
    );
  }
}
