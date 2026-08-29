"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  FileSearch,
  Calendar,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  Layers,
  Cpu
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-clarion-500 selection:text-white">
      {/* Top Navbar */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-clarion-700 via-clarion-500 to-sky-400 flex items-center justify-center shadow-lg shadow-clarion-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                Clarion <span className="text-clarion-400">AI</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase text-slate-400 block -mt-1 font-medium">
                AI Life & Admin Copilot
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-clarion-600 to-sky-500 hover:from-clarion-500 hover:to-sky-400 text-white font-semibold text-xs sm:text-sm shadow-md shadow-clarion-500/25 transition-all flex items-center gap-1.5"
            >
              <span>Launch Application</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-clarion-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-clarion-500/10 border border-clarion-500/20 text-clarion-300 text-xs font-semibold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-clarion-400" />
            <span>Privacy-First • Human-in-the-Loop Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Stop drowning in messy <br />
            <span className="bg-gradient-to-r from-clarion-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">
              bills, notices & contracts
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Clarion AI is your personal admin copilot. Upload any complex real-world document to instantly extract key dates, financial amounts, priority risks, and plain-language action plans—with 100% human verification control.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-clarion-600 via-clarion-500 to-sky-500 hover:from-clarion-500 hover:to-sky-400 text-white font-bold text-base shadow-xl shadow-clarion-500/30 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Try Clarion Dashboard</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/dashboard/upload"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-semibold text-base transition-all flex items-center justify-center gap-2"
            >
              <FileSearch className="w-5 h-5 text-clarion-400" />
              <span>Test Sample Documents</span>
            </Link>
          </div>

          {/* Key Value Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur space-y-3">
              <div className="w-10 h-10 rounded-xl bg-clarion-500/10 border border-clarion-500/20 flex items-center justify-center text-clarion-400">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Plain-Language Parsing</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Translates legalese and complex billing terms into 2-minute clear English summaries anyone can understand.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Risk & Deadline Detection</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Automatically identifies payment deadlines, shutoff notices, rent escalation dates, and insurance appeal windows.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Human Verification Control</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Never pretends AI took action. Every extracted field requires 1-click human verification and audit logging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="py-16 border-t border-slate-900 bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white">Built on Uncompromising Principles</h2>
            <p className="text-slate-400 text-sm">
              Designed for real-world reliability, security, and human oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="text-clarion-400 font-bold text-base flex items-center gap-2">
                <Lock className="w-4 h-4" /> Privacy-First
              </div>
              <p className="text-xs text-slate-400">
                Documents process behind server boundaries with zero data selling or unauthorized model training.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="text-emerald-400 font-bold text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Human Control
              </div>
              <p className="text-xs text-slate-400">
                Important tasks require explicit human review. Clarification questions surface when data is unclear.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="text-amber-400 font-bold text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Audit Logged
              </div>
              <p className="text-xs text-slate-400">
                Complete timeline of AI suggestions vs. human overrides for full accountability.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="text-sky-400 font-bold text-base flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Provider Agnostic
              </div>
              <p className="text-xs text-slate-400">
                Seamlessly switches between Gemini AI and local fallback engine out-of-the-box.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Clarion AI</span>
            <span>— AI Life & Admin Copilot (Hackathon Edition)</span>
          </div>
          <div>Built for privacy, accuracy, and human-in-the-loop peace of mind.</div>
        </div>
      </footer>
    </div>
  );
}
