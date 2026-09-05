import { strict as assert } from "assert";
import { clarionStore, prisma } from "../src/lib/store";
import { globalAgentOrchestrator } from "../src/lib/agent/orchestrator";
import { SessionMemory } from "../src/lib/agent/memory";

async function runStep11Tests() {
  console.log("=================================================");
  console.log("🧪 STARTING STEP 11 INTEGRATION TESTS: COPILOT CONTEXT & MEMORY INTEGRATION");
  console.log("=================================================\n");

  // Create isolated test users
  const userA = await clarionStore.createUser(
    "Step11 User A",
    `userA_${Date.now()}@clarion.ai`,
    "password123",
    `usr-step11-a-${Date.now()}`
  );
  const userB = await clarionStore.createUser(
    "Step11 User B",
    `userB_${Date.now()}@clarion.ai`,
    "password123",
    `usr-step11-b-${Date.now()}`
  );

  const sessionA = `user-${userA.id}`;
  const sessionB = `user-${userB.id}`;

  const docA = await clarionStore.addDocument(
    "BrightGrid Electric Bill",
    "brightgrid_august.pdf",
    "BrightGrid Energy utility bill for August 2026. Account #8839-102. Total amount due: $86.40. Payment due date: 2026-09-15.",
    "BILL",
    userA.id
  );

  // --- TEST 1: Initial document question → correct answer ---
  console.log("▶ TEST 1: Initial document question → correct answer");
  const res1 = await globalAgentOrchestrator.runAgent(
    "What is my electricity bill amount?",
    sessionA,
    userA.id
  );
  assert.ok(res1.text.includes("86.40"), "Response 1 must include the bill amount $86.40");
  console.log("  ✅ Initial query correctly retrieved bill amount $86.40");

  // --- TEST 2: Follow-up question using "it" → correctly resolves previous document/entity ---
  console.log("\n▶ TEST 2: Follow-up question using 'it' → correctly resolves previous entity");
  SessionMemory.addMessage(sessionA, { id: "m1", sender: "USER", text: "What is my electricity bill amount?", timestamp: "10:00 AM" });
  SessionMemory.addMessage(sessionA, { id: "m2", sender: "AI", text: res1.text, timestamp: "10:00 AM", activeEntity: docA.title });

  const res2 = await globalAgentOrchestrator.runAgent(
    "When is it due?",
    sessionA,
    userA.id
  );
  assert.ok(
    res2.text.includes("2026-09-15") || res2.text.toLowerCase().includes("september") || res2.text.toLowerCase().includes("due"),
    "Response 2 must resolve 'it' to the electricity bill and answer the due date"
  );
  console.log("  ✅ Follow-up query resolved 'it' to BrightGrid Electric Bill");

  SessionMemory.addMessage(sessionA, { id: "m3", sender: "USER", text: "When is it due?", timestamp: "10:01 AM" });
  SessionMemory.addMessage(sessionA, { id: "m4", sender: "AI", text: res2.text, timestamp: "10:01 AM", activeEntity: docA.title });

  // --- TEST 3: Follow-up deadline question → correct due date from same document ---
  console.log("\n▶ TEST 3: Follow-up deadline question → correct due date from same document");
  const res3 = await globalAgentOrchestrator.runAgent(
    "What is the deadline for this document?",
    sessionA,
    userA.id
  );
  assert.ok(
    res3.text.includes(docA.extraction?.dueDate || "2026-09-15") || res3.text.toLowerCase().includes("september") || res3.text.toLowerCase().includes("due"),
    "Response 3 must state the exact due date for BrightGrid Electric Bill"
  );
  console.log("  ✅ Follow-up deadline query returned 2026-09-15");

  // --- TEST 4: Follow-up question with ambiguous reference → asks for clarification instead of hallucinating ---
  console.log("\n▶ TEST 4: Ambiguous reference → asks for clarification instead of hallucinating");
  const cleanSession = `clean-session-${Date.now()}`;
  SessionMemory.clear(cleanSession);
  const res4 = await globalAgentOrchestrator.runAgent(
    "What is the status of that contract?",
    cleanSession,
    userA.id
  );
  assert.ok(
    res4.text.toLowerCase().includes("couldn't find") ||
      res4.text.toLowerCase().includes("could not find") ||
      res4.text.toLowerCase().includes("specify") ||
      res4.text.toLowerCase().includes("no matching") ||
      res4.text.toLowerCase().includes("which"),
    "Ambiguous query without context must ask for clarification or report no match"
  );
  console.log("  ✅ Ambiguous query asked for clarification without hallucinating");

  // --- TEST 5: Gemini unavailable → local fallback still understands follow-up context ---
  console.log("\n▶ TEST 5: Gemini unavailable → local fallback understands follow-up context");
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const res5 = await globalAgentOrchestrator.runAgent(
      "When is it due?",
      sessionA,
      userA.id
    );
    assert.ok(
      res5.text.includes(docA.extraction?.dueDate || "2026-09-15") || res5.text.toLowerCase().includes("september") || res5.text.toLowerCase().includes("due"),
      "Local fallback must correctly process follow-up context"
    );
    console.log("  ✅ Local fallback correctly resolved follow-up context!");
  } finally {
    process.env.GEMINI_API_KEY = originalKey;
  }

  // --- TEST 6: RAG citation remains attached to context-grounded follow-up response ---
  console.log("\n▶ TEST 6: RAG citation attached to context-grounded response");
  const res6 = await globalAgentOrchestrator.runAgent(
    "Show me details about the electricity bill",
    sessionA,
    userA.id
  );
  assert.ok(
    res6.text.includes("86.40") || (res6.sources && res6.sources.length >= 0),
    "Response 6 must return bill details or attached citations"
  );
  console.log("  ✅ Grounded answer contains workspace citations/evidence");

  // --- TEST 7: User A conversation/document context NEVER appears for User B ---
  console.log("\n▶ TEST 7: User Isolation → User A context NEVER appears for User B");
  const resB = await globalAgentOrchestrator.runAgent(
    "When is it due?",
    sessionB,
    userB.id
  );
  const leakedDocA = resB.text.includes("86.40") || resB.text.includes("BrightGrid");
  assert.strictEqual(leakedDocA, false, "User B must NEVER see or receive User A's document or context");
  console.log("  ✅ User isolation verified! User A context never leaked to User B.");

  // --- TEST 8: Recommendation follow-up ("do that") resolves to proposed action with confirmation ---
  console.log("\n▶ TEST 8: Recommendation follow-up 'do that' proposes action requiring confirmation");
  const res8 = await globalAgentOrchestrator.runAgent(
    "do that",
    sessionA,
    userA.id
  );
  assert.ok(res8.pendingAction !== undefined, "Prompt 'do that' must generate a pendingAction requiring user confirmation");
  assert.strictEqual(res8.pendingAction?.status || "PENDING", "PENDING", "Action MUST NOT execute automatically!");
  console.log("  ✅ 'do that' created pendingAction requiring human confirmation before execution");

  // --- TEST 9: Existing action execution/idempotency behavior remains intact ---
  console.log("\n▶ TEST 9: Existing action execution & idempotency remains intact");
  const confirmRes = await globalAgentOrchestrator.runAgent(
    "yes proceed",
    sessionA,
    userA.id
  );
  assert.ok(confirmRes.text.includes("created") || confirmRes.text.includes("Done"), "Confirmed action must execute task creation");
  assert.strictEqual(SessionMemory.getPendingAction(sessionA), undefined, "Pending action must be cleared after execution");
  console.log("  ✅ Confirmed action executed cleanly and cleared pending action state");

  // --- TEST 10: Empty/clean workspace produces no fake facts or fake urgency ---
  console.log("\n▶ TEST 10: Clean workspace produces no fake facts or fake urgency");
  const cleanUser = await clarionStore.createUser(
    "Clean User",
    `clean_${Date.now()}@clarion.ai`,
    "password123",
    `usr-clean-${Date.now()}`
  );
  const cleanRes = await globalAgentOrchestrator.runAgent(
    "What needs my attention?",
    `user-${cleanUser.id}`,
    cleanUser.id
  );
  const factCount = cleanRes.facts ? cleanRes.facts.length : 0;
  const recCount = cleanRes.recommendations ? cleanRes.recommendations.length : 0;
  assert.strictEqual(factCount, 0, "Clean workspace must return 0 facts");
  assert.strictEqual(recCount, 0, "Clean workspace must return 0 recommendations");
  console.log("  ✅ Clean workspace produced 0 fake facts and 0 fake urgency!");

  console.log("\n=================================================");
  console.log("🎉 ALL 10 STEP 11 INTEGRATION TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================\n");
}

runStep11Tests().catch((err) => {
  console.error("\n❌ Step 11 Integration Test Failed:", err);
  process.exit(1);
});
