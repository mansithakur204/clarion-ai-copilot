import { GoogleGenAI } from "@google/genai";
import { AIProvider } from "./provider";
import { DocumentAnalysisResult } from "../types";
import { normalizeDateToYYYYMMDD } from "../dateUtils";

const GEMINI_MODEL_NAME = "gemini-3.6-flash";

export class GeminiAIProvider implements AIProvider {
  name = "Google Gemini AI Engine";

  private getApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  }

  isAvailable(): boolean {
    const key = this.getApiKey();
    return !!key && key.trim() !== "";
  }

  async analyzeDocument(
    rawText: string,
    filename: string
  ): Promise<DocumentAnalysisResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are Clarion AI, a privacy-first administrative document copilot. Analyze the following document text accurately.

CRITICAL INSTRUCTIONS FOR WEIGHTED DOCUMENT CLASSIFICATION:
1. UTILITY / SERVICE BILLS (HIGHEST PRIORITY FOR BILLS):
   - If the document contains terms like "Total Amount Due", "Payment Due Date", "Account Number", "Billing Period", "Electricity", "Utility", or "Service Charge", classify as "BILL" ("Electricity / Utility Bill" or "Utility / Service Bill").
   - Do NOT classify a document with an "Amount Due", "Account Number", and "Payment Due Date" as documentation, even if testing/context text mentions project keywords.
   - Extract Provider Name, Account Number, Total Amount Due, Payment Due Date, Billing Period, and Usage (e.g. kWh).
   - Generate a Payment task for the total amount due before the due date.

2. TECHNICAL / PROJECT DOCUMENTATION:
   - Select "DOCUMENTATION" ONLY when technical/project signals are dominant AND no strong payment/bill/contract obligations exist.
   - Set "totalAmount", "dueDate", and "accountNumber" to null.
   - Set "actionItems" to [] and "questions" to [].

3. RESUME / PROFESSIONAL PROFILE / LINKEDIN PROFILE:
   - Select "RESUME" ONLY when personal CV/profile structure is dominant and no bill or contract exists.
   - Set "totalAmount" and "dueDate" to null.
   - Set "actionItems" to [].

5. CONTEXT-AWARE EXAMPLE FILTERING (CRITICAL):
   - Ignore payment amounts, due dates, or notices that appear inside examples, sample explanations, code blocks, or instructional sentences (e.g. "Example:", "For example", "For instance", "e.g.", "Agar notice me likha hai").
   - Do NOT treat hypothetical or sample figures inside technical documentation as real document obligations. If a technical documentation document includes a sample bill quote for illustration, classify as "DOCUMENTATION" with totalAmount=null, dueDate=null, and actionItems=[].

Document Filename: "${filename}"
Document Content:
"""
${rawText}
"""

Return ONLY a valid JSON object with the following exact keys and structure:
{
  "category": "BILL" | "NOTICE" | "CONTRACT" | "STATEMENT" | "TAX" | "HEALTHCARE" | "DOCUMENTATION" | "RESUME" | "OTHER",
  "documentType": "string (e.g. Electricity / Utility Bill, Lease Agreement, Resume / CV, Technical Documentation)",
  "subject": "string (primary organization, provider, candidate, or project name)",
  "issuer": "string (organization or subject name)",
  "accountNumber": "string or null",
  "totalAmount": number or null,
  "currency": "USD",
  "issueDate": "YYYY-MM-DD or string or null",
  "dueDate": "YYYY-MM-DD or string or null",
  "plainLanguageSummary": "Clear 2-3 sentence explanation for a non-technical user",
  "priorityScore": number 1 to 5,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "keyTakeaways": ["string array of 3-5 main facts"],
  "actionItems": [
    {
      "title": "string",
      "description": "string",
      "actionType": "PAYMENT" | "CANCEL_SUBSCRIPTION" | "DISPUTE" | "RENEWAL" | "SUBMIT_FORM" | "VERIFICATION" | "GENERAL",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "suggestedDueDate": "YYYY-MM-DD or null"
    }
  ],
  "questions": ["string array of questions or items that need human verification"],
  "confidenceScore": number between 0.70 and 0.99,
  "extractedFacts": [
    {
      "field": "string name",
      "value": "string value",
      "confidence": number between 0.7 and 1.0,
      "isVerified": false
    }
  ]
}`;

    const res = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const rawJsonText = res.text;

    if (!rawJsonText) {
      throw new Error("Invalid response format from Gemini API.");
    }

    const parsed: DocumentAnalysisResult = JSON.parse(rawJsonText);
    if (parsed.dueDate) {
      parsed.dueDate = normalizeDateToYYYYMMDD(parsed.dueDate);
    }
    if (parsed.actionItems) {
      parsed.actionItems = parsed.actionItems.map((item) => ({
        ...item,
        suggestedDueDate: item.suggestedDueDate ? normalizeDateToYYYYMMDD(item.suggestedDueDate) : undefined
      }));
    }
    parsed.rawTextExcerpt = rawText.substring(0, 400);
    return parsed;
  }
}
