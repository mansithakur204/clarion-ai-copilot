import { clarionStore } from "../src/lib/store";
import { globalSmartDecisionEngine } from "../src/lib/agent/decisionEngine";
import { globalAgentOrchestrator } from "../src/lib/agent/orchestrator";
import assert from "assert";

async function runTests() {
  console.log("=================================================");
  console.log("🧪 STARTING STEP 8 INTEGRATION TESTS: SMART ACTION LAYER");
  console.log("=================================================\n");

  const userAId = `user-a-${Date.now()}`;
  const userBId = `user-b-${Date.now()}`;
  const userCleanId = `user-clean-${Date.now()}`;

  // Seed test User A document (Urgent Bill)
  console.log("🔹 Seeding test urgent bill document for User A...");
  const urgentBillText = `BRIGHTGRID ELECTRIC UTILITY SERVICE
Account Number: BG-883920-11
Customer: User A
Issue Date: 2026-08-20
DUE DATE: 2026-09-10
TOTAL OVERDUE BALANCE: $142.50
URGENT DISCONNECTION NOTICE: Immediate payment required to avoid power shutoff.`;

  const billDoc = await clarionStore.addDocument(
    "BrightGrid Electric Disconnection Notice",
    "brightgrid_bill.txt",
    urgentBillText,
    "BILL",
    userAId
  );
  console.log(`  ✅ Created Urgent Bill (ID: ${billDoc.id}, Risk: ${billDoc.riskLevel})`);

  // --- TEST 1: Urgent Bill → Recommendation Generated ---
  console.log("\n▶ TEST 1: Urgent Bill → Recommendation Generated");
  const result1 = await globalSmartDecisionEngine.evaluateSmartActions(
    userAId,
    "What should I do about this bill?"
  );

  assert.ok(result1.decision.recommendations.length > 0, "Expected at least 1 recommendation for urgent bill");
  const rec1 = result1.decision.recommendations[0];
  assert.ok(rec1.title.includes("BrightGrid") || rec1.title.includes("BILL"), "Recommendation title should reference BrightGrid or BILL");
  assert.ok(rec1.reason.length > 0, "Recommendation reason must be populated");
  assert.ok(rec1.suggestedAction.length > 0, "Suggested next step action must be populated");
  assert.strictEqual(rec1.sourceDocumentId, billDoc.id, "Source document ID must match bill doc ID");
  console.log("  ✅ TEST 1 PASSED: Recommendation generated with What, Why, Next Step, and Source Document Citation!");

  // --- TEST 2: Upcoming Deadline → Recommendation Generated ---
  console.log("\n▶ TEST 2: Upcoming Deadline → Recommendation Generated");
  const result2 = await globalSmartDecisionEngine.evaluateSmartActions(
    userAId,
    "What deadlines are coming up?"
  );

  assert.ok(result2.decision.recommendations.length > 0, "Expected recommendation for upcoming deadline");
  assert.ok(result2.decision.facts.some((f) => f.includes("FACT:")), "Facts list must contain grounded facts");
  console.log("  ✅ TEST 2 PASSED: Upcoming deadline successfully generated structured recommendation & facts!");

  // --- TEST 3: No Urgent Items → No Fake Urgency ---
  console.log("\n▶ TEST 3: No Urgent Items → No Fake Urgency");
  const result3 = await globalSmartDecisionEngine.evaluateSmartActions(
    userCleanId,
    "What needs my attention?"
  );

  assert.strictEqual(result3.decision.recommendations.length, 0, "Expected ZERO recommendations for clean user workspace");
  assert.ok(result3.text.includes("up to date") || result3.text.includes("0 high-risk"), "Response must confirm everything is up to date without fake urgency");
  console.log("  ✅ TEST 3 PASSED: Clean user workspace returns zero recommendations and no fake urgency!");

  // --- TEST 4: Another User's Document → Never Included (Strict Isolation) ---
  console.log("\n▶ TEST 4: Another User's Document → Never Included (Strict Isolation)");
  const result4 = await globalSmartDecisionEngine.evaluateSmartActions(
    userBId,
    "What needs my attention?"
  );

  const leakedA = result4.decision.recommendations.some(
    (r) => r.sourceDocumentId === billDoc.id || r.title.includes("BrightGrid")
  );
  assert.strictEqual(leakedA, false, "User B must NEVER see or receive User A's private documents or recommendations!");
  console.log("  ✅ TEST 4 PASSED: User B isolation verified! User A documents never leaked.");

  // --- TEST 5: Gemini Unavailable → Local Decision Logic Still Works ---
  console.log("\n▶ TEST 5: Gemini Unavailable → Local Decision Logic Works");
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const orchestratorRes = await globalAgentOrchestrator.runAgent(
      "What should I take care of today?",
      `session-${Date.now()}`,
      userAId
    );

    assert.ok(orchestratorRes.text.length > 0, "Agent response text should be generated");
    assert.ok(orchestratorRes.traceSteps.length > 0, "Agent trace steps should be populated");
    assert.ok(orchestratorRes.recommendations && orchestratorRes.recommendations.length > 0, "Local fallback must generate recommendations");
    console.log("  ✅ TEST 5 PASSED: Local decision logic works seamlessly when Gemini is unavailable!");
  } finally {
    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  }

  console.log("\n=================================================");
  console.log("🎉 ALL 5 STEP 8 INTEGRATION TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================\n");
}

runTests().catch((err) => {
  console.error("❌ Integration Test Failed:", err);
  process.exit(1);
});
