import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const dbMessages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" }
    });

    const messages = dbMessages.map((m) => {
      let pendingAction;
      let toolsUsed;
      let sources;
      let recommendations;
      let facts;

      try {
        if (m.pendingActionJson) pendingAction = JSON.parse(m.pendingActionJson);
      } catch (e) {}

      try {
        if (m.toolsUsedJson) {
          const parsed = JSON.parse(m.toolsUsedJson);
          if (Array.isArray(parsed)) {
            toolsUsed = parsed;
          } else if (typeof parsed === "object" && parsed !== null) {
            toolsUsed = parsed.tools;
            sources = parsed.sources;
            recommendations = parsed.recommendations;
            facts = parsed.facts;
          }
        }
      } catch (e) {}

      return {
        id: m.id,
        sender: m.role as "user" | "assistant",
        text: m.content,
        timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        intent: m.intent || undefined,
        toolsUsed,
        pendingAction,
        sources,
        recommendations,
        facts
      };
    });

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load chat history" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await prisma.chatMessage.deleteMany({
      where: { userId: user.id }
    });

    return NextResponse.json({ success: true, message: "Chat history cleared" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to clear chat history" },
      { status: 500 }
    );
  }
}
