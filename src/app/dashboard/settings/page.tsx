"use client";

import React, { useState, useEffect } from "react";
import { Settings, Cpu, ShieldCheck, Key, CheckCircle2, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<"auto" | "mock" | "gemini">("auto");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings?.selectedProvider) {
          let p = data.settings.selectedProvider.toLowerCase();
          if (p === "local_mock") p = "mock";
          setSelectedProvider(p as "auto" | "mock" | "gemini");
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedProvider })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || "Configuration saved successfully.");
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-clarion-400" />
          <span>AI Engine & Privacy Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage AI providers, API keys, and document processing privacy boundaries.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Active AI Provider Card */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Cpu className="w-4 h-4 text-clarion-400" />
            <span>AI Provider Abstraction Layer</span>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-xs text-slate-400 animate-pulse flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-clarion-400" />
              <span>Loading saved settings...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">Select Processing Provider</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProvider("auto")}
                  className={`p-4 rounded-xl border text-left transition-all space-y-1 cursor-pointer ${
                    selectedProvider === "auto"
                      ? "bg-clarion-600/20 border-clarion-500 text-white ring-1 ring-clarion-500/50"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Auto (Recommended)</span>
                    {selectedProvider === "auto" && <span className="text-[10px] bg-clarion-500/30 text-clarion-300 px-1.5 py-0.5 rounded">Active</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Uses Gemini API if key is present; falls back to Mock engine offline.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider("gemini")}
                  className={`p-4 rounded-xl border text-left transition-all space-y-1 cursor-pointer ${
                    selectedProvider === "gemini"
                      ? "bg-clarion-600/20 border-clarion-500 text-white ring-1 ring-clarion-500/50"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Google Gemini AI</span>
                    {selectedProvider === "gemini" && <span className="text-[10px] bg-clarion-500/30 text-clarion-300 px-1.5 py-0.5 rounded">Active</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Requires valid GEMINI_API_KEY environment variable or custom input.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider("mock")}
                  className={`p-4 rounded-xl border text-left transition-all space-y-1 cursor-pointer ${
                    selectedProvider === "mock"
                      ? "bg-clarion-600/20 border-clarion-500 text-white ring-1 ring-clarion-500/50"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>Local Mock Engine</span>
                    {selectedProvider === "mock" && <span className="text-[10px] bg-clarion-500/30 text-clarion-300 px-1.5 py-0.5 rounded">Active</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    100% offline heuristic parser with sample document templates.
                  </p>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Google Gemini API Key (Optional Override)</span>
            </label>
            <input
              type="password"
              placeholder="AIzaSy... (Leave empty to use process.env.GEMINI_API_KEY)"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-clarion-500"
            />
            <p className="text-[11px] text-slate-500">
              Keys are held only in memory and never logged to server logs.
            </p>
          </div>
        </div>

        {/* Privacy & Security Controls */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Privacy & Data Security Rules</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-850">
              <div>
                <div className="font-semibold text-slate-200">Zero AI Hallucination Policy</div>
                <p className="text-slate-400 text-[11px]">Surfaces uncertainties and clarification questions when documents are unclear.</p>
              </div>
              <span className="text-emerald-400 font-bold">ACTIVE</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-850">
              <div>
                <div className="font-semibold text-slate-200">Human Verification Boundary</div>
                <p className="text-slate-400 text-[11px]">No external action is ever initiated without 1-click human confirmation.</p>
              </div>
              <span className="text-emerald-400 font-bold">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {successMessage ? (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-clarion-600 hover:bg-clarion-500 text-white font-semibold text-xs transition-colors shadow-md shadow-clarion-600/30 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? "Saving Configuration..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}
