# Clarion AI — Autonomous AI Life Admin Copilot

> Privacy-first AI copilot that turns documents, deadlines, tasks, and obligations into actionable workflows.

## 🚀 Live Demo

**[Open Clarion AI](https://clarion-ai-copilot.vercel.app)**

## 💻 GitHub

**[View Source Code](https://github.com/mansithakur204/clarion-ai-copilot)**

## ✨ What Clarion Does

Clarion helps users manage documents, deadlines, tasks, and administrative obligations through AI-powered retrieval, proactive intelligence, and human-confirmed actions.

### Key Features

- 📄 Document extraction and structured information
- 🧠 User-scoped RAG with PostgreSQL + pgvector
- 🔎 Semantic document search
- 📚 Source citations for AI answers
- 🔔 Proactive deadline and obligation intelligence
- 🤖 Smart recommendations
- ✅ Human-in-the-loop action confirmation
- 🧠 Conversation context and follow-up understanding
- 🛡️ User data isolation
- 🔄 Gemini fallback/local processing

## 🧠 RAG Architecture

```text
Document Upload
      ↓
Text Extraction
      ↓
Chunking
      ↓
Gemini Embeddings
      ↓
PostgreSQL + pgvector
      ↓
Semantic Retrieval
      ↓
Relevant Context
      ↓
Gemini / Local Agent
      ↓
Grounded Answer + Source Citation
