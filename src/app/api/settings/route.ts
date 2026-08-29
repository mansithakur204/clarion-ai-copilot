import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { prisma, clarionStore } from "@/lib/store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          selectedProvider: "auto"
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        selectedProvider: settings.selectedProvider || "auto"
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load user settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let { selectedProvider } = body;

    if (!selectedProvider || typeof selectedProvider !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid provider selection" },
        { status: 400 }
      );
    }

    // Normalize local_mock to mock
    if (selectedProvider === "local_mock") {
      selectedProvider = "mock";
    }

    const updated = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: { selectedProvider },
      create: {
        userId: user.id,
        selectedProvider
      }
    });

    let providerLabel = "Auto (Recommended)";
    if (selectedProvider === "gemini") providerLabel = "Google Gemini AI";
    if (selectedProvider === "mock") providerLabel = "Local Mock Engine";

    // Audit log entry
    clarionStore.addAuditLog(
      undefined,
      undefined,
      "AI_CONFIGURATION_UPDATED",
      "USER",
      `Updated AI provider setting to: ${providerLabel}`,
      user.id
    );

    return NextResponse.json({
      success: true,
      settings: {
        selectedProvider: updated.selectedProvider
      },
      message: `Configuration saved successfully — ${providerLabel} selected.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
