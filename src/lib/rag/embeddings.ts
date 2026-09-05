import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL_NAME = "gemini-embedding-001";
export const EMBEDDING_DIMENSION = 768;

export interface EmbeddingResult {
  success: boolean;
  embedding: number[];
  dimension: number;
  error?: string;
}

/**
 * Generate a 768-dimensional vector embedding for a single text input using Gemini gemini-embedding-001.
 * Uses config: { outputDimensionality: 768 } to guarantee 768-dim output matching pgvector schema.
 * Includes error handling for missing API keys, empty text, and API errors.
 */
export async function generateTextEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text || !text.trim()) {
    return {
      success: false,
      embedding: [],
      dimension: 0,
      error: "Text input for embedding generation is empty."
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.warn("[RAG Embeddings] GEMINI_API_KEY is not configured.");
    return {
      success: false,
      embedding: [],
      dimension: 0,
      error: "GEMINI_API_KEY is missing."
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response: any = await ai.models.embedContent({
      model: EMBEDDING_MODEL_NAME,
      contents: text.trim(),
      config: {
        outputDimensionality: EMBEDDING_DIMENSION
      }
    });

    const values: number[] | undefined =
      response?.embedding?.values ||
      response?.embeddings?.[0]?.values ||
      (Array.isArray(response?.embedding) ? response.embedding : undefined);

    if (values && values.length > 0) {
      return {
        success: true,
        embedding: values,
        dimension: values.length
      };
    }

    return {
      success: false,
      embedding: [],
      dimension: 0,
      error: "Gemini embedding API returned empty vector values."
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn("[RAG Embeddings API Error]", errMsg);
    return {
      success: false,
      embedding: [],
      dimension: 0,
      error: `Embedding API error: ${errMsg}`
    };
  }
}

/**
 * Batch generate text embeddings for an array of text chunks while preserving input order.
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];
  for (const text of texts) {
    const res = await generateTextEmbedding(text);
    results.push(res);
  }
  return results;
}
