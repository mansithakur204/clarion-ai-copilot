"use client";

import React from "react";
import Link from "next/link";
import { FileText, ExternalLink, Sparkles } from "lucide-react";
import { DocumentSourceCitation } from "@/lib/agent/types";

interface GroupedSource {
  documentId: string;
  documentTitle: string;
  category: string;
  maxSimilarity: number;
  snippets: Array<{ chunkIndex: number; snippet: string; similarity: number }>;
}

export function getRelevanceBadge(similarity: number) {
  if (similarity >= 0.80) {
    return { label: "Very High", badgeStyle: "bg-emerald-950/60 text-emerald-300 border-emerald-500/40" };
  }
  if (similarity >= 0.65) {
    return { label: "High", badgeStyle: "bg-clarion-950/60 text-clarion-300 border-clarion-500/40" };
  }
  if (similarity >= 0.50) {
    return { label: "Medium", badgeStyle: "bg-amber-950/60 text-amber-300 border-amber-500/40" };
  }
  return { label: "Related", badgeStyle: "bg-slate-800/80 text-slate-300 border-slate-700/50" };
}

export default function RagSourceCitations({ sources }: { sources?: DocumentSourceCitation[] }) {
  if (!sources || sources.length === 0) {
    return null;
  }

  // Group duplicate chunks from the same document into a single card
  const groupedMap = new Map<string, GroupedSource>();

  for (const src of sources) {
    const existing = groupedMap.get(src.documentId);
    if (existing) {
      if (src.similarity > existing.maxSimilarity) {
        existing.maxSimilarity = src.similarity;
      }
      existing.snippets.push({
        chunkIndex: src.chunkIndex,
        snippet: src.snippet,
        similarity: src.similarity
      });
    } else {
      groupedMap.set(src.documentId, {
        documentId: src.documentId,
        documentTitle: src.documentTitle || "Untitled Document",
        category: src.category || "DOCUMENT",
        maxSimilarity: src.similarity,
        snippets: [{ chunkIndex: src.chunkIndex, snippet: src.snippet, similarity: src.similarity }]
      });
    }
  }

  const groupedSources = Array.from(groupedMap.values());

  return (
    <div className="max-w-[85%] w-full mt-2 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
        <Sparkles className="w-3.5 h-3.5 text-clarion-400" />
        <span>Sources Used ({groupedSources.length})</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {groupedSources.map((docGroup) => {
          const badge = getRelevanceBadge(docGroup.maxSimilarity);
          return (
            <Link
              key={docGroup.documentId}
              href={`/dashboard/documents/${docGroup.documentId}`}
              className="group block p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-clarion-500/40 transition-all shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-clarion-950 border border-clarion-800/60 flex items-center justify-center text-clarion-400 shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-clarion-300 transition-colors truncate flex items-center gap-1.5">
                      <span>{docGroup.documentTitle}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-clarion-400 transition-opacity shrink-0" />
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {docGroup.category} Document
                    </span>
                  </div>
                </div>

                {/* Relevance Badge */}
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${badge.badgeStyle}`}>
                  Relevance: {badge.label}
                </span>
              </div>

              {/* Excerpts */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Relevant document excerpt:
                </span>
                {docGroup.snippets.map((snip, idx) => (
                  <p key={idx} className="text-[11px] text-slate-300 italic bg-slate-950/60 p-2 rounded-lg border border-slate-850/60 leading-relaxed">
                    &ldquo;{snip.snippet}&rdquo;
                  </p>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
