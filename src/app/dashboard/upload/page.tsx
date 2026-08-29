"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { SAMPLE_DOCUMENTS, SampleDoc } from "@/lib/sampleDocs";
import { RiskBadge } from "@/components/RiskBadge";
import { extractDocumentText } from "@/lib/extractor";
import {
  UploadCloud,
  FileText,
  Sparkles,
  Zap,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  X,
  FileCheck,
  RefreshCw
} from "lucide-react";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

export default function DocumentUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("BILL");
  const [documentTitle, setDocumentTitle] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeLabel = (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf")) return "PDF Document (.pdf)";
    if (name.endsWith(".docx")) return "Word Document (.docx)";
    if (name.endsWith(".txt")) return "Text File (.txt)";
    return "Document";
  };

  const isValidFile = (file: File) => {
    const name = file.name.toLowerCase();
    return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  };

  const processSelectedFile = async (file: File) => {
    if (!isValidFile(file)) {
      setErrorMsg("Unsupported file type. Please upload a .pdf, .docx, or .txt file.");
      return;
    }

    setErrorMsg(null);
    setUploadedFile(file);
    setFilename(file.name);

    if (!documentTitle.trim()) {
      const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
      setDocumentTitle(defaultTitle);
    }

    // Immediately clear rawText so old demo/template text is never retained
    setRawText("");
    setIsExtracting(true);

    try {
      const extractedText = await extractDocumentText(file);
      if (!extractedText || !extractedText.trim()) {
        throw new Error("No extractable text content found in file.");
      }

      setRawText(extractedText.trim());
    } catch (err: any) {
      console.error("Text extraction failed:", err);
      setErrorMsg(err.message || "Failed to extract text from document.");
      setUploadedFile(null);
      setFilename("");
      setRawText("");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFilename("");
    setRawText("");
    setErrorMsg(null);
    setIsExtracting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelectSample = (sample: SampleDoc) => {
    setUploadedFile(null);
    setIsExtracting(false);
    setDocumentTitle(sample.title);
    setFilename(sample.filename);
    setRawText(sample.rawText);
    setSelectedCategory(sample.category);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isExtracting) {
      setErrorMsg("Extracting document text... Please wait until extraction completes.");
      return;
    }

    if (!rawText.trim()) {
      setErrorMsg("Please upload a file with extractable text, paste document text, or select a demo template.");
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: documentTitle || filename || "Untitled Document",
          filename: filename || (uploadedFile ? uploadedFile.name : "uploaded_document.txt"),
          rawText: rawText.trim(),
          category: selectedCategory
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Document analysis failed");
      }

      if (data.wasFallback || data.document?.usedFallback) {
        router.push(`/dashboard/documents/${data.document.id}?fallback=true`);
      } else {
        router.push(`/dashboard/documents/${data.document.id}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze document");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <UploadCloud className="w-7 h-7 text-clarion-400" />
          <span>Upload & Analyze Document</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Ingest real-world administrative paperwork, bills, contracts, or notices.
        </p>
      </div>

      {/* Sample Document Quick Selector */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-clarion-950/60 via-slate-900 to-slate-900 border border-clarion-500/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Instant Hackathon Demo Templates</h2>
          </div>
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            Click any template to auto-populate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SAMPLE_DOCUMENTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-clarion-500/40 text-left transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-clarion-400 bg-clarion-500/10 px-2 py-0.5 rounded">
                  {sample.category}
                </span>
                <RiskBadge level={sample.riskLevel} />
              </div>
              <h3 className="text-sm font-bold text-slate-200 group-hover:text-clarion-300 transition-colors">
                {sample.title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {sample.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Paste & Upload Form */}
      <form onSubmit={handleAnalyze} className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Document Title / Name</label>
            <input
              type="text"
              placeholder="e.g. ConEdison August Electricity Bill"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-clarion-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Category Tag</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-clarion-500"
            >
              <option value="BILL">Utility / Service Bill</option>
              <option value="NOTICE">Official Notice / Disconnect Warning</option>
              <option value="CONTRACT">Lease / Subscription Contract</option>
              <option value="HEALTHCARE">Healthcare / Insurance EOB</option>
              <option value="TAX">Property Tax / Revenue Statement</option>
              <option value="STATEMENT">Financial / Bank Statement</option>
              <option value="DOCUMENTATION">Technical / Project Documentation</option>
              <option value="OTHER">Other Administrative Document</option>
            </select>
          </div>
        </div>

        {/* Drag & Drop File Upload Area */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            File Upload (.pdf, .docx, .txt)
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processSelectedFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {isExtracting ? (
            <div className="p-8 rounded-2xl border-2 border-clarion-500/50 bg-clarion-500/10 text-center flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 text-clarion-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Extracting document text...</p>
                <p className="text-xs text-slate-400">Parsing contents of {filename}</p>
              </div>
            </div>
          ) : !uploadedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${isDragging
                  ? "border-clarion-400 bg-clarion-500/10 text-white"
                  : "border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950 text-slate-400"
                }`}
            >
              <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-clarion-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-slate-500">
                  Supports PDF (.pdf), Word (.docx), and Text (.txt) files
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Choose File
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950 border border-clarion-500/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-clarion-500/10 border border-clarion-500/20 text-clarion-400 shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-white truncate">{uploadedFile.name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-clarion-400 font-semibold">{getFileTypeLabel(uploadedFile)}</span>
                    <span>•</span>
                    <span>{formatFileSize(uploadedFile.size)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
                >
                  Change File
                </button>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Document Content Textarea */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Document Content (Extracted text or manual text input)
          </label>
          <textarea
            rows={8}
            placeholder="Extracted text from uploaded file or paste raw text..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 font-mono focus:outline-none focus:border-clarion-500 leading-relaxed"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted local extraction • Zero model retention</span>
          </div>

          <button
            type="submit"
            disabled={isProcessing || isExtracting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-clarion-600 via-clarion-500 to-sky-500 hover:from-clarion-500 hover:to-sky-400 text-white font-bold text-sm shadow-md shadow-clarion-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <span>Running AI Analysis & Extraction...</span>
            ) : isExtracting ? (
              <span>Extracting Document Text...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze with Clarion AI</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
