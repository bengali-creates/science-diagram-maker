"use client";

import React from "react";
import { CheckCircle2, XCircle, DollarSign, Activity, Cpu } from "lucide-react";
import { formatCost } from "@/lib/utils";
import { Card } from "@/components/ui/card";

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
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Card className="flex items-center gap-3 p-3.5 bg-card/70 backdrop-blur-sm border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
          <Activity className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total Concepts</p>
          <p className="text-lg font-bold text-foreground">{totalCount}</p>
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-3.5 bg-emerald-500/5 border-emerald-500/20 backdrop-blur-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Approved</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{approvedCount}</p>
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-3.5 bg-destructive/5 border-destructive/20 backdrop-blur-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive border border-destructive/30">
          <XCircle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-destructive">Rejected</p>
          <p className="text-lg font-bold text-destructive">{rejectedCount}</p>
        </div>
      </Card>

      <Card className="flex items-center gap-3 p-3.5 bg-amber-500/5 border-amber-500/20 backdrop-blur-sm">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <DollarSign className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Estimated Cost</p>
          <p className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 truncate font-mono">
            {formatCost(totalCostUSD)}
          </p>
        </div>
      </Card>

      <Card className="col-span-2 sm:col-span-1 flex items-center gap-3 p-3.5 bg-card/70 backdrop-blur-sm border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary border border-border">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="overflow-hidden">
          <p className="text-[11px] font-medium text-muted-foreground">Model & Retries</p>
          <p className="text-xs font-bold text-foreground truncate" title={model}>
            {model.replace("gemini-", "")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {totalRetries} retry attempts
          </p>
        </div>
      </Card>
    </div>
  );
}
