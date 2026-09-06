"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ShieldCheck, ArrowRight, User, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password validation rules
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteriaMetCount = [hasMinLen, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const isPasswordValid = criteriaMetCount === 5;
  const isConfirmValid = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  // Strength score calculation
  const getPasswordStrength = () => {
    if (password.length === 0) return { label: "", color: "", width: "0%" };
    if (criteriaMetCount <= 2) return { label: "Weak", color: "bg-rose-500", textColor: "text-rose-400", width: "33%" };
    if (criteriaMetCount <= 4) return { label: "Medium", color: "bg-amber-500", textColor: "text-amber-400", width: "66%" };
    return { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-400", width: "100%" };
  };

  const strength = getPasswordStrength();

  // Dynamic inline validation message for password rules
  const getPasswordValidationMessage = () => {
    if (password.length === 0 || isPasswordValid) return null;
    const missing: string[] = [];
    if (!hasMinLen) missing.push("8+ characters");
    if (!hasUpper) missing.push("uppercase letter");
    if (!hasLower) missing.push("lowercase letter");
    if (!hasNumber) missing.push("number");
    if (!hasSpecial) missing.push("symbol");

    return `Must include ${missing.join(", ")}.`;
  };

  const passwordErrorMsg = getPasswordValidationMessage();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill out all required fields.");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not satisfy security requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
      });

      const data = await res.json();

      if (data.success) {
        router.push(redirectPath);
      } else {
        setError(data.error || "Failed to create account.");
      }
    } catch (err: any) {
      setError("Network error. Please try again.");
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
        <h2 className="text-2xl font-bold text-white tracking-tight">Create your Workspace Account</h2>
        <p className="text-xs text-slate-400">
          Start with your own isolated, privacy-first AI life-admin environment
        </p>
      </div>

      {/* Signup Form */}
      <form onSubmit={handleSignup} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. Alex Mercer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-clarion-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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

        {/* Password input with Eye icon */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            {password.length > 0 && (
              <span className={`text-[11px] font-medium ${strength.textColor}`}>
                {strength.label}
              </span>
            )}
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border text-sm text-slate-200 focus:outline-none transition-colors ${
                password.length > 0 && !isPasswordValid
                  ? "border-slate-700 focus:border-clarion-500"
                  : "border-slate-800 focus:border-clarion-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Compact strength bar (shown when user types) */}
          {password.length > 0 && (
            <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden my-1">
              <div
                className={`h-full ${strength.color} transition-all duration-300 rounded-full`}
                style={{ width: strength.width }}
              />
            </div>
          )}

          {/* Inline password validation message or clean subtle hint */}
          {passwordErrorMsg ? (
            <p className="text-[11px] text-amber-400/90 font-medium">
              {passwordErrorMsg}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              Use 8+ characters with a mix of letters, numbers & symbols.
            </p>
          )}
        </div>

        {/* Confirm Password input with Eye icon & Match feedback */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border text-sm text-slate-200 focus:outline-none transition-colors ${
                confirmPassword.length > 0 && !isConfirmValid
                  ? "border-rose-500/60 focus:border-rose-500"
                  : "border-slate-800 focus:border-clarion-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg focus:outline-none"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && !isConfirmValid && (
            <p className="text-[11px] text-rose-400 font-medium">
              Passwords do not match.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !isPasswordValid || !isConfirmValid}
          className={`w-full py-3 rounded-xl font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isLoading || !isPasswordValid || !isConfirmValid
              ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-75"
              : "bg-gradient-to-r from-clarion-600 to-sky-500 hover:from-clarion-500 hover:to-sky-400 text-white"
          }`}
        >
          {isLoading ? (
            <span>Creating Account...</span>
          ) : (
            <>
              <span>Create Workspace Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="text-center pt-2">
          <span className="text-xs text-slate-400">Already have an account? </span>
          <Link
            href={redirectPath !== "/dashboard" ? `/login?redirect=${encodeURIComponent(redirectPath)}` : "/login"}
            className="text-xs font-semibold text-clarion-400 hover:text-clarion-300 underline"
          >
            Sign In
          </Link>
        </div>
      </form>

      <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Isolated workspace • Password protected • Zero data leak</span>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-clarion-500 selection:text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute w-[300px] sm:w-[500px] h-[300px] bg-clarion-600/10 blur-[100px] rounded-full pointer-events-none" />
      <Suspense fallback={<div className="text-white text-xs">Loading signup...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
