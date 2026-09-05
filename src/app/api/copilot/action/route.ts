import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { clarionStore } from "@/lib/store";
import { agentTools } from "@/lib/agent/tools";
import { SessionMemory } from "@/lib/agent/memory";
import { PendingAction, SmartRecommendation, ActionIntentType } from "@/lib/agent/types";
import { ActionType } from "@/lib/types";

const ALLOWED_ACTION_TYPES = new Set<string>([
  "CREATE_TASK",
  "COMPLETE_TASK",
  "CREATE_REMINDER",
  "DRAFT_EMAIL",
  "SUBMIT_FORM",
  "VERIFICATION",
  "PAYMENT",
  "GENERAL"
]);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Sign in required to execute administrative actions." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, recommendation, sessionId = "dashboard-session" } = body;
    let targetPendingAction: PendingAction | undefined = body.pendingAction || SessionMemory.getPendingAction(sessionId);

    // 1. Action Lifecycle: PROPOSE
    if (action === "PROPOSE") {
      if (!recommendation) {
        return NextResponse.json(
          { success: false, error: "Recommendation data is required to propose an action." },
          { status: 400 }
        );
      }

      const recActionType = recommendation.actionType || "CREATE_TASK";
      if (!ALLOWED_ACTION_TYPES.has(recActionType)) {
        return NextResponse.json(
          { success: false, error: `Invalid action type "${recActionType}". Actions must come from an allowlisted type.` },
          { status: 400 }
        );
      }

      // Security check: Verify document ownership if source document referenced
      if (recommendation.sourceDocumentId) {
        const doc = await clarionStore.getDocumentById(recommendation.sourceDocumentId, user.id);
        if (!doc) {
          return NextResponse.json(
            { success: false, error: "Unauthorized: Source document does not belong to authenticated user." },
            { status: 403 }
          );
        }
      }

      const newActionId = `action-${recommendation.id || Date.now()}`;

      // Check duplicate proposal / execution
      if (SessionMemory.isActionExecuted(newActionId)) {
        const existing = SessionMemory.getExecutedAction(newActionId);
        return NextResponse.json({
          success: true,
          message: "Action already completed.",
          isDuplicate: true,
          executedTaskId: existing?.taskId
        });
      }

      const newPendingAction: PendingAction = {
        id: newActionId,
        actionType: (recommendation.actionType as ActionIntentType) || "CREATE_TASK",
        toolName: recommendation.actionType === "COMPLETE_TASK" ? "completeTask" : recommendation.actionType === "CREATE_REMINDER" ? "createReminder" : "createTask",
        args: {
          title: recommendation.actionArgs?.title || recommendation.title,
          description: recommendation.reason,
          priority: recommendation.priority || "HIGH",
          dueDate: recommendation.dueDate || "Tomorrow",
          documentId: recommendation.sourceDocumentId,
          taskId: recommendation.actionArgs?.taskId
        },
        confirmationMessage: `Action: ${recommendation.actionType || 'CREATE TASK'}\nTitle: ${recommendation.title}\nReason: ${recommendation.reason}`,
        timestamp: new Date().toISOString(),
        documentId: recommendation.sourceDocumentId,
        documentTitle: recommendation.sourceDocumentTitle,
        status: "PENDING",
        reason: recommendation.reason,
        suggestedAction: recommendation.suggestedAction
      };

      SessionMemory.setPendingAction(sessionId, newPendingAction);

      clarionStore.addAuditLog(
        newPendingAction.documentId,
        newPendingAction.documentTitle,
        "AGENT_ACTION_PROPOSED",
        "AI_SYSTEM",
        `Copilot proposed action: ${newPendingAction.confirmationMessage}`,
        user.id
      );

      return NextResponse.json({ success: true, pendingAction: newPendingAction });
    }

    // 2. Action Lifecycle: CONFIRM
    if (action === "CONFIRM") {
      if (!targetPendingAction) {
        return NextResponse.json(
          { success: false, error: "No active pending action found to confirm or action has expired." },
          { status: 400 }
        );
      }

      // Duplicate confirmation prevention (Idempotency)
      if (SessionMemory.isActionExecuted(targetPendingAction.id)) {
        const existing = SessionMemory.getExecutedAction(targetPendingAction.id);
        return NextResponse.json({
          success: true,
          message: "Action already completed.",
          isDuplicate: true,
          executedTaskId: existing?.taskId
        });
      }

      // Validate action type allowlist
      if (!ALLOWED_ACTION_TYPES.has(targetPendingAction.actionType)) {
        return NextResponse.json(
          { success: false, error: `Action type "${targetPendingAction.actionType}" is not allowlisted.` },
          { status: 400 }
        );
      }

      // Security check: Validate document ownership for target action
      if (targetPendingAction.documentId) {
        const doc = await clarionStore.getDocumentById(targetPendingAction.documentId, user.id);
        if (!doc) {
          return NextResponse.json(
            { success: false, error: "Unauthorized: Referenced document does not belong to authenticated user." },
            { status: 403 }
          );
        }
      }

      let executedRecord: any;

      if (targetPendingAction.actionType === "COMPLETE_TASK") {
        executedRecord = await agentTools.completeTask(
          targetPendingAction.args.taskId || targetPendingAction.args.title,
          user.id
        );
      } else if (targetPendingAction.actionType === "CREATE_REMINDER") {
        executedRecord = await agentTools.createReminder({
          title: targetPendingAction.args.title,
          dueDate: targetPendingAction.args.dueDate,
          documentId: targetPendingAction.documentId,
          userId: user.id
        });
      } else {
        executedRecord = await agentTools.createTask({
          title: targetPendingAction.args.title || "Custom Task",
          description: targetPendingAction.reason || targetPendingAction.args.description,
          priority: targetPendingAction.args.priority || "HIGH",
          dueDate: targetPendingAction.args.dueDate,
          documentId: targetPendingAction.documentId,
          userId: user.id
        });
      }

      SessionMemory.markActionExecuted(targetPendingAction.id, executedRecord?.id);
      SessionMemory.clearPendingAction(sessionId);

      clarionStore.addAuditLog(
        targetPendingAction.documentId,
        targetPendingAction.documentTitle,
        "AGENT_ACTION_CONFIRMED",
        "USER",
        `User confirmed action: ${targetPendingAction.confirmationMessage}`,
        user.id
      );

      clarionStore.addAuditLog(
        targetPendingAction.documentId,
        targetPendingAction.documentTitle,
        "AGENT_ACTION_EXECUTED",
        "AI_SYSTEM",
        `Executed action ${targetPendingAction.toolName} resulting in record ID: ${executedRecord?.id || "N/A"}`,
        user.id
      );

      return NextResponse.json({
        success: true,
        message: `Action executed successfully. Created/updated record "${executedRecord?.title || targetPendingAction.args.title}".`,
        executedRecord
      });
    }

    // 3. Action Lifecycle: CANCEL
    if (action === "CANCEL") {
      if (targetPendingAction) {
        clarionStore.addAuditLog(
          targetPendingAction.documentId,
          targetPendingAction.documentTitle,
          "AGENT_ACTION_CANCELLED",
          "USER",
          `User cancelled pending action: ${targetPendingAction.confirmationMessage}`,
          user.id
        );
      }

      SessionMemory.clearPendingAction(sessionId);
      return NextResponse.json({ success: true, message: "Action cancelled. No changes were made." });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action type. Expected PROPOSE, CONFIRM, or CANCEL." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Action API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Action execution failed due to server error." },
      { status: 500 }
    );
  }
}
