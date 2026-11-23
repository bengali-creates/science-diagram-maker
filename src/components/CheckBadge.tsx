"use client";

import React, { useState } from "react";
import { Check, X, Info } from "lucide-react";
import { ValidationCheck } from "@/types";

interface CheckBadgeProps {
  check: ValidationCheck;
}

export function CheckBadge({ check }: CheckBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
          check.passed
            ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
            : "border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50"
        }`}
      >
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full ${
            check.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
          }`}
        >
          {check.passed ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : <X className="h-2.5 w-2.5 stroke-[3]" />}
        </span>
        <span className="truncate max-w-[140px] sm:max-w-none">{check.name}</span>
        <Info className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl backdrop-blur-md text-left text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`h-2 w-2 rounded-full ${
                check.passed ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <span className="font-semibold text-slate-200">{check.name}</span>
          </div>
          <p className="text-slate-400 text-[11px] mb-2">{check.description}</p>
          {check.details && (
            <div className="rounded bg-slate-950/80 p-1.5 font-mono text-[10px] text-slate-300 border border-slate-800 break-words">
              {check.details}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
