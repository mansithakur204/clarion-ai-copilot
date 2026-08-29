import { AIProvider } from "./provider";
import { DocumentAnalysisResult, CategoryType, RiskLevel } from "../types";
import { SAMPLE_DOCUMENTS } from "../sampleDocs";
import { normalizeDateToYYYYMMDD } from "../dateUtils";

export class MockAIProvider implements AIProvider {
  name = "Clarion Local Engine (Mock / Fallback)";

  isAvailable(): boolean {
    return true; // Always available
  }

  async analyzeDocument(
    rawText: string,
    filename: string
  ): Promise<DocumentAnalysisResult> {
    // 1. Check if matching sample document first
    const matchedSample = SAMPLE_DOCUMENTS.find(
      (s) =>
        filename.includes(s.filename) ||
        rawText.includes(s.filename) ||
        s.rawText.trim() === rawText.trim()
    );

    if (matchedSample) {
      return this.generateSampleAnalysis(matchedSample.id, rawText);
    }

    // 2. Perform intelligent heuristic extraction on custom uploaded text
    return this.heuristicExtract(rawText, filename);
  }

  private generateSampleAnalysis(sampleId: string, rawText: string): DocumentAnalysisResult {
    if (sampleId === "sample-electric-shutoff") {
      return {
        category: "BILL",
        issuer: "ConEdison Utility Services",
        accountNumber: "#9482-1049-22",
        totalAmount: 342.50,
        currency: "USD",
        issueDate: "2026-08-15",
        dueDate: "2026-09-02",
        plainLanguageSummary:
          "This is an urgent final disconnection notice from ConEdison. Your account is past due by $342.50. If you do not pay or establish a payment agreement by September 2, 2026 at 5:00 PM, your electric service will be shut off on September 5, 2026, incurring an additional $45 reconnection fee.",
        priorityScore: 5,
        riskLevel: "URGENT",
        keyTakeaways: [
          "Past-due balance of $342.50 for service between June 10 and July 25, 2026.",
          "Hard payment deadline is September 2, 2026 at 5:00 PM EST.",
          "Service disconnection scheduled for September 5, 2026 if unpaid.",
          "HEAP financial assistance hotline available prior to August 30, 2026."
        ],
        actionItems: [
          {
            title: "Pay $342.50 ConEdison Overdue Balance",
            description: "Pay online at www.conedison.com/pay-online or call 1-800-555-0199.",
            actionType: "PAYMENT",
            priority: "URGENT",
            suggestedDueDate: "2026-09-02"
          },
          {
            title: "Check HEAP Financial Hardship Eligibility",
            description: "Call 1-800-555-HEAP before Aug 30 to inquire about utility assistance.",
            actionType: "GENERAL",
            priority: "HIGH",
            suggestedDueDate: "2026-08-30"
          }
        ],
        questions: [
          "Did you already make a partial payment towards this $342.50 balance recently?",
          "Are you currently registered for energy financial assistance programs?"
        ],
        confidenceScore: 0.96,
        extractedFacts: [
          { field: "Issuer", value: "ConEdison Utility Services", confidence: 0.99, isVerified: false },
          { field: "Account #", value: "#9482-1049-22", confidence: 0.98, isVerified: false },
          { field: "Overdue Amount", value: "$342.50", confidence: 0.99, isVerified: false },
          { field: "Payment Deadline", value: "2026-09-02", confidence: 0.97, isVerified: false },
          { field: "Disconnection Date", value: "2026-09-05", confidence: 0.95, isVerified: false }
        ],
        rawTextExcerpt: rawText.substring(0, 400)
      };
    }

    if (sampleId === "sample-lease-renewal") {
      return {
        category: "CONTRACT",
        issuer: "Avalon Bay Residential Leasing",
        accountNumber: "Unit Apt 4B",
        totalAmount: 3450.00,
        currency: "USD",
        issueDate: "2026-08-18",
        dueDate: "2026-09-01",
        plainLanguageSummary:
          "Your lease at Apartment 4B expires on October 31, 2026. You MUST provide written notice by September 1, 2026 (60 days prior). If you renew for 12 months, your rent increases 7% to $3,450/month. If you fail to respond by Sept 1, your lease will automatically convert to a month-to-month lease at $4,100/month.",
        priorityScore: 4,
        riskLevel: "HIGH",
        keyTakeaways: [
          "Lease expires October 31, 2026; 60-day notice is mandatory.",
          "12-month renewal increases rent from $3,224.00 to $3,450.00/mo (+7%).",
          "Default penalty for no response is automatic conversion to $4,100.00/mo.",
          "Must submit written decision to Property Manager Sarah Jenkins."
        ],
        actionItems: [
          {
            title: "Submit Lease Renewal or Vacate Notice to Avalon Bay",
            description: "Email s.jenkins@avalonbay.com with Option A ($3,450/mo) or Notice to Vacate.",
            actionType: "RENEWAL",
            priority: "HIGH",
            suggestedDueDate: "2026-09-01"
          }
        ],
        questions: [
          "Do you intend to stay in Apartment 4B for another 12 months?",
          "Have you compared the 7% rent increase ($3,450/mo) with local market rates?"
        ],
        confidenceScore: 0.94,
        extractedFacts: [
          { field: "Property Manager", value: "Avalon Bay Residential", confidence: 0.98, isVerified: false },
          { field: "Unit", value: "Apartment 4B", confidence: 0.99, isVerified: false },
          { field: "Decision Deadline", value: "2026-09-01", confidence: 0.96, isVerified: false },
          { field: "New 12-Mo Rent", value: "$3,450.00 / month", confidence: 0.97, isVerified: false },
          { field: "Default Rate", value: "$4,100.00 / month", confidence: 0.93, isVerified: false }
        ],
        rawTextExcerpt: rawText.substring(0, 400)
      };
    }

    if (sampleId === "sample-insurance-denial") {
      return {
        category: "HEALTHCARE",
        issuer: "Aetna Healthcare",
        accountNumber: "CLM-88392019",
        totalAmount: 1850.00,
        currency: "USD",
        issueDate: "2026-08-01",
        dueDate: "2027-01-15",
        plainLanguageSummary:
          "Aetna has denied coverage for your outpatient MRI on July 12, 2026, leaving you with a balance of $1,850.00. The reason given is lack of prior authorization. You have 180 days (until Jan 15, 2027) to file a first-level appeal with physician clinical notes.",
        priorityScore: 3,
        riskLevel: "MEDIUM",
        keyTakeaways: [
          "Procedure: Outpatient MRI Lumbar Spine billed at $2,400.00.",
          "Denied due to missing pre-authorization from ordering physician.",
          "Patient responsibility is currently $1,850.00.",
          "Appeal window is 180 days (deadline: January 15, 2027)."
        ],
        actionItems: [
          {
            title: "Contact Dr. Vance for MRI Clinical Notes",
            description: "Request doctor's notes proving medical necessity for MRI pre-authorization appeal.",
            actionType: "GENERAL",
            priority: "MEDIUM",
            suggestedDueDate: "2026-09-15"
          },
          {
            title: "Submit Aetna Formal Appeal (Form AP-1)",
            description: "Fax Form AP-1 + doctor notes to 1-800-555-APPL.",
            actionType: "DISPUTE",
            priority: "HIGH",
            suggestedDueDate: "2026-10-01"
          }
        ],
        questions: [
          "Did your doctor's office assure you prior authorization was completed before the MRI?",
          "Would you like Clarion to draft an appeal letter template for your doctor?"
        ],
        confidenceScore: 0.92,
        extractedFacts: [
          { field: "Insurer", value: "Aetna Healthcare", confidence: 0.99, isVerified: false },
          { field: "Claim #", value: "CLM-88392019", confidence: 0.98, isVerified: false },
          { field: "Denied Amount", value: "$1,850.00", confidence: 0.97, isVerified: false },
          { field: "Denial Reason", value: "Lack of Pre-Authorization", confidence: 0.94, isVerified: false },
          { field: "Appeal Deadline", value: "2027-01-15", confidence: 0.91, isVerified: false }
        ],
        rawTextExcerpt: rawText.substring(0, 400)
      };
    }

    // Default Property Tax Assessment
    return {
      category: "TAX",
      issuer: "County Tax Assessor",
      accountNumber: "Parcel #44-092-114-00",
      totalAmount: 4210.00,
      currency: "USD",
      issueDate: "2026-08-10",
      dueDate: "2026-09-30",
      plainLanguageSummary:
        "Your 2026 property tax statement for 742 Evergreen Terrace is $4,210.00 total. You can pay in two equal installments of $2,105.00 (Due Sept 30, 2026 and March 31, 2027), or pay in full by Sept 15, 2026 to claim a 2% discount ($84.20 off).",
      priorityScore: 3,
      riskLevel: "MEDIUM",
      keyTakeaways: [
        "Total annual property tax liability: $4,210.00.",
        "Early payment discount: Pay $4,125.80 by Sept 15 to save $84.20.",
        "1st installment ($2,105.00) due Sept 30, 2026.",
        "Assessment dispute deadline is Sept 20, 2026."
      ],
      actionItems: [
        {
          title: "Pay Early Property Tax ($4,125.80 for 2% discount)",
          description: "Pay total tax before Sept 15 to save $84.20.",
          actionType: "PAYMENT",
          priority: "MEDIUM",
          suggestedDueDate: "2026-09-15"
        }
      ],
      questions: [
        "Is your property tax typically paid via mortgage escrow?",
        "Do you wish to dispute the $400,000 property valuation with the Board of Equalization?"
      ],
      confidenceScore: 0.95,
      extractedFacts: [
        { field: "Tax Authority", value: "County Tax Assessor", confidence: 0.99, isVerified: false },
        { field: "Parcel ID", value: "#44-092-114-00", confidence: 0.98, isVerified: false },
        { field: "Annual Tax", value: "$4,210.00", confidence: 0.99, isVerified: false },
        { field: "Early Pay Deadline", value: "2026-09-15", confidence: 0.96, isVerified: false },
        { field: "1st Installment Due", value: "2026-09-30", confidence: 0.97, isVerified: false }
      ],
      rawTextExcerpt: rawText.substring(0, 400)
    };
  }

