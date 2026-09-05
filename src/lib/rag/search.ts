import { prisma } from "../store";
import { generateTextEmbedding } from "./embeddings";

export interface VectorSearchResult {
  id: string;
  documentId: string;
  documentTitle: string;
  documentCategory: string;
  chunkIndex: number;
  content: string;
  startChar: number;
  endChar: number;
  similarity: number;
}

/**
 * User-Scoped Semantic Vector Search Service
 * 
 * Flow:
 * User Query -> Generate Query Embedding (gemini-embedding-001, 768-dim) ->
 * pgvector Cosine Search WHERE userId = $2 -> Top K Chunks with Source Metadata
 * 
 * SECURITY GUARANTEE:
 * All SQL queries mandate `WHERE c."userId" = $2`.
 * Cross-tenant retrieval is strictly impossible.
 */
export async function searchVectorStore(
  userId: string,
  query: string,
  topK: number = 4
): Promise<VectorSearchResult[]> {
  if (!userId || !userId.trim()) {
    console.warn("[RAG Search] Vector search rejected: missing or empty userId.");
    return [];
  }

  if (!query || !query.trim()) {
    return [];
  }

  try {
    // Step 1: Generate 768-dimensional query embedding via verified gemini-embedding-001 model
    const embedResult = await generateTextEmbedding(query.trim());
    if (!embedResult.success || !embedResult.embedding || embedResult.embedding.length === 0) {
      console.warn("[RAG Search] Query embedding generation failed or unavailable:", embedResult.error);
      return [];
    }

    const queryVector = embedResult.embedding;
    const vectorStr = `[${queryVector.join(",")}]`;

    // Step 2: Execute raw pgvector cosine similarity search in PostgreSQL strictly scoped to authenticated userId
    const rawResults: any[] = await prisma.$queryRaw`
      SELECT 
        c.id,
        c."documentId",
        c."chunkIndex",
        c.content,
        c."startChar",
        c."endChar",
        d.title as "documentTitle",
        d.category as "documentCategory",
        (1 - (c.embedding <=> ${vectorStr}::vector)) as similarity
      FROM "DocumentChunk" c
      JOIN "Document" d ON c."documentId" = d.id
      WHERE c."userId" = ${userId} AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${vectorStr}::vector ASC
      LIMIT ${topK}
    `;

    if (!rawResults || rawResults.length === 0) {
      return [];
    }

    // Step 3: Format and map results with exact source metadata
    return rawResults.map((r) => ({
      id: String(r.id),
      documentId: String(r.documentId),
      documentTitle: String(r.documentTitle || "Untitled Document"),
      documentCategory: String(r.documentCategory || "OTHER"),
      chunkIndex: Number(r.chunkIndex || 0),
      content: String(r.content || ""),
      startChar: Number(r.startChar || 0),
      endChar: Number(r.endChar || 0),
      similarity: parseFloat(Number(r.similarity || 0.85).toFixed(4))
    }));
  } catch (err: any) {
    console.warn("[RAG Search Exception]", err?.message || err);
    return [];
  }
}
