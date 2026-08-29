import { DocumentAnalysisResult } from "../types";

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  analyzeDocument(
    rawText: string,
    filename: string
  ): Promise<DocumentAnalysisResult>;
}