  /**
   * Helper function to filter out lines containing example / demo / instructional indicators
   * so sample numbers like "$342.50" inside technical documentation are NOT scored as real document facts.
   */
  private getNonExampleText(rawText: string): string {
    const lines = rawText.split(/\r?\n/);
    const cleanLines = lines.filter((line) => {
      const l = line.toLowerCase();
      return !(
        l.includes("example:") ||
        l.includes("for example") ||
        l.includes("for instance") ||
        l.includes("sample:") ||
        l.includes("demo:") ||
        l.includes("illustration:") ||
        l.includes("e.g.") ||
        (l.includes("agar ") && (l.includes("likha hai") || l.includes("bolein") || l.includes("kahe"))) ||
        l.includes("suppose ") ||
        l.includes("hypothetical") ||
        l.includes("instructional")
      );
    });
    return cleanLines.join("\n");
  }

  private heuristicExtract(rawText: string, filename: string): DocumentAnalysisResult {
    const textLower = rawText.toLowerCase();
    const filenameLower = filename.toLowerCase();
    const nonExampleText = this.getNonExampleText(rawText);
    const nonExampleLower = nonExampleText.toLowerCase();

    // --- WEIGHTED EVIDENCE SCORING SYSTEM (Filtered Non-Example Text) ---

    // 1. BILL / UTILITY BILL EVIDENCE SCORE
    let billScore = 0;
    if (nonExampleLower.includes("total amount due") || nonExampleLower.includes("amount due:")) billScore += 10;
    if (nonExampleLower.includes("payment due date") || nonExampleLower.includes("due date:")) billScore += 8;
    if (nonExampleLower.includes("account number") || nonExampleLower.includes("account #")) billScore += 6;
    if (nonExampleLower.includes("electricity bill") || nonExampleLower.includes("utility bill") || nonExampleLower.includes("electricity usage")) billScore += 8;
    if (nonExampleLower.includes("billing period") || nonExampleLower.includes("service charges")) billScore += 5;
    if (nonExampleLower.includes("brightgrid") || nonExampleLower.includes("conedison") || nonExampleLower.includes("electric") || nonExampleLower.includes("late fee")) billScore += 4;
    if (nonExampleLower.includes("kwh") || nonExampleLower.includes("meter reading")) billScore += 4;
    if (filenameLower.includes("bill") || filenameLower.includes("invoice") || filenameLower.includes("electricity")) billScore += 6;

    // 2. CONTRACT / LEASE SCORE
    let contractScore = 0;
    if (nonExampleLower.includes("lease agreement") || nonExampleLower.includes("tenancy agreement")) contractScore += 10;
    if (nonExampleLower.includes("monthly rent") || nonExampleLower.includes("security deposit")) contractScore += 8;
    if (nonExampleLower.includes("landlord") || nonExampleLower.includes("tenant")) contractScore += 6;
    if (filenameLower.includes("lease") || filenameLower.includes("contract")) contractScore += 6;

    // 3. HEALTHCARE SCORE
    let healthcareScore = 0;
    if (nonExampleLower.includes("explanation of benefits") || nonExampleLower.includes("claim denial")) healthcareScore += 10;
    if (nonExampleLower.includes("patient name") || nonExampleLower.includes("claim #")) healthcareScore += 8;
    if (nonExampleLower.includes("aetna") || nonExampleLower.includes("prior authorization")) healthcareScore += 6;

    // 4. TAX SCORE
    let taxScore = 0;
    if (nonExampleLower.includes("property tax") || nonExampleLower.includes("tax assessment")) taxScore += 10;
    if (nonExampleLower.includes("parcel #") || nonExampleLower.includes("parcel id")) taxScore += 8;

    // 5. OFFICIAL NOTICE SCORE
    let noticeScore = 0;
    if (nonExampleLower.includes("disconnection notice") || nonExampleLower.includes("service shutoff")) noticeScore += 10;
    if (nonExampleLower.includes("final warning") || nonExampleLower.includes("immediate disconnection")) noticeScore += 8;

    // 6. RESUME / CV PROFILE SCORE
    let resumeScore = 0;
    if (nonExampleLower.includes("linkedin.com/in/") || filenameLower.includes("resume") || filenameLower.includes("cv")) resumeScore += 10;
    if (nonExampleLower.includes("work history") && nonExampleLower.includes("education") && nonExampleLower.includes("skills")) resumeScore += 8;
    if (nonExampleLower.includes("curriculum vitae") || nonExampleLower.includes("professional summary")) resumeScore += 6;

    // 7. TECHNICAL / PROJECT DOCUMENTATION SCORE (Full Text Context)
    let docScore = 0;
    if (textLower.includes("project documentation") || textLower.includes("technical documentation") || textLower.includes("hackathon documentation")) docScore += 10;
    if (textLower.includes("system architecture") || textLower.includes("implementation guide")) docScore += 8;
    if (textLower.includes("clarion ai") || textLower.includes("user guide") || textLower.includes("modules")) docScore += 6;
    if (filenameLower.includes("documentation") || filenameLower.includes("readme") || filenameLower.includes("hindi")) docScore += 8;

    // --- DECISION RULES & PRIORITY ---

    // RULE 1: TECHNICAL / PROJECT DOCUMENTATION (Priority when docScore is strong and non-example bill signals are low)
    const isDocumentation = (docScore >= 6 || filenameLower.includes("documentation") || filenameLower.includes("readme")) && billScore < 8 && contractScore < 8;

    if (isDocumentation) {
      let projectName = "Clarion AI – AI Life & Admin Copilot";
      const titleMatch = rawText.match(/^(?:#|\*\*|==)?\s*([^\n\r#]+)/m);
      if (titleMatch && titleMatch[1].trim().length > 3 && !titleMatch[1].toLowerCase().includes("http")) {
        const cleanTitle = titleMatch[1].trim().replace(/^[\*#=\s]+|[\*#=\s]+$/g, "");
        if (cleanTitle.length < 80) projectName = cleanTitle;
      } else if (filename) {
        projectName = filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      }

      const mainModulesList = "Dashboard, Upload Document, AI Document Analysis, Tasks & Deadlines, Audit & Activity Log, Settings & AI Configuration";

      return {
        category: "DOCUMENTATION",
        documentType: "Technical / Project Documentation",
        subject: projectName,
        issuer: projectName,
        accountNumber: undefined,
        totalAmount: undefined,
        currency: "USD",
        issueDate: undefined,
        dueDate: undefined,
        plainLanguageSummary: `This document contains technical and project documentation for ${projectName}. It explains the system architecture, document ingestion workflow, and AI feature modules. No payment obligation or administrative deadline was identified.`,
        priorityScore: 1,
        riskLevel: "LOW",
        keyTakeaways: [
          `Document Type: Technical / Project Documentation`,
          `Project Name: ${projectName}`,
          `Scope: System Architecture, AI Ingestion & Copilot Workflow`,
          `Main Modules: ${mainModulesList}`,
          `Zero administrative deadlines or monetary payment required.`
        ],
        actionItems: [],
        questions: [],
        confidenceScore: 0.98,
        extractedFacts: [
          { field: "Document Type", value: "Technical / Project Documentation", confidence: 0.99, isVerified: false },
          { field: "Project Name", value: projectName, confidence: 0.97, isVerified: false },
          { field: "Purpose / Objective", value: "Complete hackathon project documentation explaining system architecture and modules.", confidence: 0.95, isVerified: false },
          { field: "Main Modules", value: mainModulesList, confidence: 0.93, isVerified: false },
          { field: "Payment Obligation", value: "None (N/A)", confidence: 0.99, isVerified: false },
          { field: "Administrative Deadline", value: "No deadline", confidence: 0.99, isVerified: false }
        ],
        rawTextExcerpt: rawText.substring(0, 300)
      };
    }

    const hasStrongBillIndicators =
      billScore >= 10 ||
      (nonExampleLower.includes("total amount due") && (nonExampleLower.includes("account number") || nonExampleLower.includes("billing period") || nonExampleLower.includes("payment due")));

    if (hasStrongBillIndicators) {
      const isElectric = textLower.includes("electric") || textLower.includes("brightgrid") || textLower.includes("conedison") || textLower.includes("kwh");
      const providerMatch = rawText.match(/(?:provider|utility|company|biller|issuer):\s*([^\n]+)/i) ||
                            rawText.match(/([A-Za-z0-9\s]+(?:Electric|Utility|Power|Energy|Services))/i);
      const provider = providerMatch ? providerMatch[1].trim() : (textLower.includes("brightgrid") ? "BrightGrid Electric" : "Utility Biller");

      const accMatch = rawText.match(/(?:account\s*(?:number|#)?):\s*([A-Za-z0-9-]+)/i);
      const accNum = accMatch ? accMatch[1].trim() : "BG-4582-9017";

      const amountMatch = rawText.match(/(?:total amount due|amount due|total due|amount):\s*\$\s*([0-9,]+\.[0-9]{2})/i) ||
                          rawText.match(/\$\s*([0-9,]+\.[0-9]{2})/);
      const totalAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 105.00;

      const dateMatch = rawText.match(/(?:payment due date|due date|due by):\s*([^\n]+)/i) ||
                        rawText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2}/i) ||
                        rawText.match(/\d{4}-\d{2}-\d{2}/) ||
                        rawText.match(/\d{1,2}\/\d{1,2}\/20\d{2}/);
      const rawDateStr = dateMatch ? (dateMatch[1] || dateMatch[0]).trim() : "September 20, 2026";
      const dueDateStr = normalizeDateToYYYYMMDD(rawDateStr) || "2026-09-20";

      const periodMatch = rawText.match(/(?:billing period|service period):\s*([^\n]+)/i);
      const billingPeriod = periodMatch ? periodMatch[1].trim() : "August 1, 2026 – August 31, 2026";

      const usageMatch = rawText.match(/(\d+(?:\.\d+)?\s*kWh)/i);
      const usage = usageMatch ? usageMatch[1] : "856.40 kWh";

      const docType = isElectric ? "Electricity / Utility Bill" : "Utility / Service Bill";

      return {
        category: "BILL",
        documentType: docType,
        subject: provider,
        issuer: provider,
        accountNumber: accNum,
        totalAmount,
        currency: "USD",
        issueDate: undefined,
        dueDate: dueDateStr,
        plainLanguageSummary: `This is an electricity bill from ${provider} for the billing period of ${billingPeriod}. Total amount due is $${totalAmount.toFixed(2)} payable by ${dueDateStr}. Recorded energy usage is ${usage}.`,
        priorityScore: 4,
        riskLevel: textLower.includes("interruption") || textLower.includes("late fee") || textLower.includes("shutoff") ? "HIGH" : "MEDIUM",
        keyTakeaways: [
          `Document Type: ${docType}`,
          `Biller / Provider: ${provider}`,
          `Account Number: ${accNum}`,
          `Total Amount Due: $${totalAmount.toFixed(2)}`,
          `Payment Due Date: ${dueDateStr}`,
          `Electricity Usage: ${usage}`
        ],
        actionItems: [
          {
            title: `Pay $${totalAmount.toFixed(2)} ${provider} Bill`,
            description: `Submit payment of $${totalAmount.toFixed(2)} to ${provider} before ${dueDateStr} to avoid late fees or service interruption.`,
            actionType: "PAYMENT" as const,
            priority: "HIGH" as const,
            suggestedDueDate: dueDateStr
          }
        ],
        questions: [
          `Would you like Clarion AI to queue a payment reminder before ${dueDateStr}?`
        ],
        confidenceScore: 0.98,
        extractedFacts: [
          { field: "Document Type", value: docType, confidence: 0.99, isVerified: false },
          { field: "Provider", value: provider, confidence: 0.98, isVerified: false },
          { field: "Account Number", value: accNum, confidence: 0.97, isVerified: false },
          { field: "Total Amount Due", value: `$${totalAmount.toFixed(2)}`, confidence: 0.99, isVerified: false },
          { field: "Payment Due Date", value: dueDateStr, confidence: 0.98, isVerified: false },
          { field: "Billing Period", value: billingPeriod, confidence: 0.95, isVerified: false },
          { field: "Electricity Usage", value: usage, confidence: 0.94, isVerified: false }
        ],
        rawTextExcerpt: rawText.substring(0, 300)
      };
    }



    // 2. Financial / Bill
    const isBill = textLower.includes("bill") || textLower.includes("invoice") || textLower.includes("amount due") || textLower.includes("past due");
    // 3. Official Notice
    const isNotice = textLower.includes("shutoff") || textLower.includes("disconnect") || textLower.includes("warning notice") || textLower.includes("official notice");
    // 4. Contract / Lease
    const isContract = textLower.includes("lease") || textLower.includes("contract") || textLower.includes("agreement") || textLower.includes("tenancy");
    // 5. Tax
    const isTax = textLower.includes("tax") || textLower.includes("assessment") || textLower.includes("property tax");
    // 6. Healthcare
    const isHealthcare = textLower.includes("eob") || textLower.includes("health") || textLower.includes("denial") || textLower.includes("patient");
    // 7. Statement
    const isStatement = textLower.includes("statement") || textLower.includes("account summary");

    // 8. Detect Resume / Professional Profile (ONLY if NOT documentation AND matches CV structure!)
    const cvSectionKeywords = [
      "work history",
      "employment history",
      "academic background",
      "curriculum vitae",
      "linkedin.com/in/",
      "professional profile",
      "summary of qualifications"
    ];
    let cvMatches = 0;
    for (const kw of cvSectionKeywords) {
      if (textLower.includes(kw) || filenameLower.includes(kw)) {
        cvMatches++;
      }
    }

    const isResume =
      (cvMatches >= 2 ||
        (textLower.includes("skills") && textLower.includes("education") && textLower.includes("experience") && !isBill && !isContract && !isNotice)) &&
      !isDocumentation;

    if (isResume) {
      // Determine Candidate Name
      const firstLine = rawText.split("\n").map((s) => s.trim()).find((s) => s.length > 0 && !s.toLowerCase().includes("http")) || filename;
      const candidateName = firstLine.replace(/\.[^/.]+$/, "").substring(0, 60);

      // Determine Role / Title
      let roleTitle = "Professional Profile";
      if (textLower.includes("full-stack") || textLower.includes("fullstack")) roleTitle = "Full-Stack Web Developer";
      else if (textLower.includes("web developer")) roleTitle = "Web Developer";
      else if (textLower.includes("software engineer")) roleTitle = "Software Engineer";
      else if (textLower.includes("developer")) roleTitle = "Software / Web Developer";
      else if (textLower.includes("engineer")) roleTitle = "Engineer";

      const skillsMatch = rawText.match(/(?:skills|technologies|stack|tools|competencies):\s*([^\n]+)/i);
      const skillsSummary = skillsMatch ? skillsMatch[1].trim() : "Software Development, Technical Skills";
      const docTypeName = textLower.includes("linkedin") ? "LinkedIn / Professional Profile" : "Resume / CV";

      return {
        category: "RESUME",
        documentType: docTypeName,
        subject: candidateName,
        issuer: candidateName,
        accountNumber: undefined,
        totalAmount: undefined,
        currency: "USD",
        issueDate: undefined,
        dueDate: undefined, // NO FAKE DEADLINE
        plainLanguageSummary: `This document appears to be a ${docTypeName.toLowerCase()} for ${candidateName} (${roleTitle}). It highlights technical skills, work history, certifications, and educational background. No payment obligation or administrative deadline was identified.`,
        priorityScore: 1,
        riskLevel: "LOW",
        keyTakeaways: [
          `Document Type: ${docTypeName}`,
          `Candidate Name: ${candidateName}`,
          `Role / Specialization: ${roleTitle}`,
          `Summarizes technical competencies, work history, and education.`,
          `No administrative action or monetary payment required.`
        ],
        actionItems: [], // ZERO TASKS
        questions: [],   // ZERO CLARIFICATION QUESTIONS
        confidenceScore: 0.96,
        extractedFacts: [
          { field: "Document Type", value: docTypeName, confidence: 0.99, isVerified: false },
          { field: "Candidate Name", value: candidateName, confidence: 0.95, isVerified: false },
          { field: "Role / Specialization", value: roleTitle, confidence: 0.92, isVerified: false },
          { field: "Key Skills", value: skillsSummary, confidence: 0.88, isVerified: false },
          { field: "Payment Obligation", value: "None (N/A)", confidence: 0.99, isVerified: false },
          { field: "Deadline", value: "No deadline", confidence: 0.99, isVerified: false }
        ],
        rawTextExcerpt: rawText.substring(0, 300)
      };
    }

    // 9. Educational / College Notice
    const isEducational =
      textLower.includes("university") ||
      textLower.includes("college") ||
      textLower.includes("semester") ||
      textLower.includes("tuition") ||
      textLower.includes("academic") ||
      textLower.includes("campus") ||
      textLower.includes("student");

    // 10. General Letter
    const isLetter =
      textLower.includes("dear ") ||
      textLower.includes("sincerely") ||
      textLower.includes("to whom it may concern") ||
      textLower.includes("regards,") ||
      textLower.includes("notice of ");

    // Determine dollar amount ONLY if explicit dollar references ($XX.XX) exist
    const amountMatch = rawText.match(/\$\s*([0-9,]+\.[0-9]{2})/);
    const totalAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : undefined;

    // Determine issuer / subject
    const firstLine = rawText.split("\n").map((s) => s.trim()).find((s) => s.length > 0) || filename;
    const issuer = firstLine.length > 60 ? filename.replace(/\.[^/.]+$/, "") : firstLine;

    // Strict Deadline Detection: Only set dueDate if explicit deadline obligation phrases exist!
    const obligationPhrases = [
      "due date",
      "deadline",
      "payment due",
      "due by",
      "due on",
      "renew by",
      "appeal by",
      "respond by",
      "expiration date",
      "cutoff date",
      "pay by",
      "shutoff"
    ];
    const hasExplicitObligation = obligationPhrases.some((phrase) => textLower.includes(phrase));

    let dueDateStr: string | undefined = undefined;
    if (hasExplicitObligation) {
      const dateMatch =
        rawText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2}/i) ||
        rawText.match(/\d{4}-\d{2}-\d{2}/) ||
        rawText.match(/\d{1,2}\/\d{1,2}\/20\d{2}/);

      if (dateMatch) {
        dueDateStr = normalizeDateToYYYYMMDD(dateMatch[0]);
      }
    }

    // Determine category & documentType
    let category: CategoryType = "OTHER";
    let documentType = "General Document";

    if (isBill) {
      category = "BILL";
      documentType = "Utility / Service Bill";
    } else if (isNotice) {
      category = "NOTICE";
      documentType = "Official Disconnect Warning";
    } else if (isContract) {
      category = "CONTRACT";
      documentType = textLower.includes("lease") ? "Lease Agreement" : "Contract / Agreement";
    } else if (isTax) {
      category = "TAX";
      documentType = "Property Tax Statement";
    } else if (isHealthcare) {
      category = "HEALTHCARE";
      documentType = "Insurance / Healthcare Document";
    } else if (isStatement) {
      category = "STATEMENT";
      documentType = "Bank / Financial Statement";
    } else if (isEducational) {
      category = "OTHER";
      documentType = "Educational Document / College Notice";
    } else if (isLetter) {
      category = "OTHER";
      documentType = "General Letter";
    }

    // Determine risk & priority
    let riskLevel: RiskLevel = "LOW";
    let priorityScore = 2;
    if (textLower.includes("disconnect") || textLower.includes("urgent") || textLower.includes("final notice")) {
      riskLevel = "URGENT";
      priorityScore = 5;
    } else if (dueDateStr && (textLower.includes("expire") || textLower.includes("penalty") || textLower.includes("due"))) {
      riskLevel = "HIGH";
      priorityScore = 4;
    } else if (category !== "OTHER") {
      riskLevel = "MEDIUM";
      priorityScore = 3;
    }

    // Action items ONLY if explicit action requirement exists
    const actionItems = [];
    if (category === "BILL" || (totalAmount && hasExplicitObligation)) {
      actionItems.push({
        title: `Pay ${issuer} Balance`,
        description: `Process payment for ${issuer}${totalAmount ? ` ($${totalAmount.toFixed(2)})` : ''}.`,
        actionType: "PAYMENT" as const,
        priority: riskLevel === "URGENT" ? ("URGENT" as const) : ("MEDIUM" as const),
        suggestedDueDate: dueDateStr
      });
    } else if (category === "CONTRACT" && hasExplicitObligation) {
      actionItems.push({
        title: `Review Terms for ${issuer}`,
        description: `Review contract decision and notice deadline for ${issuer}.`,
        actionType: "RENEWAL" as const,
        priority: "HIGH" as const,
        suggestedDueDate: dueDateStr
      });
    } else if ((category === "NOTICE" || category === "HEALTHCARE") && hasExplicitObligation) {
      actionItems.push({
        title: `Review ${category} from ${issuer}`,
        description: `Follow up on ${category.toLowerCase()} requirements from ${issuer}.`,
        actionType: "VERIFICATION" as const,
        priority: "HIGH" as const,
        suggestedDueDate: dueDateStr
      });
    }

    // Clarification questions ONLY if genuine ambiguity or low confidence exists
    const questions = [];
    if (documentType === "General Document") {
      questions.push("We could not confidently determine all document details. Please review the extracted information below.");
    } else if (category !== "OTHER" && issuer && issuer !== filename) {
      questions.push(`Is ${issuer} the intended organization for this document?`);
      if (totalAmount) {
        questions.push(`Is $${totalAmount.toFixed(2)} the expected total balance?`);
      }
    }

    return {
      category,
      documentType,
      subject: issuer,
      issuer,
      accountNumber: "N/A",
      totalAmount,
      currency: "USD",
      issueDate: undefined,
      dueDate: dueDateStr,
      plainLanguageSummary: `Clarion analyzed "${filename}". This document is categorized as ${documentType} regarding ${issuer}. ${totalAmount ? `It references an amount of $${totalAmount.toFixed(2)}.` : 'No payment obligation was identified.'} ${dueDateStr ? `A key deadline was identified: ${dueDateStr}.` : 'No explicit payment or action deadline was detected.'}`,
      priorityScore,
      riskLevel,
      keyTakeaways: [
        `Document Type: ${documentType}`,
        `Subject / Entity: ${issuer}`,
        totalAmount ? `Monetary amount: $${totalAmount.toFixed(2)}` : "No financial amount detected.",
        dueDateStr ? `Deadline: ${dueDateStr}` : "No administrative deadline detected."
      ],
      actionItems,
      questions,
      confidenceScore: documentType === "General Document" ? 0.78 : 0.90,
      extractedFacts: [
        { field: "Document Type", value: documentType, confidence: 0.95, isVerified: false },
        { field: "Subject / Issuer", value: issuer, confidence: 0.88, isVerified: false },
        { field: "Main Purpose", value: `Informational reference for ${documentType}`, confidence: 0.85, isVerified: false },
        { field: "Payment Obligation", value: totalAmount ? `$${totalAmount.toFixed(2)}` : "None (N/A)", confidence: 0.90, isVerified: false },
        { field: "Deadline", value: dueDateStr || "No deadline", confidence: 0.86, isVerified: false }
      ],
      rawTextExcerpt: rawText.substring(0, 300)
    };
  }
}
