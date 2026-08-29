export interface SampleDoc {
  id: string;
  title: string;
  category: "BILL" | "NOTICE" | "CONTRACT" | "STATEMENT" | "TAX" | "HEALTHCARE";
  description: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  filename: string;
  rawText: string;
}

export const SAMPLE_DOCUMENTS: SampleDoc[] = [
  {
    id: "sample-electric-shutoff",
    title: "ConEdison Final Disconnect Notice & Overdue Balance",
    category: "BILL",
    description: "Urgent electricity disconnection warning due to overdue payment of $342.50.",
    riskLevel: "URGENT",
    filename: "ConEdison_DisconnectNotice_Aug2026.pdf",
    rawText: `CONEDISON UTILITY SERVICES
ACCOUNT NUMBER: #9482-1049-22
DATE OF NOTICE: August 15, 2026

FINAL DISCONNECT & OVERDUE PAYMENT NOTICE

Dear Account Holder,

Our records indicate that your electric utility account has an past-due balance of $342.50 for service provided between June 10, 2026 and July 25, 2026.

IMPORTANT ACTION REQUIRED:
To prevent service disconnection on September 05, 2026, you must submit full payment or setup an authorized deferred payment agreement no later than 5:00 PM EST on September 02, 2026.

DISCONNECTION SUMMARY:
- Total Overdue Amount: $342.50
- Reconnection Fee (if disconnected): $45.00
- Hard Deadline: September 02, 2026 (5:00 PM EST)
- Payment Portal: www.conedison.com/pay-online or call 1-800-555-0199.

If you are experiencing financial hardship, you may qualify for the Home Energy Assistance Program (HEAP). Call 1-800-555-HEAP before August 30, 2026 to verify eligibility.`
  },
  {
    id: "sample-lease-renewal",
    title: "Avalon Bay Residential Lease Auto-Renewal & 7% Rent Escalation",
    category: "CONTRACT",
    description: "Lease renewal notice requiring 60 days advance notice to vacate, or rent increases by 7%.",
    riskLevel: "HIGH",
    filename: "AvalonBay_LeaseRenewal_Apt4B.pdf",
    rawText: `AVALON BAY RESIDENTIAL LEASING MANAGEMENT
100 GRAND AVENUE, SUITE 400
NOTICE OF LEASE EXPIRATION AND RENEWAL OPTIONS

Tenant: Alex Mercer
Unit: Apartment 4B, 540 W 42nd St
Current Lease Expiration Date: October 31, 2026
Notice Date: August 18, 2026

Dear Alex Mercer,

Your current residential lease agreement will expire on October 31, 2026. Per Section 14 of your original lease agreement, you must notify management in writing of your intent to renew or vacate at least 60 DAYS PRIOR to lease expiration.

DECISION DEADLINE: September 01, 2026

RENEWAL OPTIONS:
Option A: 12-Month Renewal - $3,450.00 / month (a 7% increase from your current $3,224.00 rate).
Option B: Month-to-Month Renewal - $4,100.00 / month.
Option C: Intent to Vacate - Must submit signed Notice to Vacate Form by September 01, 2026.

FAILURE TO RESPOND:
If no written response is received by September 01, 2026, your lease will automatically convert to Option B (Month-to-Month at $4,100.00/mo) starting November 01, 2026.

Please contact Property Manager Sarah Jenkins at s.jenkins@avalonbay.com with questions.`
  },
  {
    id: "sample-insurance-denial",
    title: "Aetna Healthcare Claim Denial & Right to Appeal",
    category: "HEALTHCARE",
    description: "Insurance claim denial of $1,850.00 for MRI procedure; 180-day appeal window.",
    riskLevel: "MEDIUM",
    filename: "Aetna_ExplanationOfBenefits_EOB_9921.pdf",
    rawText: `AETNA HEALTHCARE SYSTEM
EXPLANATION OF BENEFITS (EOB) - THIS IS NOT A BILL

Claim Number: CLM-88392019
Patient Name: Alex Mercer
Date of Service: July 12, 2026
Provider: Mount Sinai Radiology Group
Procedure: Outpatient MRI Lumbar Spine (CPT Code 72148)

CLAIM STATUS: DENIED (Code 104 - Lack of Pre-Authorization)

FINANCIAL BREAKDOWN:
- Total Provider Billed Amount: $2,400.00
- Plan Allowable Rate: $1,850.00
- Plan Payment Amount: $0.00
- Patient Responsibility (Pending Appeal): $1,850.00

REASON FOR DENIAL:
The procedure was denied because pre-authorization was not submitted by the ordering physician prior to service execution.

MEMBER APPEAL RIGHTS:
You have the right to file a First-Level Formal Appeal within 180 calendar days of receiving this notice (Deadline: January 15, 2027). If your ordering physician submits clinical notes establishing medical necessity, this denial is frequently reversed.

To initiate an appeal:
1. Complete Member Appeal Form (Form AP-1).
2. Attach clinical records from Dr. Robert Vance.
3. Fax to 1-800-555-APPL or upload at www.aetna.com/appeals.`
  },
  {
    id: "sample-property-tax",
    title: "County Department of Revenue - Property Tax Assessment",
    category: "TAX",
    description: "Annual property tax bill of $4,210.00 due in two installments.",
    riskLevel: "MEDIUM",
    filename: "CountyTaxAssessor_PropertyTax_2026.pdf",
    rawText: `OFFICE OF THE COUNTY TAX ASSESSOR
ANNUAL REAL ESTATE PROPERTY TAX STATEMENT - TAX YEAR 2026

Parcel ID: #44-092-114-00
Property Address: 742 Evergreen Terrace
Assessed Land Value: $120,000.00
Assessed Improvement Value: $280,000.00
Total Taxable Value: $400,000.00

TOTAL ANNUAL TAX LIABILITY: $4,210.00

PAYMENT SCHEDULE & DEADLINES:
- First Installment ($2,105.00): Due September 30, 2026 (Delinquent penalty of 5% applies after Oct 10, 2026).
- Second Installment ($2,105.00): Due March 31, 2027 (Delinquent penalty of 5% applies after Apr 10, 2027).

EARLY PAYMENT DISCOUNT:
Pay the full annual balance ($4,210.00) by September 15, 2026 to receive a 2% discount ($84.20 off, net payment: $4,125.80).

DISPUTE / APPEAL DEADLINE:
If you believe your property assessment is inaccurate, you must file Form PT-100 with the Board of Equalization before September 20, 2026.`
  }
];
