# Implementation Plan - Clarion AI (AI Life & Admin Copilot)

"Clarion AI" is a privacy-first personal admin copilot that ingests real-world documents, bills, notices, contracts, and statements, extracting critical information, detecting deadlines, generating actionable tasks, and providing a human-verified action plan.

## User Review Required

> [!IMPORTANT]
> **Tech Stack Selection**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Lucide Icons + Prisma (SQLite for zero-config offline/hackathon execution) + Zustand/React state management.
> **AI Architecture**: Unified AI Provider abstraction layer with built-in Mock AI Provider (using intelligent document heuristics & fallback parser for instant offline testing without mandatory API keys), plus Google Gemini AI Provider integration.

## Proposed Architecture & Structure

```
AI-Life-Admin-Copilot/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── prisma/
│   └── schema.prisma          # Database schema (Users, Documents, ExtractionData, Deadlines, Tasks, AuditLogs)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with Tailwind, Font, Theme Provider
│   │   ├── page.tsx           # Premium Landing / Product Overview page
│   │   ├── login/page.tsx     # Authentication / Sign-in experience
│   │   ├── dashboard/
│   │   │   ├── page.tsx       # Main Admin Dashboard ("What needs attention?", Upcoming deadlines, Action queue)
│   │   │   ├── upload/page.tsx# Document Upload screen (drag-drop, sample document templates)
│   │   │   ├── documents/
│   │   │   │   └── [id]/page.tsx # Document Analysis detail view (Plain language summary, risk flags, human verification UI)
│   │   │   ├── tasks/page.tsx # Deadline & Task Management center
│   │   │   ├── audit/page.tsx # Activity & Audit Log trail
│   │   │   └── settings/page.tsx # AI Provider config & Privacy settings
│   │   └── api/
│   │       ├── analyze/route.ts   # Server route for processing documents via AI Provider abstraction
│   │       ├── documents/route.ts # CRUD for documents
│   │       ├── tasks/route.ts     # CRUD for tasks & reminders
│   │       └── audit/route.ts     # Activity logging API
│   ├── components/
│   │   ├── ui/                # High-polished design system (Buttons, Cards, Badges, Modals, Tabs, Risk Indicators)
│   │   ├── dashboard/         # Navigation sidebar, Stats cards, Attention widgets
│   │   ├── document/          # Extracted field reviewer, Plain-language view, Human verification toggle, Audit drawer
│   │   └── tasks/             # Task card, Priority badges, Deadline countdowns
│   ├── lib/
│   │   ├── db.ts              # Prisma Client / Storage singleton
│   │   ├── ai/
│   │   │   ├── provider.ts    # AI Provider interface & registry
│   │   │   ├── gemini.ts      # Gemini API implementation
│   │   │   ├── mock.ts        # Mock AI Provider with realistic heuristics & sample documents fallback
│   │   │   └── parser.ts      # Text extractor helper (PDF/Image text parser)
│   │   └── utils.ts           # Date formatters, Risk score calculators, Audit log logger
```

---

## Proposed Changes

### 1. Foundation & Dependencies
- Scaffold Next.js 14 App Router project with TypeScript, Tailwind CSS, `clsx`, `tailwind-merge`, `lucide-react`, `@prisma/client`, `prisma`, `@google/genai` (or standard fetch).

### 2. Data Model (`prisma/schema.prisma`)
- `User`: Basic user profile & preferences.
- `Document`: File metadata, original filename, storage path, status (`UPLOADED`, `ANALYZING`, `VERIFICATION_REQUIRED`, `VERIFIED`, `ARCHIVED`).
- `Extraction`: Plain language summary, extracted amounts, risk level (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), vendor/issuer, confidence scores, clarification questions.
- `Deadline`: Associated target date, description, status, urgency tag.
- `Task`: Title, description, action type (`PAYMENT`, `CANCEL_SUBSCRIPTION`, `DISPUTE`, `RENEWAL`, `SUBMIT_FORM`), human status (`PENDING`, `COMPLETED`, `DISMISSED`), assigned deadline ID.
- `AuditLog`: Action name (`DOCUMENT_UPLOADED`, `AI_ANALYSIS_COMPLETED`, `FIELD_VERIFIED_BY_HUMAN`, `TASK_CREATED`), actor, metadata, timestamp.

### 3. AI Provider Abstraction (`src/lib/ai/`)
- Unified interface `IAIProvider` with `analyzeDocument(content: string, mimeType: string): Promise<DocumentAnalysisResult>`.
- `GeminiProvider`: Real AI inference using `GEMINI_API_KEY`.
- `MockProvider`: Fallback provider with deterministic document parsing based on text keyword patterns, supporting real uploaded text as well as pre-packaged sample documents (e.g. Electric Utility Bill, Lease Termination Notice, Insurance Claim Denial, Medical Bill).

### 4. Core Features & UI Implementation
- **Landing Page (`/`)**: Value proposition, interactive demo showcase, privacy principles.
- **Dashboard (`/dashboard`)**:
  - Urgent Action Alert Banner (Items requiring human verification).
  - Key Metrics: Pending deadlines, total financial commitment, unread notices, items needing verification.
  - Upcoming Deadlines Timeline with color-coded risk markers.
  - Recent Documents grid with quick status indicators.
- **Document Upload (`/dashboard/upload`)**:
  - Drag-and-drop file uploader (supports PDF/Images/Text).
  - Quick-load Sample Document selector for effortless presentation/hackathon demoing.
- **Document Analysis Detail (`/dashboard/documents/[id]`)**:
  - Split view: Original document / extracted text vs. AI Insights panel.
  - Plain-language explanation ("What this document means in plain English").
  - Extracted Key Facts (Amount due, Issuer, Account #, Due Date).
  - Human Verification Mode: Inline editing & checkbox confirmation for each AI extraction ("Verify Information").
  - AI Confidence Scores & Ambiguity Warnings ("AI is unsure about item #2 - please confirm").
  - Action Plan Generator: Convert extracted items into actionable tasks with 1-click.
- **Task & Deadline Center (`/dashboard/tasks`)**:
  - Sorted by urgency (Overdue, Due Today, Next 7 Days, Upcoming).
  - Task status filters & batch operations.
- **Audit History (`/dashboard/audit`)**:
  - Full transparent log of AI generations vs. Human edits/approvals for strict compliance & safety.
- **Settings (`/dashboard/settings`)**:
  - AI Model Selection, API Key override, Privacy mode settings (Local-only vs Cloud AI).

---

## Verification Plan

### Automated Verification
- Run `npm run build` to ensure zero TypeScript or build errors.
- Run `npm run lint` to enforce clean code conventions.

### Manual Verification
- Test entire user journey:
  1. Access landing page -> Navigate to dashboard.
  2. Load sample lease notice / upload bill -> Trigger AI Analysis.
  3. Verify extracted dates, financial amounts, and risk scores.
  4. Perform Human Verification edit on extracted fields -> Confirm audit log records human override.
  5. Convert deadline into a task -> Verify task appears in Task Center.
  6. Test AI Provider fallback (verify Mock Provider works seamlessly when no `GEMINI_API_KEY` is present).
