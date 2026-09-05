import { clarionStore } from "../src/lib/store";
import { agentTools } from "../src/lib/agent/tools";
import { getProactiveDeadlineInsights, calculateUrgency } from "../src/lib/briefing/deadlineIntelligence";
import assert from "assert";

async function runStep10Tests() {
  console.log("=================================================");
  console.log("🧪 STARTING STEP 10 INTEGRATION TESTS: PROACTIVE DEADLINE & OBLIGATION INTELLIGENCE");
  console.log("=================================================\n");

  const now = new Date("2026-09-05T12:00:00Z");
  const userAId = `user-a-step10-${Date.now()}`;
  const userBId = `user-b-step10-${Date.now()}`;
  const userCleanId = `user-clean-step10-${Date.now()}`;

  await clarionStore.createUser("User A Step10", `${userAId}@example.com`, "passwordHash", userAId);
  await clarionStore.createUser("User B Step10", `${userBId}@example.com`, "passwordHash", userBId);
  await clarionStore.createUser("User Clean Step10", `${userCleanId}@example.com`, "passwordHash", userCleanId);

  // --- TEST 1: Overdue Bill → CRITICAL ---
  console.log("▶ TEST 1: Overdue Bill → CRITICAL");
  const overdueUrgency = calculateUrgency("2026-08-20", now);
  assert.ok(overdueUrgency, "Urgency calculation should return result for overdue date");
  assert.strictEqual(overdueUrgency.urgency, "CRITICAL", "Overdue date must be classified as CRITICAL");
  assert.ok(overdueUrgency.daysRemaining < 0, "Days remaining for overdue date must be negative");
  console.log(`  ✅ Overdue date (2026-08-20 vs 2026-09-05) -> Urgency: ${overdueUrgency.urgency}, Days: ${overdueUrgency.daysRemaining}`);

  // --- TEST 2: Due Today → CRITICAL ---
  console.log("\n▶ TEST 2: Due Today → CRITICAL");
  const todayUrgency = calculateUrgency("2026-09-05", now);
  assert.ok(todayUrgency, "Urgency calculation should return result for today");
  assert.strictEqual(todayUrgency.urgency, "CRITICAL", "Due today date must be classified as CRITICAL");
  assert.strictEqual(todayUrgency.daysRemaining, 0, "Days remaining for today must be 0");
  console.log(`  ✅ Due today date (2026-09-05) -> Urgency: ${todayUrgency.urgency}, Days: ${todayUrgency.daysRemaining}`);

  // --- TEST 3: Deadline within 3 days → HIGH ---
  console.log("\n▶ TEST 3: Deadline within 3 days → HIGH");
  const highUrgency = calculateUrgency("2026-09-07", now);
  assert.ok(highUrgency, "Urgency calculation should return result for date within 3 days");
  assert.strictEqual(highUrgency.urgency, "HIGH", "Date within 3 days must be classified as HIGH");
  assert.strictEqual(highUrgency.daysRemaining, 2, "Days remaining should be 2");
  console.log(`  ✅ Date in 2 days (2026-09-07) -> Urgency: ${highUrgency.urgency}, Days: ${highUrgency.daysRemaining}`);

  // --- TEST 4: Deadline within 7 days → MEDIUM ---
  console.log("\n▶ TEST 4: Deadline within 7 days → MEDIUM");
  const mediumUrgency = calculateUrgency("2026-09-10", now);
  assert.ok(mediumUrgency, "Urgency calculation should return result for date within 7 days");
  assert.strictEqual(mediumUrgency.urgency, "MEDIUM", "Date within 7 days must be classified as MEDIUM");
  assert.strictEqual(mediumUrgency.daysRemaining, 5, "Days remaining should be 5");
  console.log(`  ✅ Date in 5 days (2026-09-10) -> Urgency: ${mediumUrgency.urgency}, Days: ${mediumUrgency.daysRemaining}`);

  // --- TEST 5: Distant Deadline → UPCOMING ---
  console.log("\n▶ TEST 5: Distant Deadline → UPCOMING");
  const upcomingUrgency = calculateUrgency("2026-10-15", now);
  assert.ok(upcomingUrgency, "Urgency calculation should return result for distant date");
  assert.strictEqual(upcomingUrgency.urgency, "UPCOMING", "Date > 7 days must be classified as UPCOMING");
  assert.ok(upcomingUrgency.daysRemaining > 7, "Days remaining should be > 7");
  console.log(`  ✅ Distant date (2026-10-15) -> Urgency: ${upcomingUrgency.urgency}, Days: ${upcomingUrgency.daysRemaining}`);

  // --- TEST 6: No Deadlines → No Fake Urgency ---
  console.log("\n▶ TEST 6: No Deadlines → No Fake Urgency");
  const cleanInsights = await getProactiveDeadlineInsights(userCleanId, now);
  assert.strictEqual(cleanInsights.length, 0, "Clean user workspace must have 0 deadline insights");
  console.log("  ✅ Clean user workspace returns 0 insights without fake urgency!");

  // --- TEST 7: User Isolation → Another User's Obligation Never Appears ---
  console.log("\n▶ TEST 7: User Isolation → Another User's Obligation Never Appears");
  const docA = await clarionStore.addDocument(
    "ConEdison Utility Bill",
    "coned_bill.pdf",
    "Overdue utility bill of $342.50 due 2026-09-02.",
    "BILL",
    userAId
  );

  const insightsA = await getProactiveDeadlineInsights(userAId, now);
  const insightsB = await getProactiveDeadlineInsights(userBId, now);

  assert.ok(insightsA.length > 0, "User A should have deadline insights for docA");
  const leakedDocA = insightsB.some((i) => i.sourceDocumentId === docA.id || i.title.includes("ConEdison"));
  assert.strictEqual(leakedDocA, false, "User B must NEVER receive or see User A's deadline insights!");
  console.log("  ✅ User isolation verified! User A obligation never appeared for User B.");

  // --- TEST 8: Duplicate Obligation → Only One Insight (Deduplication) ---
  console.log("\n▶ TEST 8: Duplicate Obligation → Only One Insight");
  // Add a task that shares the exact same document title and due date as docA
  await clarionStore.addCustomTask({
    title: "ConEdison Utility Bill Task",
    description: "Duplicate task for ConEdison Utility Bill",
    priority: "HIGH",
    dueDate: docA.extraction?.dueDate,
    documentId: docA.id,
    userId: userAId
  });

  const dedupedInsights = await getProactiveDeadlineInsights(userAId, now);
  const conedInsights = dedupedInsights.filter(
    (i) => i.sourceDocumentId === docA.id || i.title.toLowerCase().includes("conedison")
  );
  assert.strictEqual(conedInsights.length, 1, "Deduplication must ensure only 1 insight per underlying obligation");
  console.log("  ✅ Deduplication verified! Duplicate task/document obligations merged into single insight.");

  // --- TEST 9: Gemini Unavailable → Deterministic Intelligence Still Works ---
  console.log("\n▶ TEST 9: Gemini Unavailable → Deterministic Intelligence Works");
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const offlineInsights = await getProactiveDeadlineInsights(userAId, now);
    assert.ok(offlineInsights.length > 0, "Proactive deadline intelligence must work deterministically without Gemini");
    assert.ok(offlineInsights[0].urgency, "Urgency must be computed deterministically offline");
    console.log("  ✅ Proactive deadline intelligence operates 100% deterministically without Gemini!");
  } finally {
    if (originalKey) {
      process.env.GEMINI_API_KEY = originalKey;
    }
  }

  // --- TEST 10: Recommendation → Confirmation / Action Flow Remains Intact ---
  console.log("\n▶ TEST 10: Recommendation → Confirmation / Action Flow Remains Intact");
  const targetInsight = insightsA[0];
  assert.ok(targetInsight.suggestedAction, "Suggested action must be populated");
  assert.ok(targetInsight.actionType, "Action type must be populated");

  const createdTask = await agentTools.createTask({
    title: targetInsight.actionArgs.title,
    dueDate: targetInsight.actionArgs.dueDate,
    priority: targetInsight.actionArgs.priority,
    documentId: targetInsight.sourceDocumentId,
    userId: userAId
  });

  assert.ok(createdTask.id, "Action flow confirmation must create task in user store");
  const userATasks = await clarionStore.getAllTasks(userAId);
  assert.ok(userATasks.some((t) => t.id === createdTask.id), "Task must be persisted in user A tasks");
  console.log("  ✅ Proactive insight connected seamlessly to Step 9 confirmation/action flow!");

  console.log("\n=================================================");
  console.log("🎉 ALL 10 STEP 10 INTEGRATION TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================\n");
}

runStep10Tests().catch((err) => {
  console.error("❌ Step 10 Integration Test Failed:", err);
  process.exit(1);
});
