import { AIProvider } from "./provider";
import { MockAIProvider } from "./mock";
import { GeminiAIProvider } from "./gemini";
import { DocumentAnalysisResult } from "../types";
import { prisma } from "../store";

export class ResilientAIProvider implements AIProvider {
  name = "Clarion Resilient AI Engine";

  private geminiProvider = new GeminiAIProvider();
  private mockProvider = new MockAIProvider();

  isAvailable(): boolean {
    return true; // Resilient provider is always available via local fallback
  }

  async analyzeDocument(
    rawText: string,
    filename: string,
    userId?: string
  ): Promise<DocumentAnalysisResult> {
    let providerSetting = (process.env.AI_PROVIDER || "auto").toLowerCase();

    // Check user-scoped persistent settings if userId is provided
    if (userId) {
      try {
        const userSettings = await prisma.userSettings.findUnique({
          where: { userId }
        });
        if (userSettings?.selectedProvider) {
          providerSetting = userSettings.selectedProvider.toLowerCase();
        }
      } catch (err) {
        // Fallback to process.env.AI_PROVIDER
      }
    }

    // Mode 1: Explicit Local Mock Engine selected
    if (providerSetting === "mock" || providerSetting === "local_mock") {
      console.log("[ResilientAIProvider] Mode: Local Mock Engine explicitly selected.");
      const mockResult = await this.mockProvider.analyzeDocument(rawText, filename);
      return {
        ...mockResult,
        usedFallback: false,
        providerUsed: "Local Mock Engine"
      };
    }

    // Mode 2: Auto Recommended or Explicit Gemini AI selected
    if (this.geminiProvider.isAvailable()) {
      try {
        console.log(`[ResilientAIProvider] Attempting analysis via Google Gemini AI Engine...`);
        const geminiResult = await this.geminiProvider.analyzeDocument(rawText, filename);
        return {
          ...geminiResult,
          usedFallback: false,
          providerUsed: "Google Gemini AI Engine"
        };
      } catch (err: any) {
        const errorDetail = err?.message || String(err);
        console.warn(`⚠️ [ResilientAIProvider] Gemini processing failed (${errorDetail}). Switched automatically to Local Mock Engine.`);

        // Process document with Local Mock Engine so document analysis is never interrupted
        const mockResult = await this.mockProvider.analyzeDocument(rawText, filename);

        return {
          ...mockResult,
          usedFallback: true,
          providerUsed: "Local Mock Engine (Fallback)",
          fallbackReason: "Google Gemini is temporarily unavailable. Clarion automatically switched to the Local Processing Engine and continued processing your document.",
          originalError: errorDetail
        };
      }
    }

    // Mode 3: Gemini API Key missing or unavailable
    console.log("[ResilientAIProvider] GEMINI_API_KEY is not configured. Processing via Local Mock Engine.");
    const mockResult = await this.mockProvider.analyzeDocument(rawText, filename);
    return {
      ...mockResult,
      usedFallback: true,
      providerUsed: "Local Mock Engine (Offline Mode)",
      fallbackReason: "Google Gemini API Key is not configured. Clarion automatically processed your document using the Local Processing Engine."
    };
  }
}

export function getActiveAIProvider(): AIProvider {
  return new ResilientAIProvider();
}

export * from "./provider";
export * from "./mock";
export * from "./gemini";
