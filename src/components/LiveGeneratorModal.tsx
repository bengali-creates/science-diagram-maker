"use client";

import React, { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink,
  ChevronRight,
  Flame,
} from "lucide-react";
import { SCIENCE_CONCEPTS, DEFAULT_MODEL, FALLBACK_MODELS } from "@/lib/constants";
import { DiagramResult, Subject } from "@/types";
import { formatCost } from "@/lib/utils";

interface LiveGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (result: DiagramResult) => void;
  apiKey: string;
  onOpenApiKey: () => void;
}

export function LiveGeneratorModal({
  isOpen,
  onClose,
  onGenerated,
  apiKey,
  onOpenApiKey,
}: LiveGeneratorModalProps) {
  const [selectedConceptId, setSelectedConceptId] = useState<number>(1);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customSubject, setCustomSubject] = useState<Subject>("Maths");
  const [customTitle, setCustomTitle] = useState<string>("");

  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusStep, setStatusStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimit, setIsRateLimit] = useState<boolean>(false);
  const [generatedDiagram, setGeneratedDiagram] = useState<DiagramResult | null>(null);

  if (!isOpen) return null;

  const currentConcept = SCIENCE_CONCEPTS.find((c) => c.id === selectedConceptId);

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsRateLimit(false);
    setGeneratedDiagram(null);

    const title = isCustom ? customTitle || "Custom Science Diagram" : currentConcept?.concept || "Science Diagram";
    const subject = isCustom ? customSubject : currentConcept?.subject || "Maths";
    const promptText = isCustom ? customPrompt : currentConcept?.promptText || "";

    if (!promptText.trim()) {
      setErrorMessage("Please provide prompt text describing the science concept.");
      setIsLoading(false);
      return;
    }

    try {
      setStatusStep("Connecting to Gemini API & generating animated SVG...");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId: isCustom ? Date.now() : selectedConceptId,
          conceptName: title,
          subject,
          promptText,
          apiKey: apiKey || undefined,
          model: selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 429 || data.isRateLimit) {
          setIsRateLimit(true);
        }
        throw new Error(data.error || "Failed to generate science diagram.");
      }

      setStatusStep("Automated validation complete! Diagram verified.");
      setGeneratedDiagram(data.result);
      onGenerated(data.result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col h-[90vh] w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Live AI Diagram Generator</h2>
              <p className="text-xs text-slate-400">
                Executes Part A live: calls model, runs 5 checks in code, retries on failure
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Concept Selection Tabs */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
              Select UK GCSE Science Concept
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SCIENCE_CONCEPTS.map((concept) => (
                <button
                  key={concept.id}
                  type="button"
                  onClick={() => {
                    setSelectedConceptId(concept.id);
                    setIsCustom(false);
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left text-xs transition-all ${
                    !isCustom && selectedConceptId === concept.id
                      ? "border-blue-500 bg-blue-500/10 text-slate-100 shadow-sm shadow-blue-500/20"
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="font-semibold">{concept.concept}</span>
                  <span className="text-[10px] text-blue-400/90">{concept.subject}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left text-xs transition-all ${
                  isCustom
                    ? "border-blue-500 bg-blue-500/10 text-slate-100 shadow-sm shadow-blue-500/20"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span className="font-semibold">+ Custom Prompt</span>
                <span className="text-[10px] text-purple-400">Any Concept</span>
              </button>
            </div>
          </div>

          {/* Prompt Details */}
          {!isCustom ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">
                Text sent to Gemini model:
              </span>
              <p className="text-xs text-slate-200 italic font-serif leading-relaxed">
                "{currentConcept?.promptText}"
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Diagram Title</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Mitosis Cell Division"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Subject</label>
                  <select
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value as Subject)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Maths">Maths</option>
                    <option value="Physics">Physics</option>
                    <option value="Biology">Biology</option>
                    <option value="Chemistry">Chemistry</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Prompt Text</label>
                <textarea
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe the scientific concept, components, and movement to draw in SVG..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Model Selection & API Key Notice */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Gemini Model:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Best Free Limits)</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash (Standard)</option>
              </select>
            </div>

            {!apiKey && (
              <button
                type="button"
                onClick={onOpenApiKey}
                className="text-xs text-amber-400 hover:text-amber-300 underline"
              >
                No API Key set in browser? Click to set
              </button>
            )}
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" />
              <p className="text-xs font-semibold text-blue-300">{statusStep}</p>
              <p className="text-[11px] text-slate-400">
                Running 5 deterministic checks on generated SVG...
              </p>
            </div>
          )}

          {/* Error Banner with 429 guidance */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Generation Error</span>
              </div>
              <p className="text-xs text-rose-200 font-mono bg-rose-950/60 p-2 rounded border border-rose-800/60 break-words">
                {errorMessage}
              </p>

              {isRateLimit && (
                <div className="mt-2 text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-amber-400">
                    Gemini Free Tier Rate Limit (429) Encountered:
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Google AI Studio free tier limits live calls per minute.
                    Wait 30-60 seconds, or connect your own free key in the "Set API Key" modal.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Success Preview */}
          {generatedDiagram && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Generated &amp; Verified Successfully!</span>
                </div>
                <span className="font-mono text-xs text-amber-400">
                  {formatCost(generatedDiagram.costUSD)}
                </span>
              </div>

              <div
                className="aspect-[4/3] w-full max-h-64 rounded-lg border border-slate-800 bg-slate-950 p-2 flex items-center justify-center overflow-hidden"
                dangerouslySetInnerHTML={{ __html: generatedDiagram.svg }}
              />

              <p className="text-[11px] text-emerald-400 text-center">
                All 5 checks passed! This diagram has been updated in your dashboard.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800/80 px-6 py-3.5 bg-slate-900/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Run Live Generation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
