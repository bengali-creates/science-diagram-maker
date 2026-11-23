"use client";

import React from "react";
import { CheckCircle2, XCircle, DollarSign, Activity, Cpu } from "lucide-react";
import { formatCost } from "@/lib/utils";

interface StatsBarProps {
  totalCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalCostUSD: number;
  totalRetries: number;
  model: string;
}

export function StatsBar({
  totalCount,
  approvedCount,
  rejectedCount,
  totalCostUSD,
  totalRetries,
  model,
}: StatsBarProps) {
  const pendingCount = totalCount - approvedCount - rejectedCount;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 backdrop-blur-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Activity className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-400">Total Concepts</p>
          <p className="text-lg font-bold text-slate-100">{totalCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-emerald-950/60 bg-emerald-950/20 p-3.5 backdrop-blur-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-emerald-300">Approved</p>
          <p className="text-lg font-bold text-emerald-400">{approvedCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-rose-950/60 bg-rose-950/20 p-3.5 backdrop-blur-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-rose-300">Rejected</p>
          <p className="text-lg font-bold text-rose-400">{rejectedCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-amber-950/60 bg-amber-950/20 p-3.5 backdrop-blur-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <DollarSign className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-amber-300">Estimated Cost</p>
          <p className="text-xs sm:text-sm font-bold text-amber-400 truncate font-mono">
            {formatCost(totalCostUSD)}
          </p>
        </div>
      </div>

      <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 backdrop-blur-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="overflow-hidden">
          <p className="text-[11px] font-medium text-slate-400">Model & Retries</p>
          <p className="text-xs font-bold text-purple-300 truncate" title={model}>
            {model.replace("gemini-", "")}
          </p>
          <p className="text-[10px] text-slate-400">
            {totalRetries} retry attempts
          </p>
        </div>
      </div>
    </div>
  );
}
