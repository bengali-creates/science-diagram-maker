"use client";

import React from "react";
import { Sparkles, Key, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
                Udhi Technologies
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                UK GCSE AI System
              </span>
            </div>
            <h1 className="text-base font-bold text-foreground sm:text-lg">
              Science Diagram Maker
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <ThemeToggle />

          <Button
            variant={hasApiKey ? "outline" : "secondary"}
            size="sm"
            onClick={onOpenApiKey}
            title="Configure Gemini API Key"
            className={hasApiKey ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : ""}
          >
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {hasApiKey ? "API Key Connected" : "Set API Key"}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onResetReviews}
            className="hidden md:inline-flex text-muted-foreground hover:text-foreground"
            title="Reset reviewer decisions in browser"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Reset Decisions
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onOpenGenerate}
            className="shadow-md shadow-primary/20 font-bold"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            <span>Generate Live</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
