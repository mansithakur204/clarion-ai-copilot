import { NextResponse } from "next/server";
import { clarionStore } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const logs = await clarionStore.getAuditLogs(user?.id);
    return NextResponse.json({ success: true, auditLogs: logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
