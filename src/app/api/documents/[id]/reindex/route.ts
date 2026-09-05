import { NextResponse } from "next/server";
import { clarionStore } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth/auth";
import { runDocumentIndexingPipeline } from "@/lib/rag/pipeline";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to access workspace documents." },
        { status: 401 }
      );
    }

    const documentId = params.id;
    const doc = await clarionStore.getDocumentById(documentId, user.id);
    if (!doc || doc.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Document not found or access denied." },
        { status: 403 }
      );
    }

    if (!doc.rawContent || !doc.rawContent.trim()) {
      return NextResponse.json(
        { success: false, error: "Document raw text content is empty." },
        { status: 400 }
      );
    }

    const result = await runDocumentIndexingPipeline(doc.id, user.id, doc.rawContent);

    return NextResponse.json({
      success: result.success,
      documentId: doc.id,
      indexingStatus: result.status,
      chunksIndexed: result.chunksIndexed,
      error: result.error
    });
  } catch (error: any) {
    console.error("[Reindex Route Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Document re-indexing failed." },
      { status: 500 }
    );
  }
}
