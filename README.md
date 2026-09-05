# Clarion AI — Autonomous AI-Life-Admin-Copilot

> **Privacy-first, proactive administrative operations assistant for life, bills, documents, tasks, and deadlines.**

Clarion AI Copilot is an end-to-end intelligent administrative operations engine built on Next.js 14, Prisma, PostgreSQL (pgvector), and Google Gemini AI. It transforms messy personal documents (bills, contracts, tax notices, lease renewals) into structured facts, proactive obligation intelligence, semantic RAG citations, and safe, human-confirmed automated actions.

---

## Key Features

### 1. Document Extraction & OCR Intelligence
- Drag-and-drop or template-driven document ingestion.
- Structured entity extraction: **Issuer**, **Document Type**, **Total Amount Due**, **Payment Due Date**, **Account Number**, and **Risk Scores**.
- Fallback heuristic regex parser when Gemini API is offline or unconfigured.

### 2. User-Scoped Semantic RAG (pgvector)
- Text chunking (500 chars with 100 char overlap) and 768-dimensional vector embeddings via gemini-embedding-001.
- Vector similarity search strictly scoped by userId.
- Document Source Citations UI displaying exact document titles, category badges, similarity %, chunk index, and text snippets.

### 3. AI Daily Briefing & Proactive Deadline Intelligence
- Proactive urgency calculation (CRITICAL, HIGH, MEDIUM, UPCOMING) relative to system clock.
- Merges high-risk documents, pending tasks, and upcoming deadlines into structured daily insights.
- Zero fake urgency or hallucinated obligations on clean workspaces.

### 4. Smart Decision & Recommendation Layer
- Evaluates workspace state to synthesize FACT items and RECOMMENDATION items.
- Scoped to action/attention prompts so read-only document queries remain concise and clean.

### 5. Safe Action Execution with Human-in-the-Loop Confirmation
- State-changing operations (Create Task, Complete Task, Set Reminder) require explicit human confirmation.
- Built-in idempotency engine prevents duplicate task creation or repeated action execution.

### 6. End-to-End Conversation Context & Entity Resolution Memory
- contextBuilder.ts aggregates recent conversation turns, documents, tasks, and deadlines into a unified prompt context.
- Entity resolver handles pronouns (it, this, that, the bill, the lease, the task, the deadline) against active workspace context.

### 7. Resilient Offline Fallback Architecture
- When Gemini API keys are unconfigured, rate-limited (HTTP 429), or erroring, Clarion seamlessly falls back to MockAgentEngine.
- Zero raw API errors or raw JSON errors exposed to the user interface.

---

## Technology Stack

- **Framework**: Next.js 14 (App Router, React 18, Server Actions, API Routes)
- **Database**: PostgreSQL with pgvector extension via Prisma ORM
- **AI Models**: Google Gemini 2.5 Flash & Gemini Embedding via @google/genai
- **Styling**: Tailwind CSS & Lucide Icons
- **Language**: TypeScript

---

## Security & User Isolation

- **Password Hashing**: PBKDF2 with 16-byte random salt and 1000 iterations via Node crypto.
- **Session Tokens**: HMAC-SHA256 signed JWT cookies (clarion_session) with HttpOnly, SameSite=Lax.
- **Strict Data Isolation**: Every Prisma database query mandates where: { userId }.

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (or Neon Serverless Postgres with pgvector enabled)

### Installation

1. **Clone the repository**:
   `ash
   git clone https://github.com/mansithakur204/clarion-ai-copilot.git
   cd clarion-ai-copilot
   ``n
2. **Install dependencies**:
   `ash
   npm install
   ``n
3. **Configure Environment Variables**:
   Create a .env or .env.local file in the root directory:
   `nv
   DATABASE_URL=\ postgresql://user:password@host/neondb?sslmode=require\
   DATABASE_URL_POOLED=\postgresql://user:password@host-pooler/neondb?sslmode=require\
   GEMINI_API_KEY=\your_optional_gemini_api_key\
   ``n   *(Note: GEMINI_API_KEY is optional. If left unconfigured, the application runs 100% deterministically via local fallback)*.

4. **Initialize Database Schema**:
   `ash
   npx prisma db push
   npx prisma generate
   ``n
5. **Run Development Server**:
   `ash
   npm run dev
   ``n   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Verification

Run the full integration test suite:

`ash
# Step 8 Smart Action & Decision Test
npx tsx tests/smartActionLayer.test.ts

# Step 9 Action Execution & Confirmation Test
npx tsx tests/actionExecutionLayer.test.ts

# Step 10 Proactive Deadline Intelligence Test
npx tsx tests/deadlineIntelligence.test.ts

# Step 11 Context Memory & Entity Resolution Test
npx tsx tests/copilotContextMemory.test.ts

# Lint Check
npm run lint

# Production Build Check
npm run build
``n
---

## License

MIT License. Developed for Clarion AI Copilot.

