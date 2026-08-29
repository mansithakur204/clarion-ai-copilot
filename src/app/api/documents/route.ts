import { NextResponse } from "next/server";
import { clarionStore } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const docs = await clarionStore.getDocuments(user?.id);
    return NextResponse.json({ success: true, documents: docs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Failed to load workspace documents." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { title, filename, rawText, category } = body;

    if (!rawText || !filename) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: filename and rawText" },
        { status: 400 }
      );
    }

    const doc = await clarionStore.addDocument(
      title || filename,
      filename,
      rawText,
      category || "OTHER",
      user?.id || "demo-user-id"
    );

    return NextResponse.json({
      success: true,
      document: doc,
      wasFallback: doc.usedFallback || false,
      fallbackMessage: doc.fallbackReason || "Google Gemini is temporarily unavailable. Clarion automatically switched to the Local Processing Engine and continued processing your document."
    });
  } catch (error: any) {
    console.error("[Documents API Error]", error);
    // Never expose raw backend JSON, 429 quota text, or stack trace to client UI
    return NextResponse.json(
      {
        success: false,
        error: "Document processing encountered an unexpected issue. Please ensure your document text is valid and try again."
      },
      { status: 500 }
    );
  }
}
