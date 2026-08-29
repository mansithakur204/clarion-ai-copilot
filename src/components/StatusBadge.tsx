import React from "react";
import { DocumentStatus } from "@/lib/types";
import { CheckCircle2, Clock, Eye, FileCheck } from "lucide-react";

interface StatusBadgeProps {
  status: DocumentStatus;
  humanVerified?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, humanVerified }) => {
  if (humanVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        Human Verified
      </span>
    );
  }

  switch (status) {
    case "VERIFICATION_REQUIRED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <Eye className="w-3 h-3 text-amber-400" />
          Needs Review
        </span>
      );
    case "VERIFIED":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <FileCheck className="w-3 h-3 text-emerald-400" />
          Verified
        </span>
      );
    case "PENDING_ANALYSIS":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600">
          <Clock className="w-3 h-3 animate-spin text-clarion-400" />
          Analyzing...
        </span>
      );
    case "ANALYSIS_COMPLETE":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/20 text-sky-300 border border-sky-500/40">
          <CheckCircle2 className="w-3 h-3 text-sky-400" />
          Analyzed
        </span>
      );
  }
};
