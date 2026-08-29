import React from "react";
import { RiskLevel } from "@/lib/types";
import { AlertTriangle, AlertCircle, Info, ShieldCheck } from "lucide-react";

interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, showIcon = true }) => {
  switch (level) {
    case "URGENT":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
          {showIcon && <AlertTriangle className="w-3.5 h-3.5" />}
          URGENT ACTION
        </span>
      );
    case "HIGH":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          {showIcon && <AlertCircle className="w-3.5 h-3.5" />}
          HIGH RISK
        </span>
      );
    case "MEDIUM":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
          {showIcon && <Info className="w-3.5 h-3.5" />}
          MODERATE
        </span>
      );
    case "LOW":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          {showIcon && <ShieldCheck className="w-3.5 h-3.5" />}
          LOW RISK
        </span>
      );
  }
};
