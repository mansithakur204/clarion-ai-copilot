import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { getProactiveDeadlineInsights } from "@/lib/briefing/deadlineIntelligence";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const insights = await getProactiveDeadlineInsights(user.id);
    return NextResponse.json({ success: true, insights });
  } catch (error: any) {
    console.error("[Proactive Obligations API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch proactive obligations." },
      { status: 500 }
    );
  }
}
