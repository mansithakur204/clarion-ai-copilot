"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ShieldCheck, ArrowRight, Mail, Lock, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();

      if (data.success) {
        router.push(redirectPath);
      } else {
        setError(data.error || "Invalid email or password.");
      }
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const demoEmail = "demo@clarion.ai";
      const demoPass = "demo123456";

      let res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: demoPass })
      });

      let data = await res.json();

      if (!data.success) {
        res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Demo User", email: demoEmail, password: demoPass })
        });
        data = await res.json();
      }

      if (data.success) {
        router.push(redirectPath);
      } else {
        setError("Failed to launch demo session.");
      }
    } catch (err) {
      setError("Error launching demo mode.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 relative z-10">
      {/* Brand header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-clarion-700 via-clarion-500 to-sky-400 flex items-center justify-center shadow-lg shadow-clarion-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Clarion <span className="text-clarion-400">AI</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to your Workspace</h2>
        <p className="text-xs text-slate-400">
          Privacy-first administration & human-verified copilot
        </p>
      </div>

      {/* Demo Quick Login Card */}
      <div className="p-4 rounded-2xl bg-clarion-500/10 border border-clarion-500/25 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-clarion-300">
          <span>🚀 Hackathon Demo Mode</span>
          <span className="bg-clarion-500/20 text-clarion-300 px-2 py-0.5 rounded text-[10px]">
            Instant Access
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Instantly launch a clean sandbox session to test document intelligence and Copilot actions.
        </p>
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl bg-clarion-600 hover:bg-clarion-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-clarion-600/30 cursor-pointer"
        >
          <span>One-Click Sandbox Launch</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Standard Form */}
      <form onSubmit={handleLogin} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-clarion-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-clarion-500 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-clarion-600 to-sky-500 hover:from-clarion-500 hover:to-sky-400 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
            <span>Authenticating...</span>
          ) : (
            <>
              <span>Sign In to Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="text-center pt-2">
          <span className="text-xs text-slate-400">Don&apos;t have an account? </span>
          <Link href="/signup" className="text-xs font-semibold text-clarion-400 hover:text-clarion-300 underline">
            Create Account
          </Link>
        </div>
      </form>

      <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>HTTP-Only Encrypted Sessions • 100% Data Isolation</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-clarion-500 selection:text-white">
      <div className="absolute w-[500px] h-[300px] bg-clarion-600/10 blur-[100px] rounded-full pointer-events-none" />
      <Suspense fallback={<div className="text-white text-xs">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
