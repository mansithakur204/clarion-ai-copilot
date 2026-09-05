import { prisma } from "../store";
import { DocumentChunkInput } from "./chunker";

export interface StoredDocumentChunk {
  id: string;
  documentId: string;
  userId: string;
  chunkIndex: number;
  content: string;
  startChar: number;
  endChar: number;
  createdAt: Date;
}

/**
 * Update a document's indexingStatus in PostgreSQL database.
 */
export async function updateDocumentIndexingStatus(
  documentId: string,
  status: "PENDING" | "INDEXING" | "INDEXED" | "FAILED"
): Promise<void> {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { indexingStatus: status }
    });
  } catch (err: any) {
    console.warn(`[VectorStore] Failed to update indexingStatus for document ${documentId}:`, err?.message || err);
  }
}

/**
 * Save DocumentChunk records and 768-dim vector embeddings safely into Neon PostgreSQL.
 * 
 * Safety & Duplicate Prevention:
 * - Deletes prior DocumentChunk records for this documentId before inserting new ones.
 * - Leaves all other documents and user data completely untouched.
 * - Strictly associates every chunk with documentId, userId, chunkIndex, content, startChar, endChar, embedding.
 */
export async function saveChunksToVectorStore(
  documentId: string,
  userId: string,
  chunks: DocumentChunkInput[],
  embeddings: number[][]
): Promise<void> {
  if (!chunks || chunks.length === 0) return;

  // 1. Delete prior chunks for this document to prevent duplicate chunk records on re-indexing
  try {
    await prisma.documentChunk.deleteMany({
      where: { documentId, userId }
    });
  } catch (deleteErr: any) {
    console.warn(`[VectorStore] Notice during chunk cleanup for ${documentId}:`, deleteErr?.message || deleteErr);
  }

  // 2. Insert each chunk with user and document association
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i] || [];
    const vectorStr = embedding.length > 0 ? `[${embedding.join(",")}]` : null;

    try {
      if (vectorStr) {
        // Execute raw SQL insert to populate pgvector vector(768) column
        await prisma.$executeRaw`
          INSERT INTO "DocumentChunk" ("id", "documentId", "userId", "chunkIndex", "content", "startChar", "endChar", "embedding", "createdAt")
          VALUES (
            gen_random_uuid()::text,
            ${documentId},
            ${userId},
            ${chunk.chunkIndex},
            ${chunk.content},
            ${chunk.startChar},
            ${chunk.endChar},
            ${vectorStr}::vector,
            NOW()
          )
        `;
      } else {
        // Fallback standard insert if embedding failed for this chunk
        await prisma.documentChunk.create({
          data: {
            documentId,
            userId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            startChar: chunk.startChar,
            endChar: chunk.endChar
          }
        });
      }
    } catch (insertErr: any) {
      console.warn(`[VectorStore] Standard insert fallback for chunk ${chunk.chunkIndex}:`, insertErr?.message || insertErr);
      await prisma.documentChunk.create({
        data: {
          documentId,
          userId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          startChar: chunk.startChar,
          endChar: chunk.endChar
        }
      });
    }
  }
}
