import { prisma, clarionStore } from "@/lib/store";
import { GoogleGenAI } from "@google/genai";
import { TaskRecord, DocumentRecord } from "@/lib/types";

export interface BriefingAttentionItem {
  type: "TASK" | "DEADLINE" | "FINANCIAL";
  title: string;
  description: string;
  dueDate?: string;
  amount?: number;
  priority?: string;
}

export interface BriefingUpcomingItem {
  type: "TASK" | "DEADLINE" | "FINANCIAL";
  title: string;
  description?: string;
  date?: string;
}

export interface DailyBriefingData {
  greeting: string;
  userName?: string;
  stats: {
    totalDocuments: number;
    indexedDocuments: number;
    pendingTasks: number;
    overdueTasks: number;
    upcomingDeadlines: number;
  };
  needsAttention: BriefingAttentionItem[];
  upcoming: BriefingUpcomingItem[];
  documentInsights: string[];
  summary: string;
  generatedAt: string;
  isAiGenerated?: boolean;
}

function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export async function generateDailyBriefing(userId: string): Promise<DailyBriefingData> {
  const now = new Date();
  const greeting = getGreeting(now);

  // 1. Fetch User details
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const userName = user?.name || undefined;

  // 2. Fetch User Documents (Prisma DB + Store merge)
  let dbDocs = await prisma.document.findMany({
    where: { userId },
    include: { extractedData: true, deadlines: true, tasks: true }
  });

  const storeDocs = await clarionStore.getDocuments(userId);
  const docMap = new Map<string, any>();
  storeDocs.forEach((d) => docMap.set(d.id, d));
  dbDocs.forEach((d) => docMap.set(d.id, d));
  const userDocuments = Array.from(docMap.values());

  // 3. Fetch User Tasks
  const allTasks: TaskRecord[] = await clarionStore.getTasks(userId);
  const pendingTasks = allTasks.filter((t) => t.status === "PENDING");

  // 4. Compute Statistics
  const totalDocuments = userDocuments.length;
  const indexedDocuments = userDocuments.filter(
    (d) => d.indexingStatus === "INDEXED"
  ).length;

  let overdueTasksCount = 0;
  let upcomingDeadlinesCount = 0;

  const needsAttentionList: BriefingAttentionItem[] = [];
  const upcomingList: BriefingUpcomingItem[] = [];
  const documentInsights: string[] = [];

  // 5. Intelligent Prioritization & Item Evaluation
  // A. Check Pending Tasks for Overdue / Urgent Items
  for (const task of pendingTasks) {
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      if (!isNaN(due.getTime())) {
        if (due < now) {
          overdueTasksCount++;
          needsAttentionList.push({
            type: "TASK",
            title: task.title,
            description: task.description || "Overdue task requiring completion.",
            dueDate: due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            priority: task.priority || "HIGH"
          });
        } else {
          const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
          if (diffDays <= 7) {
            upcomingDeadlinesCount++;
            if (task.priority === "URGENT" || task.priority === "HIGH" || diffDays <= 2) {
              needsAttentionList.push({
                type: "TASK",
                title: task.title,
                description: task.description || `Task due in ${diffDays} day(s).`,
                dueDate: due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                priority: task.priority || "MEDIUM"
              });
            } else {
              upcomingList.push({
                type: "TASK",
                title: task.title,
                description: task.description,
                date: due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              });
            }
          } else {
            upcomingList.push({
              type: "TASK",
              title: task.title,
              description: task.description,
              date: due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            });
          }
        }
      }
    } else if (task.priority === "URGENT" || task.priority === "HIGH") {
      needsAttentionList.push({
        type: "TASK",
        title: task.title,
        description: task.description || "High priority pending item.",
        priority: task.priority
      });
    }
  }

  // B. Check Document Extractions for Financial Obligations & Deadlines
  let totalFinancialLiability = 0;
  for (const doc of userDocuments) {
    const ext = doc.extractedData || doc.extraction;
    if (ext) {
      if (ext.totalAmount && ext.totalAmount > 0) {
        totalFinancialLiability += ext.totalAmount;
        if (ext.dueDate) {
          const due = new Date(ext.dueDate);
          if (!isNaN(due.getTime())) {
            const formattedDate = due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            if (due < now) {
              // Only add if not already covered by a duplicate task
              if (!needsAttentionList.some((i) => i.title.toLowerCase().includes(doc.title.toLowerCase()))) {
                needsAttentionList.push({
                  type: "FINANCIAL",
                  title: `${doc.title} (${ext.issuer || "Bill"})`,
                  description: `Overdue bill of $${ext.totalAmount.toFixed(2)} due on ${formattedDate}.`,
                  dueDate: formattedDate,
                  amount: ext.totalAmount,
                  priority: "URGENT"
                });
              }
            } else {
              const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
              if (diffDays <= 7) {
                if (!needsAttentionList.some((i) => i.title.toLowerCase().includes(doc.title.toLowerCase()))) {
                  needsAttentionList.push({
                    type: "FINANCIAL",
                    title: `${doc.title} (${ext.issuer || "Bill"})`,
                    description: `Payment of $${ext.totalAmount.toFixed(2)} due on ${formattedDate}.`,
                    dueDate: formattedDate,
                    amount: ext.totalAmount,
                    priority: "HIGH"
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  // C. Document Insights Summary Bullets
  if (totalDocuments === 0) {
    documentInsights.push("Upload documents to let Clarion organize and search your workspace.");
  } else {
    documentInsights.push(`You currently have ${totalDocuments} document(s) in your workspace.`);
    documentInsights.push(`${indexedDocuments} of ${totalDocuments} document(s) are indexed and searchable via Copilot RAG.`);
    if (totalFinancialLiability > 0) {
      documentInsights.push(`Total tracked financial commitment: $${totalFinancialLiability.toFixed(2)}.`);
    }
  }

  // 6. Generate Deterministic Local Summary Fallback
  let localSummary = "";
  if (needsAttentionList.length > 0) {
    const topItem = needsAttentionList[0];
    localSummary = `Your workspace has ${pendingTasks.length} pending task(s) and ${needsAttentionList.length} urgent item(s) requiring attention. Top priority: ${topItem.title}.`;
  } else if (pendingTasks.length > 0 || upcomingDeadlinesCount > 0) {
    localSummary = `Your workspace has ${pendingTasks.length} pending task(s) and ${upcomingDeadlinesCount} upcoming deadline(s). Everything is on track.`;
  } else {
    localSummary = `Nothing urgent requires your attention right now. Your workspace is fully up to date.`;
  }

  // 7. Optional AI Summary Generation with Graceful Try/Catch Fallback
  let finalSummary = localSummary;
  let isAiGenerated = false;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim()) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are Clarion AI, an executive admin assistant. Provide a single, concise 1-2 sentence briefing summary for the user based strictly on these verified numbers:
- User Name: ${userName || "User"}
- Greeting: ${greeting}
- Total Documents: ${totalDocuments} (${indexedDocuments} indexed)
- Pending Tasks: ${pendingTasks.length} (${overdueTasksCount} overdue)
- Top Urgent Item: ${needsAttentionList[0] ? needsAttentionList[0].title : "None"}

Rules: Do not invent numbers or facts. Keep response under 35 words. Return plain text.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      const aiText = response.text?.trim();
      if (aiText && aiText.length > 10) {
        finalSummary = aiText;
        isAiGenerated = true;
      }
    } catch (e: any) {
      console.warn("[DailyBriefing] Gemini AI summary fallback triggered:", e?.message || e);
    }
  }

  return {
    greeting,
    userName,
    stats: {
      totalDocuments,
      indexedDocuments,
      pendingTasks: pendingTasks.length,
      overdueTasks: overdueTasksCount,
      upcomingDeadlines: upcomingDeadlinesCount
    },
    needsAttention: needsAttentionList.slice(0, 5), // Top 5 urgent
    upcoming: upcomingList.slice(0, 5),
    documentInsights,
    summary: finalSummary,
    generatedAt: now.toISOString(),
    isAiGenerated
  };
}
