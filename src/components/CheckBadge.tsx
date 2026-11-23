"use client";

import React from "react";
import { Check, X, Info } from "lucide-react";
import { ValidationCheck } from "@/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CheckBadgeProps {
  check: ValidationCheck;
}

export function CheckBadge({ check }: CheckBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all border cursor-pointer select-none ${
            check.passed
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
              : "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
          }`}
        >
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full ${
              check.passed
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/20 text-destructive"
            }`}
          >
            {check.passed ? (
              <Check className="h-2.5 w-2.5 stroke-[3]" />
            ) : (
              <X className="h-2.5 w-2.5 stroke-[3]" />
            )}
          </span>
          <span className="truncate max-w-[140px] sm:max-w-none">{check.name}</span>
          <Info className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs space-y-1.5 p-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              check.passed ? "bg-emerald-500" : "bg-destructive"
            }`}
          />
          <span className="font-bold text-xs">{check.name}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{check.description}</p>
        {check.details && (
          <div className="rounded bg-muted p-1.5 font-mono text-[10px] text-foreground border border-border break-words">
            {check.details}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
