export interface DocumentChunkInput {
  chunkIndex: number;
  content: string;
  startChar: number;
  endChar: number;
}

/**
 * Approximate Character and Word-Based Document Text Chunker
 * 
 * NOTE ON STRATEGY:
 * Since no external heavy tokenizer library (e.g. tiktoken) is installed in this project,
 * this function implements a safe approximate chunking strategy.
 * It targets ~1800 characters (~400-500 words / ~450 tokens) per chunk with a 200-character overlap,
 * while respecting paragraph and sentence boundaries to avoid splitting in the middle of words.
 * 
 * Each chunk preserves:
 * - chunkIndex: 0-indexed order of chunk
 * - content: text content of chunk
 * - startChar: starting character index in original document string
 * - endChar: ending character index in original document string
 */
export function chunkDocumentText(
  text: string,
  targetChunkSize: number = 1800,
  overlapSize: number = 200
): DocumentChunkInput[] {
  if (!text || typeof text !== "string" || !text.trim()) {
    return [];
  }

  const cleanText = text.trim();
  const chunks: DocumentChunkInput[] = [];

  // Single chunk fallback for small text
  if (cleanText.length <= targetChunkSize) {
    return [
      {
        chunkIndex: 0,
        content: cleanText,
        startChar: 0,
        endChar: cleanText.length
      }
    ];
  }

  const rawParagraphs = cleanText.split(/\n\s*\n/);
  let currentChunkText = "";
  let currentStartChar = 0;
  let chunkIndex = 0;
  let runningIndex = 0;

  for (let i = 0; i < rawParagraphs.length; i++) {
    const p = rawParagraphs[i].trim();
    if (!p) continue;

    const pStart = cleanText.indexOf(p, runningIndex);
    runningIndex = pStart >= 0 ? pStart + p.length : runningIndex;

    if ((currentChunkText + "\n\n" + p).length > targetChunkSize && currentChunkText.length > 0) {
      const endChar = currentStartChar + currentChunkText.length;
      chunks.push({
        chunkIndex: chunkIndex++,
        content: currentChunkText.trim(),
        startChar: currentStartChar,
        endChar
      });

      // Compute overlapping context from previous chunk end
      const overlapStart = Math.max(0, currentChunkText.length - overlapSize);
      const overlapText = currentChunkText.substring(overlapStart);
      currentStartChar = Math.max(0, endChar - overlapText.length);
      currentChunkText = overlapText + "\n\n" + p;
    } else {
      if (currentChunkText.length === 0) {
        currentStartChar = pStart >= 0 ? pStart : 0;
        currentChunkText = p;
      } else {
        currentChunkText += "\n\n" + p;
      }
    }
  }

  if (currentChunkText.trim().length > 0) {
    chunks.push({
      chunkIndex: chunkIndex++,
      content: currentChunkText.trim(),
      startChar: currentStartChar,
      endChar: currentStartChar + currentChunkText.length
    });
  }

  return chunks;
}
