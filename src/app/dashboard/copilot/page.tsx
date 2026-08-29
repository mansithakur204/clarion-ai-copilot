"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Wrench,
  User,
  Zap,
  ArrowRight
} from "lucide-react";
import { AgentMessage, AgentTraceStep } from "@/lib/agent/types";

/**
 * Formats Markdown syntax (**bold**, *italic*, bullets, newlines) into styled React elements.
 */
function FormattedMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} className="h-1" />;
        }

        // Render bullet line (starts with • or - or *)
        const isBullet = /^\s*[•\-\*]\s+/.test(line);
        const cleanLine = isBullet ? line.replace(/^\s*[•\-\*]\s+/, "") : line;

        // Parse inline **bold** and *italic*
        const parts = cleanLine.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

        const renderedLine = parts.map((part, partIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={partIdx} className="font-bold text-clarion-300">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith("*") && part.endsWith("*")) {
            return (
              <em key={partIdx} className="italic text-slate-300">
                {part.slice(1, -1)}
              </em>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="text-clarion-400 font-bold shrink-0 mt-0.5">•</span>
              <div>{renderedLine}</div>
            </div>
          );
        }

        return <div key={lineIdx}>{renderedLine}</div>;
      })}
    </div>
  );
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "What needs my attention?",
    "What tasks are pending?",
    "What deadlines are coming up?",
    "Summarize my recent documents.",
    "Which document is most urgent?"
  ];

  // Initial welcome message
  // Restore chat history for authenticated user
  useEffect(() => {
    fetch("/api/copilot/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.messages && data.messages.length > 0) {
          const restored: AgentMessage[] = data.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender === "user" ? "USER" : "AI",
            text: m.text,
            timestamp: m.timestamp,
            intent: m.intent,
            toolsUsed: m.toolsUsed,
            pendingAction: m.pendingAction
          }));
          setMessages(restored);
        } else {
          setMessages([
            {
              id: "msg-welcome",
              sender: "AI",
              text: "Hello! I am your **Clarion AI Copilot**. I can inspect your live documents, tasks, and deadlines to answer any questions or prioritize your workload.\n\nHow can I assist you today?",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              traceSteps: [
                {
                  id: "welcome-trace-1",
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  step: "Initialized Clarion Agentic Copilot session",
                  detail: "Ready to query live application workspace data",
                  status: "COMPLETED"
                }
              ]
            }
          ]);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading) return;

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      sender: "USER",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [
      ...prev.map((m) => ({ ...m, pendingAction: undefined })),
      userMsg
    ]);
    if (!textToSend) setInputQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: "dashboard-session"
        })
      });

      const data = await res.json();
      if (data.success && data.response) {
        const aiMsg: AgentMessage = {
          id: `ai-${Date.now()}`,
          sender: "AI",
          text: data.response.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          traceSteps: data.response.traceSteps,
          activeEntity: data.response.activeEntity,
          pendingAction: data.response.pendingAction
        };
        setMessages((prev) => [...prev, aiMsg]);
        // Automatically expand the trace of the newest response
        if (data.response.traceSteps && data.response.traceSteps.length > 0) {
          setExpandedTraceId(aiMsg.id);
        }
      } else {
        throw new Error(data.error || "Failed to receive copilot response.");
      }
    } catch (err: any) {
      const errorMsg: AgentMessage = {
        id: `err-${Date.now()}`,
        sender: "AI",
        text: `Sorry, I encountered an error while processing your request: ${err.message || "Unknown error"}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearConversation = async () => {
    try {
      await fetch("/api/copilot/history", { method: "DELETE" });
    } catch (e) {}

    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        sender: "AI",
        text: "Conversation history cleared. How can I assist you with your workspace documents or tasks?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
    setExpandedTraceId(null);
  };

  const toggleTrace = (id: string) => {
    setExpandedTraceId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-6rem)] flex flex-col space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-clarion-400" />
            <span>Clarion AI Copilot</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Your intelligent assistant for documents, tasks, and deadlines.
          </p>
        </div>

        <button
          onClick={handleClearConversation}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          Suggestions:
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            className="px-3 py-1 rounded-full bg-slate-900 hover:bg-clarion-950 border border-slate-800 hover:border-clarion-500/40 text-slate-300 hover:text-clarion-300 text-xs font-medium transition-all shrink-0 shadow-sm flex items-center gap-1"
          >
            <span>{q}</span>
            <ArrowRight className="w-3 h-3 text-slate-500" />
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-950/70 border border-slate-850 space-y-6 shadow-inner">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "USER" ? "items-end" : "items-start"} space-y-2`}
          >
            <div className="flex items-center gap-2 px-1">
              {msg.sender === "AI" ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-clarion-600/30 border border-clarion-500/40 flex items-center justify-center text-clarion-400">
                    <Bot className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-bold text-clarion-300">Clarion Copilot</span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-bold text-slate-400">You</span>
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                    <User className="w-3 h-3" />
                  </div>
                </>
              )}
              <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                msg.sender === "USER"
                  ? "bg-gradient-to-r from-clarion-600 to-clarion-700 text-white shadow-md rounded-tr-none"
                  : "bg-slate-900 border border-slate-800 text-slate-200 shadow-md rounded-tl-none"
              }`}
            >
              <FormattedMarkdown content={msg.text} />
            </div>

            {/* Interactive Human-in-the-Loop Confirmation Buttons */}
            {msg.sender === "AI" && msg.pendingAction && (
              <div className="max-w-[85%] p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-center gap-3 shadow-md">
                <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Human Confirmation Required:
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSendMessage("Confirm");
                  }}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Action</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSendMessage("Cancel");
                  }}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-all border border-slate-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            )}

            {/* Agent Tool Activity Trace Accordion (For AI responses) */}
            {msg.sender === "AI" && msg.traceSteps && msg.traceSteps.length > 0 && (
              <div className="max-w-[85%] w-full">
                <button
                  onClick={() => toggleTrace(msg.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-semibold flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-3 h-3 text-clarion-400" />
                    <span>Agent Activity & Tool Trace ({msg.traceSteps.length} steps)</span>
                  </div>
                  {expandedTraceId === msg.id ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {expandedTraceId === msg.id && (
                  <div className="mt-1.5 p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-2 text-[11px]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Execution Trace
                    </span>
                    {msg.traceSteps.map((step) => (
                      <div key={step.id} className="flex items-start gap-2 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-200">{step.step}</span>
                          {step.detail && (
                            <p className="text-slate-400 text-[10px]">{step.detail}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Thinking / Loading state indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 max-w-[50%] animate-pulse">
            <div className="w-6 h-6 rounded-full bg-clarion-600/30 border border-clarion-500/40 flex items-center justify-center text-clarion-400 shrink-0">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-clarion-300">Clarion is thinking...</span>
              <p className="text-[10px] text-slate-400">Selecting application tools & analyzing workspace data</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Text Input & Send Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-2 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2 shadow-xl"
      >
        <input
          type="text"
          placeholder="Ask Clarion Copilot anything about your documents, tasks, or deadlines..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-transparent px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading}
          className="px-4 py-2.5 rounded-xl bg-clarion-600 hover:bg-clarion-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-clarion-600/20 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
