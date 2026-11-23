"use client";

import React from "react";
import { Sparkles, Key, ExternalLink, RefreshCw, Layers } from "lucide-react";

interface HeaderProps {
  onOpenGenerate: () => void;
  onOpenApiKey: () => void;
  hasApiKey: boolean;
  onResetReviews: () => void;
}

export function Header({
  onOpenGenerate,
  onOpenApiKey,
  hasApiKey,
  onResetReviews,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 shadow-lg shadow-blue-500/20">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase">
                Udhi Technologies
              </span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
                UK GCSE AI System
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-100 sm:text-xl">
              Science Diagram Maker
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenApiKey}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              hasApiKey
                ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
            }`}
            title="Configure Gemini API Key"
          >
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {hasApiKey ? "API Key Connected" : "Set API Key"}
            </span>
          </button>

          <button
            onClick={onResetReviews}
            className="hidden items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 md:flex transition-colors"
            title="Reset reviewer decisions in browser"
          >
            <RefreshCw className="h-3 w-3" />
            Reset Decisions
          </button>

          <button
            onClick={onOpenGenerate}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate Live</span>
          </button>
        </div>
      </div>
    </header>
  );
}
