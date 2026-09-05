# 🚀 Clarion AI — Autonomous AI-Life-Admin-Copilot

> Privacy-first, proactive administrative assistant for bills, documents, tasks, and deadlines.

## 🚀 Live Demo

**https://clarion-ai-copilot.vercel.app**

## 💻 GitHub

**https://github.com/mansithakur204/clarion-ai-copilot**

## 🎯 What is Clarion AI?

Clarion AI turns messy personal documents such as bills, contracts, notices, and leases into structured information, proactive deadline intelligence, grounded answers, and safe human-confirmed actions.

### Why Clarion AI?

- 📄 Document extraction
- 🔎 User-scoped RAG with source citations
- 🤖 AI Copilot with conversation memory
- ⏰ Proactive deadline & obligation intelligence
- ⚡ Smart recommendations
- 🛡️ Human-in-the-loop action confirmation
- 🔐 Strict user data isolation
- 🔄 Gemini fallback for offline reliability

## ⭐ What Makes It Different?

Clarion is not just a chatbot.

It combines:

**Documents → RAG → Context Memory → Decision Engine → Human Confirmation → Action Execution**

The Copilot can understand a user's documents and workspace, identify obligations, recommend actions, and execute state-changing actions only after explicit user confirmation.

## 🧪 Try the Demo

1. Open the Live Demo.
2. Create an account.
3. Upload a bill or document.
4. Ask the Copilot questions such as:
   - "What is the total amount due on my electricity bill?"
   - "When is it due?"
   - "Who is the provider?"
   - "What needs my attention?"
5. Try **Take Action** and confirm/cancel the proposed action.

## 🏗️ Technical Architecture

### Document Intelligence
- PDF/text document ingestion
- Structured extraction of issuer, document type, amount, due date, and other fields
- Deterministic fallback extraction when Gemini is unavailable

### User-Scoped RAG
- Document chunking
- 768-dimensional embeddings
- Semantic similarity search
- Strict `userId` isolation
- Source citations in Copilot responses

### Agentic Workflow

```text
User Query
    ↓
Intent Detection
    ↓
Workspace Context Retrieval
    ↓
RAG / Document Search
    ↓
Decision & Recommendation Layer
    ↓
Human Confirmation
    ↓
Action Execution
    ↓
Audit Trail
