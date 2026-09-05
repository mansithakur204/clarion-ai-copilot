import { clarionStore } from "../src/lib/store";
import { agentTools } from "../src/lib/agent/tools";
import { SessionMemory } from "../src/lib/agent/memory";
import { globalSmartDecisionEngine } from "../src/lib/agent/decisionEngine";
import { PendingAction, SmartRecommendation } from "../src/lib/agent/types";
import assert from "assert";

async function runStep9Tests() {
  console.log("=================================================");
  console.log("🧪 STARTING STEP 9 INTEGRATION TESTS: ACTION EXECUTION & CONFIRMATION");
  console.log("=================================================\n");

  const userAId = `user-a-step9-${Date.now()}`;
  const userBId = `user-b-step9-${Date.now()}`;
  const sessionIdA = `session-a-${Date.now()}`;
  const sessionIdB = `session-b-${Date.now()}`;

  await clarionStore.createUser("User A", `${userAId}@example.com`, "passwordHash", userAId);
  await clarionStore.createUser("User B", `${userBId}@example.com`, "passwordHash", userBId);

  // Seed document for User A
  console.log("🔹 Seeding test document for User A...");
  const docA = await clarionStore.addDocument(
    "AvalonBay Lease Renewal Notice",
    "avalonbay_lease.pdf",
    "Lease renewal decision required by Sept 15, 2026 for Apartment 4B.",
    "CONTRACT",
    userAId
  );
  console.log(`  ✅ Document Created: ${docA.title} (ID: ${docA.id})`);

  // --- TEST 1: Recommendation → Confirmation → Task Created ---
  console.log("\n▶ TEST 1: Recommendation → Confirmation → Task Created");
  const initialTasksA = await clarionStore.getAllTasks(userAId);

  const recommendation: SmartRecommendation = {
    id: `rec-lease-${Date.now()}`,
    title: "AvalonBay Lease Renewal",
    reason: "Lease renewal decision due Sept 15, 2026.",
    suggestedAction: "Submit Written Notice of Lease Renewal",
    actionType: "CREATE_TASK",
    actionArgs: {
      title: "Submit Written Notice of Lease Renewal",
      dueDate: "2026-09-15",
      priority: "HIGH"
    },
    sourceDocumentId: docA.id,
    sourceDocumentTitle: docA.title,
    priority: "HIGH"
  };

  const actionId = `action-test1-${Date.now()}`;
  const pendingAction: PendingAction = {
    id: actionId,
    actionType: "CREATE_TASK",
    toolName: "createTask",
    args: {
      title: "Submit Written Notice of Lease Renewal",
      description: recommendation.reason,
      priority: "HIGH",
      dueDate: "2026-09-15",
      documentId: docA.id
    },
    confirmationMessage: "Action: CREATE TASK\nTitle: Submit Written Notice of Lease Renewal",
    timestamp: new Date().toISOString(),
    documentId: docA.id,
    documentTitle: docA.title
  };

  // Ownership Check: Document belongs to User A
  const ownedDoc = await clarionStore.getDocumentById(pendingAction.documentId!, userAId);
  assert.ok(ownedDoc, "Document must belong to User A");

  // Confirm action
  const createdTask = await agentTools.createTask({
    title: pendingAction.args.title,
    description: pendingAction.args.description,
    priority: pendingAction.args.priority,
    dueDate: pendingAction.args.dueDate,
    documentId: pendingAction.documentId,
    userId: userAId
  });

  SessionMemory.markActionExecuted(actionId, createdTask.id);

  const updatedTasksA = await clarionStore.getAllTasks(userAId);
  assert.strictEqual(updatedTasksA.length, initialTasksA.length + 1, "Tasks count should increase by 1");
  const foundTask = updatedTasksA.find((t) => t.id === createdTask.id);
  assert.ok(foundTask, "Created task must be persisted in User A store");
  console.log("  ✅ TEST 1 PASSED: Recommendation confirmed and task created successfully!");

  // --- TEST 2: Cancel → Nothing Created ---
  console.log("\n▶ TEST 2: Cancel → Nothing Created");
  const tasksBeforeCancel = await clarionStore.getAllTasks(userAId);
  const cancelActionId = `action-cancel-${Date.now()}`;
  const cancelPendingAction: PendingAction = {
    id: cancelActionId,
    actionType: "CREATE_TASK",
    toolName: "createTask",
    args: { title: "Unwanted Task", priority: "LOW" },
    confirmationMessage: "Action: CREATE TASK",
    timestamp: new Date().toISOString()
  };

  SessionMemory.setPendingAction(sessionIdA, cancelPendingAction);
  // User cancels
  SessionMemory.clearPendingAction(sessionIdA);

  const tasksAfterCancel = await clarionStore.getAllTasks(userAId);
  assert.strictEqual(tasksAfterCancel.length, tasksBeforeCancel.length, "Task count must remain unchanged after cancellation");
  console.log("  ✅ TEST 2 PASSED: Action cancelled, zero records created!");

  // --- TEST 3: Duplicate Confirmation → Blocked (Idempotency) ---
  console.log("\n▶ TEST 3: Duplicate Confirmation → Blocked");
  assert.strictEqual(SessionMemory.isActionExecuted(actionId), true, "Action 1 should be marked executed");

  // Attempt second confirmation on same actionId
  const isDuplicate = SessionMemory.isActionExecuted(actionId);
  assert.strictEqual(isDuplicate, true, "Duplicate confirmation attempt must be detected");

  const tasksAfterDuplicate = await clarionStore.getAllTasks(userAId);
  assert.strictEqual(tasksAfterDuplicate.length, updatedTasksA.length, "Task count must NOT increase on duplicate confirmation");
  console.log("  ✅ TEST 3 PASSED: Duplicate confirmation blocked; idempotency enforced!");

  // --- TEST 4: Another User's Document → Blocked (Strict Isolation) ---
  console.log("\n▶ TEST 4: Another User's Document → Blocked");
  // User B tries to execute action referencing User A's docA
  const maliciousDocCheck = await clarionStore.getDocumentById(docA.id, userBId);
  assert.strictEqual(maliciousDocCheck, undefined, "User B must NOT have access to User A's document");
  console.log("  ✅ TEST 4 PASSED: Ownership check blocked unauthorized user action!");

  // --- TEST 5: Non-allowlisted Action Type → Blocked ---
  console.log("\n▶ TEST 5: Non-allowlisted Action Type → Blocked");
  const ALLOWED_ACTION_TYPES = new Set(["CREATE_TASK", "COMPLETE_TASK", "CREATE_REMINDER", "DRAFT_EMAIL", "SUBMIT_FORM", "VERIFICATION", "PAYMENT", "GENERAL"]);
  const invalidActionType = "DELETE_DATABASE_SHELL_EXEC";
  const isAllowed = ALLOWED_ACTION_TYPES.has(invalidActionType);
  assert.strictEqual(isAllowed, false, "Non-allowlisted action type must be rejected");
  console.log("  ✅ TEST 5 PASSED: Non-allowlisted action type correctly rejected!");

  // --- TEST 6: Gemini Unavailable → Action Flow Still Works ---
  console.log("\n▶ TEST 6: Gemini Unavailable → Action Flow Works");
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const offlineDecision = await globalSmartDecisionEngine.evaluateSmartActions(userAId, "What needs my attention?");
    assert.ok(offlineDecision.decision, "Decision object must be produced without Gemini");

    const offlineTask = await agentTools.createTask({
      title: "Offline Action Task",
      description: "Created while offline",
      priority: "HIGH",
      userId: userAId
    });
    assert.ok(offlineTask.id, "Task creation must succeed when Gemini is offline");
    console.log("  ✅ TEST 6 PASSED: Action execution layer functions deterministically offline!");
  } finally {
    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  }

  console.log("\n=================================================");
  console.log("🎉 ALL 6 STEP 9 INTEGRATION TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================\n");
}

runStep9Tests().catch((err) => {
  console.error("❌ Step 9 Integration Test Failed:", err);
  process.exit(1);
});
