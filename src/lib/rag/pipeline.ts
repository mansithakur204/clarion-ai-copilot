import { chunkDocumentText } from "./chunker";
import { generateBatchEmbeddings } from "./embeddings";
import { saveChunksToVectorStore, updateDocumentIndexingStatus } from "./vectorStore";

export interface IndexingResult {
  success: boolean;
  documentId: string;
  chunksIndexed: number;
  status: "INDEXED" | "FAILED";
  error?: string;
}

/**
 * Execute the Document Indexing Pipeline for a saved document.
 * 
 * Life Cycle:
 * PENDING -> INDEXING -> INDEXED (or FAILED on error)
 * 
 * Safety:
 * - Never deletes the original document if indexing fails.
 * - Leaves indexingStatus as FAILED so document remains viewable and accessible.
 * - Prevents API key exposure in error logs.
 */
export async function runDocumentIndexingPipeline(
  documentId: string,
  userId: string,
  rawContent: string
): Promise<IndexingResult> {
  if (!documentId || !userId || !rawContent || !rawContent.trim()) {
    await updateDocumentIndexingStatus(documentId, "FAILED");
    return {
      success: false,
      documentId,
      chunksIndexed: 0,
      status: "FAILED",
      error: "Document content or IDs missing for indexing."
    };
  }

  try {
    // Step 1: Set status to INDEXING
    await updateDocumentIndexingStatus(documentId, "INDEXING");

    // Step 2: Chunk extracted text
    const chunks = chunkDocumentText(rawContent);
    if (chunks.length === 0) {
      await updateDocumentIndexingStatus(documentId, "FAILED");
      return {
        success: false,
        documentId,
        chunksIndexed: 0,
        status: "FAILED",
        error: "No chunks generated from document text."
      };
    }

    // Step 3: Generate 768-dim embeddings for all chunks
    const embeddingResults = await generateBatchEmbeddings(chunks.map((c) => c.content));
    const embeddings = embeddingResults.map((res) => res.embedding);

    // Step 4: Save DocumentChunk records in pgvector
    await saveChunksToVectorStore(documentId, userId, chunks, embeddings);

    // Step 5: Set status to INDEXED
    await updateDocumentIndexingStatus(documentId, "INDEXED");

    return {
      success: true,
      documentId,
      chunksIndexed: chunks.length,
      status: "INDEXED"
    };
  } catch (err: any) {
    const safeErrorMsg = err?.message || String(err);
    console.warn(`[Indexing Pipeline Error] Document ${documentId}:`, safeErrorMsg);

    // Set status to FAILED safely without touching original document content
    await updateDocumentIndexingStatus(documentId, "FAILED");

    return {
      success: false,
      documentId,
      chunksIndexed: 0,
      status: "FAILED",
      error: safeErrorMsg
    };
  }
}
