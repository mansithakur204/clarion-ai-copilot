import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { generateDailyBriefing } from "@/lib/briefing/dailyBriefing";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const briefing = await generateDailyBriefing(user.id);
    return NextResponse.json({ success: true, briefing });
  } catch (error: any) {
    console.error("[Daily Briefing API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate daily briefing." },
      { status: 500 }
    );
  }
}
