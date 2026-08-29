import { NextResponse } from "next/server";
import { clarionStore } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const doc = await clarionStore.getDocumentById(params.id, user?.id);
    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, document: doc });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const doc = await clarionStore.verifyExtraction(params.id, body, user?.id);
    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Document not found or update failed" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, document: doc });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify document" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { title, description, actionType, priority, dueDate } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Task title is required" },
        { status: 400 }
      );
    }

    const newTask = await clarionStore.addTaskToDocument(
      params.id,
      title,
      description || "",
      actionType || "GENERAL",
      priority || "MEDIUM",
      dueDate,
      user?.id
    );

    return NextResponse.json({ success: true, task: newTask });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add task" },
      { status: 500 }
    );
  }
}
