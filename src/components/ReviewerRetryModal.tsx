"use client";

import React, { useState } from "react";
import {
  Wand2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  History,
  Sparkles,
  RefreshCcw,
} from "lucide-react";
import { DiagramResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReviewerRetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagram: DiagramResult | null;
  apiKey: string;
  onUpdated: (updatedResult: DiagramResult) => void;
}

const PRESET_CRITIQUES = [
  "Fix overlapping elements and ensure at least 30px clearance between shapes and banners",
  "Move text labels so they do not collide with shape borders or each other",
  "Adjust coordinates to stay well inside the 800x600 viewBox",
  "Make the animation movement clearer and smoother",
  "Increase font size and contrast for student readability",
];

export function ReviewerRetryModal({
  isOpen,
  onClose,
  diagram,
  apiKey,
  onUpdated,
}: ReviewerRetryModalProps) {
  const [critique, setCritique] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !diagram) return null;

  const steps = [
    "Compiling reviewer critique and automated validation constraints...",
    `Dispatching revision request to ${diagram.model}...`,
    "Running 6-point deterministic AST & collision verification suite...",
    "Re-hydrating dashboard with updated diagram...",
  ];

  const handleApplyPreset = (text: string) => {
    setCritique((prev) => (prev ? `${prev}. ${text}` : text));
  };

  const handleExecuteRetry = async () => {
    if (!critique.trim()) {
      setErrorMessage(
        "Please enter reviewer instructions describing what the AI should fix.",
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setCurrentStep(0);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId: diagram.id,
          conceptName: diagram.concept,
          subject: diagram.subject,
          promptText: diagram.promptText,
          apiKey: apiKey || undefined,
          model: diagram.model,
          userFeedback: critique.trim(),
          previousSvg: diagram.svg,
        }),
      });

      const data = await response.json();
      clearInterval(stepInterval);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to revise diagram.");
      }

      setCurrentStep(steps.length - 1);
      setTimeout(() => {
        onUpdated(data.result);
        setIsLoading(false);
        onClose();
      }, 600);
    } catch (err: unknown) {
      clearInterval(stepInterval);
      setIsLoading(false);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-2xl rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        {}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Wand2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  AI Diagram Revision &amp; Human Retry
                </h2>
                <Badge variant="outline" className="text-[10px]">
                  Concept #{diagram.id}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Give the LLM direct instructions to correct collisions, layouts,
                or animations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                {diagram.concept}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {diagram.subject}
              </span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              "{diagram.promptText}"
            </p>
          </div>

          {}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Quick Feedback Presets:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CRITIQUES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  disabled={isLoading}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  + {preset.slice(0, 36)}...
                </button>
              ))}
            </div>
          </div>

          {}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Reviewer Critique &amp; Instructions to LLM:
            </label>
            <textarea
              rows={4}
              value={critique}
              onChange={(e) => setCritique(e.target.value)}
              disabled={isLoading}
              placeholder="e.g. The blue hypotenuse square is touching the formula banner at the top. Move the triangle and base square down by 40px so there is clean clearance."
              className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm disabled:opacity-50 leading-relaxed font-sans"
            />
          </div>

          {}
          {isLoading && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI Revision in Progress...</span>
              </div>
              <div className="space-y-2">
                {steps.map((st, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {i < currentStep ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : i === currentStep ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                    )}
                    <span
                      className={
                        i <= currentStep
                          ? "text-foreground font-medium"
                          : "text-muted-foreground/60"
                      }
                    >
                      {st}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {}
          {errorMessage && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>Revision Error</span>
              </div>
              <p className="text-xs text-destructive font-mono">
                {errorMessage}
              </p>
            </div>
          )}
        </div>

        {}
        <div className="border-t border-border px-6 py-3.5 bg-muted/40 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <History className="h-3.5 w-3.5" />
            Will be logged in the concept's audit trail
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleExecuteRetry}
              disabled={isLoading || !critique.trim()}
              className="font-bold shadow-md shadow-primary/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>Fixing Diagram...</span>
                </>
              ) : (
                <>
                  <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                  <span>Run AI Revision</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
