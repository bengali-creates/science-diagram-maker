"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  RefreshCw,
  History,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Key,
  ArrowRightLeft,
} from "lucide-react";
import { SCIENCE_CONCEPTS, DEFAULT_MODEL } from "@/lib/constants";
import { DiagramResult, Subject } from "@/types";
import { formatCost, getSubjectColor } from "@/lib/utils";
import { summarizeValidationErrors } from "@/lib/gemini";
import { CheckBadge } from "./CheckBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface LiveGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (result: DiagramResult) => void;
  apiKey: string;
  onOpenApiKey: () => void;
}

interface LiveLogItem {
  time: string;
  message: string;
  type: "step" | "warning" | "retry" | "validation";
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
  const [activeModelDisplay, setActiveModelDisplay] =
    useState<string>(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusStep, setStatusStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRateLimit, setIsRateLimit] = useState<boolean>(false);
  const [liveOutput, setLiveOutput] = useState<string>("");
  const [liveLogs, setLiveLogs] = useState<LiveLogItem[]>([]);
  const [generatedDiagram, setGeneratedDiagram] =
    useState<DiagramResult | null>(null);
  const [svgKey, setSvgKey] = useState<number>(0);
  const [showAuditTrail, setShowAuditTrail] = useState<boolean>(true);

  const streamViewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (streamViewportRef.current) {
      streamViewportRef.current.scrollTop =
        streamViewportRef.current.scrollHeight;
    }
  }, [liveOutput]);

  if (!isOpen) return null;

  const currentConcept = SCIENCE_CONCEPTS.find(
    (c) => c.id === selectedConceptId,
  );

  const executeStreamPass = async (params: {
    conceptId: number;
    conceptName: string;
    subject: Subject;
    promptText: string;
    apiKey?: string;
    model: string;
    previousSvg?: string;
    userFeedback?: string;
    attemptNumber?: number;
    maxAttempts?: number;
  }): Promise<{ result?: DiagramResult; error?: string; isRateLimit?: boolean }> => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...params,
          stream: true,
        }),
      });

      if (!response.ok && response.status !== 200) {
        const errJson = await response.json().catch(() => ({}));
        const isRateOrDemand =
          response.status === 429 ||
          response.status === 503 ||
          response.status === 504 ||
          Boolean(errJson.isRateLimit);
        return {
          error:
            errJson.error ||
            (response.status === 503
              ? "Gemini API servers are currently experiencing high demand (503). Spikes are temporary."
              : `HTTP ${response.status} Error`),
          isRateLimit: isRateOrDemand,
        };
      }

      if (!response.body) {
        return { error: "No readable stream response received." };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: DiagramResult | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const ev of events) {
          const trimmed = ev.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payloadStr = trimmed.slice(5).trim();
          if (!payloadStr) continue;

          try {
            const data = JSON.parse(payloadStr);

            if (data.type === "chunk" && typeof data.text === "string") {
              setLiveOutput((prev) => prev + data.text);
            } else if (data.type === "step") {
              setStatusStep(data.message);
              setLiveLogs((prev) => [
                ...prev,
                {
                  time: new Date().toLocaleTimeString(),
                  message: data.message,
                  type: "step",
                },
              ]);
            } else if (data.type === "model_fallback") {
              const toModel = data.data?.toModel || "gemini-3.5-flash";
              setActiveModelDisplay(toModel);
              setLiveLogs((prev) => [
                ...prev,
                {
                  time: new Date().toLocaleTimeString(),
                  message: data.message || `Switched to ${toModel}`,
                  type: "warning",
                },
              ]);
            } else if (data.type === "retry") {
              setLiveLogs((prev) => [
                ...prev,
                {
                  time: new Date().toLocaleTimeString(),
                  message: data.message,
                  type: "retry",
                },
              ]);
            } else if (data.type === "validation") {
              setLiveLogs((prev) => [
                ...prev,
                {
                  time: new Date().toLocaleTimeString(),
                  message: data.message,
                  type: "validation",
                },
              ]);
            } else if (data.type === "done") {
              finalResult = data.result;
            } else if (data.type === "error") {
              return {
                error: data.error || "Generation error.",
                isRateLimit: Boolean(data.isRateLimit),
              };
            }
          } catch {
            // ignore split json chunks
          }
        }
      }

      return { result: finalResult };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateOrDemand =
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("504") ||
        msg.toLowerCase().includes("quota") ||
        msg.toLowerCase().includes("rate limit") ||
        msg.toLowerCase().includes("high demand") ||
        msg.toLowerCase().includes("overloaded") ||
        msg.toLowerCase().includes("network error") ||
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("fetch");
      return {
        error: isRateOrDemand
          ? "Gemini API demand spike / network blip (503/429). Retrying or providing a personal API key is recommended."
          : msg,
        isRateLimit: isRateOrDemand,
      };
    }
  };

  const handleGenerate = async (overrideModel?: string) => {
    const modelToUse = overrideModel || selectedModel;
    if (overrideModel) {
      setSelectedModel(overrideModel);
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsRateLimit(false);
    setGeneratedDiagram(null);
    setLiveOutput("");
    setActiveModelDisplay(modelToUse);
    setLiveLogs([
      {
        time: new Date().toLocaleTimeString(),
        message: `Connecting to ${modelToUse}...`,
        type: "step",
      },
    ]);

    const title = isCustom
      ? customTitle || "Custom Science Diagram"
      : currentConcept?.concept || "Science Diagram";
    const subject = isCustom
      ? customSubject
      : currentConcept?.subject || "Maths";
    const promptText = isCustom
      ? customPrompt
      : currentConcept?.promptText || "";

    if (!promptText.trim()) {
      setErrorMessage(
        "Please provide prompt text describing the science concept.",
      );
      setIsLoading(false);
      return;
    }

    const maxRetries = 5;
    let currentAttempt = 1;
    let currentSvg: string | undefined = undefined;
    let feedbackForNext: string | undefined = undefined;
    let bestDiagram: DiagramResult | null = null;
    const combinedAuditTrail: NonNullable<DiagramResult["retryHistory"]> = [];

    try {
      while (currentAttempt <= maxRetries) {
        const isRetry = currentAttempt > 1;
        setLiveOutput("");

        if (isRetry) {
          const retryMsg = `[Auto-Retry ${currentAttempt - 1}/${maxRetries - 1}] Solving batch defects...`;
          setStatusStep(retryMsg);
          setLiveLogs((prev) => [
            ...prev,
            {
              time: new Date().toLocaleTimeString(),
              message: retryMsg,
              type: "retry",
            },
          ]);
        } else {
          setStatusStep(`Generating initial diagram with ${modelToUse}...`);
        }

        let pass = await executeStreamPass({
          conceptId: isCustom ? Date.now() : selectedConceptId,
          conceptName: title,
          subject,
          promptText,
          apiKey: apiKey || undefined,
          model: modelToUse,
          previousSvg: currentSvg,
          userFeedback: feedbackForNext,
          attemptNumber: currentAttempt,
          maxAttempts: maxRetries,
        });

        // Transient network retry: auto-retry once after 1.5s delay if network drop or 503 spike occurs
        if (pass.error && pass.isRateLimit) {
          setLiveLogs((prev) => [
            ...prev,
            {
              time: new Date().toLocaleTimeString(),
              message: `Transient network/demand spike on attempt #${currentAttempt}. Retrying pass in 1.5s...`,
              type: "warning",
            },
          ]);
          await new Promise((r) => setTimeout(r, 1500));
          pass = await executeStreamPass({
            conceptId: isCustom ? Date.now() : selectedConceptId,
            conceptName: title,
            subject,
            promptText,
            apiKey: apiKey || undefined,
            model: modelToUse,
            previousSvg: currentSvg,
            userFeedback: feedbackForNext,
            attemptNumber: currentAttempt,
            maxAttempts: maxRetries,
          });
        }

        if (pass.error) {
          setErrorMessage(pass.error);
          if (pass.isRateLimit) setIsRateLimit(true);
          break;
        }

        if (!pass.result) {
          setErrorMessage("No diagram returned from generation pass.");
          break;
        }

        bestDiagram = pass.result;
        if (pass.result.retryHistory) {
          combinedAuditTrail.push(...pass.result.retryHistory);
        }

        if (pass.result.allChecksPassed) {
          setLiveLogs((prev) => [
            ...prev,
            {
              time: new Date().toLocaleTimeString(),
              message: `✅ All 6 automated checks passed on attempt #${currentAttempt}!`,
              type: "validation",
            },
          ]);
          setStatusStep("Automated validation complete! All 6 checks verified.");
          break;
        }

        if (currentAttempt < maxRetries) {
          currentSvg = pass.result.svg;
          const failedChecks = pass.result.checkDetails.filter((c) => !c.passed);
          const feedbackList = failedChecks.map(
            (c) => c.details || c.description || c.name,
          );
          feedbackForNext = summarizeValidationErrors(feedbackList);

          setLiveLogs((prev) => [
            ...prev,
            {
              time: new Date().toLocaleTimeString(),
              message: `Attempt #${currentAttempt}: ${failedChecks.length} check(s) flagged. Auto-retrying with batch summary...`,
              type: "warning",
            },
          ]);

          currentAttempt++;
          await new Promise((r) => setTimeout(r, 600));
        } else {
          setStatusStep(`Completed all ${maxRetries} attempts. Reviewing best diagram.`);
          break;
        }
      }

      if (bestDiagram) {
        const finalDiagram: DiagramResult = {
          ...bestDiagram,
          retryCount: currentAttempt - 1,
          retryHistory:
            combinedAuditTrail.length > 0
              ? combinedAuditTrail
              : bestDiagram.retryHistory,
        };
        setGeneratedDiagram(finalDiagram);
        setSvgKey((k) => k + 1);
        onGenerated(finalDiagram);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateOrDemand =
        msg.includes("429") ||
        msg.includes("503") ||
        msg.includes("504") ||
        msg.toLowerCase().includes("quota") ||
        msg.toLowerCase().includes("rate limit") ||
        msg.toLowerCase().includes("high demand") ||
        msg.toLowerCase().includes("overloaded") ||
        msg.toLowerCase().includes("network error") ||
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("fetch");
      setErrorMessage(
        isRateOrDemand
          ? "Gemini API demand spike / network blip (503/429). Retrying or providing a personal API key is recommended."
          : msg
      );
      if (isRateOrDemand) {
        setIsRateLimit(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplayAnimation = () => {
    setSvgKey((k) => k + 1);
  };

  const subjectStyle = generatedDiagram
    ? getSubjectColor(generatedDiagram.subject)
    : getSubjectColor(
        isCustom ? customSubject : currentConcept?.subject || "Maths",
      );

  const passedCheckCount = generatedDiagram
    ? generatedDiagram.checkDetails.filter((c) => c.passed).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col h-[92vh] w-full max-w-4xl rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        {}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Live AI Diagram Generator &amp; Verifier
              </h2>
              <p className="text-xs text-muted-foreground">
                Executes Part A live: calls Gemini, runs 6 code checks, with batched multi-check error solving
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
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
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    !isCustom && selectedConceptId === concept.id
                      ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="font-bold">{concept.concept}</span>
                  <span className="text-[10px] text-primary">
                    {concept.subject}
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  isCustom
                    ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-bold">+ Custom Prompt</span>
                <span className="text-[10px] text-purple-500">Any Concept</span>
              </button>
            </div>
          </div>

          {}
          {!isCustom ? (
            <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Text sent to Gemini model:
              </span>
              <p className="text-xs text-foreground italic font-serif leading-relaxed">
                "{currentConcept?.promptText}"
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Diagram Title
                  </label>
                  <Input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Mitosis Cell Division"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Subject
                  </label>
                  <select
                    value={customSubject}
                    onChange={(e) =>
                      setCustomSubject(e.target.value as Subject)
                    }
                    className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Maths">Maths</option>
                    <option value="Physics">Physics</option>
                    <option value="Biology">Biology</option>
                    <option value="Chemistry">Chemistry</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Curriculum Prompt
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe the scientific concept, objects, and animated behavior you want the AI model to draw..."
                  rows={2}
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          {}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">
                Gemini Model:
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="gemini-3.5-flash-lite">
                  gemini-3.5-flash-lite (Best Free Limits)
                </option>
                <option value="gemini-3.5-flash">
                  gemini-3.5-flash (Standard)
                </option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {apiKey ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  API Key Configured
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOpenApiKey}
                  className="text-primary hover:underline cursor-pointer"
                >
                  No API Key set in browser? Click to set
                </button>
              )}
            </div>
          </div>

          {}
          {isLoading && (
            <div className="rounded-2xl border border-primary/40 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden animate-in fade-in space-y-0">
              {}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-200">
                    Live AI Output Stream
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  >
                    {activeModelDisplay}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                  <span>{liveOutput.length} chars</span>
                  <div className="flex items-center gap-1.5 text-primary font-semibold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{statusStep || "Generating..."}</span>
                  </div>
                </div>
              </div>

              {}
              {liveLogs.length > 0 && (
                <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex flex-wrap gap-2 text-[11px] font-mono">
                  {liveLogs.map((log, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                        log.type === "warning"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                          : log.type === "retry"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : log.type === "validation"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      <span className="opacity-60">{log.time}:</span>
                      <span>{log.message}</span>
                    </span>
                  ))}
                </div>
              )}

              {}
              <div
                ref={streamViewportRef}
                className="p-4 max-h-72 overflow-y-auto font-mono text-xs text-emerald-400/90 leading-relaxed bg-black/60 select-all border-b border-slate-800"
              >
                {liveOutput ? (
                  <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-snug">
                    {liveOutput}
                    <span className="inline-block w-2 h-3.5 ml-0.5 bg-emerald-400 animate-pulse align-middle" />
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs italic text-slate-300">
                      Connecting to Google Gemini API... Streaming raw SVG
                      markup in real time.
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Continuous token generation • AST validation runs
                      automatically on stream end
                    </p>
                  </div>
                )}
              </div>

              {}
              <div className="bg-slate-900/70 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>
                  Deterministic AST &amp; collision checks run immediately after
                  generation.
                </span>
                <span className="text-emerald-400 font-semibold">
                  Gemini 3.5 Streaming Protocol
                </span>
              </div>
            </div>
          )}

          {}
          {errorMessage && (
            <div
              className={`rounded-xl border p-4 space-y-3 animate-in fade-in shadow-md ${
                isRateLimit
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                  : "border-destructive/40 bg-destructive/10 text-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 ${
                      isRateLimit
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-destructive"
                    }`}
                  />
                  <span
                    className={
                      isRateLimit
                        ? "text-amber-700 dark:text-amber-300 text-sm font-bold"
                        : "text-destructive"
                    }
                  >
                    {isRateLimit
                      ? "Gemini API Demand / Rate Limit Notice (429 / 503)"
                      : "Generation Error"}
                  </span>
                </div>
                {isRateLimit && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px] bg-amber-500/10"
                  >
                    Shared Quota Exhausted
                  </Badge>
                )}
              </div>

              <p
                className={`text-xs font-mono p-2.5 rounded border break-words ${
                  isRateLimit
                    ? "bg-amber-950/20 border-amber-500/30 text-amber-800 dark:text-amber-200"
                    : "bg-destructive/15 border-destructive/30 text-destructive"
                }`}
              >
                {errorMessage}
              </p>

              {isRateLimit && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Google AI Studio limits free live calls per minute, or the
                    model is currently under high demand. You can input your own
                    free Gemini API key to bypass shared limits, or switch to an
                    alternate Gemini model and retry:
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={onOpenApiKey}
                      className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-sm"
                    >
                      <Key className="h-3.5 w-3.5" />
                      <span>Enter Your Gemini API Key</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const altModel = selectedModel.includes("flash-lite")
                          ? "gemini-3.5-flash"
                          : "gemini-3.5-flash-lite";
                        setSelectedModel(altModel);
                        handleGenerate(altModel);
                      }}
                      className="gap-1.5 text-xs font-bold border-amber-500/50 hover:bg-amber-500/20 cursor-pointer text-amber-700 dark:text-amber-300"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        Switch to{" "}
                        {selectedModel.includes("flash-lite")
                          ? "gemini-3.5-flash"
                          : "gemini-3.5-flash-lite"}{" "}
                        &amp; Retry
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {}
          {generatedDiagram && (
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden space-y-0 animate-in fade-in">
              {}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 bg-muted/40">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${subjectStyle.badge}`}
                  >
                    {generatedDiagram.subject}
                  </span>
                  <h3 className="text-sm font-bold text-foreground">
                    {generatedDiagram.concept}
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {generatedDiagram.model}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReplayAnimation}
                    className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Replay animation"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Replay Motion</span>
                  </Button>
                </div>
              </div>

              {}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5">
                {}
                <div className="lg:col-span-7 flex flex-col gap-2">
                  <div
                    key={svgKey}
                    className="group relative aspect-[4/3] w-full rounded-xl border border-border bg-white dark:bg-slate-950 p-2 flex items-center justify-center overflow-hidden shadow-inner"
                    dangerouslySetInnerHTML={{ __html: generatedDiagram.svg }}
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>viewBox="0 0 800 600"</span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      Active Scientific SMIL/CSS Animation
                    </span>
                  </div>
                </div>

                {}
                <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                  {}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <FileCheck className="h-3.5 w-3.5 text-primary" />
                        <span>AUTOMATED VERIFICATION CHECKS</span>
                      </div>
                      <Badge
                        variant={
                          passedCheckCount === 6 ? "default" : "destructive"
                        }
                        className="text-[11px] font-bold"
                      >
                        {passedCheckCount}/6 Passed
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {generatedDiagram.checkDetails.map((check) => (
                        <CheckBadge key={check.id} check={check} />
                      ))}
                    </div>
                  </div>

                  {}
                  <div className="rounded-xl border border-border/80 bg-muted/30 p-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Cost (USD)
                      </div>
                      <div className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {formatCost(generatedDiagram.costUSD)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Total Tokens
                      </div>
                      <div className="font-mono text-foreground font-bold mt-0.5">
                        {generatedDiagram.totalTokens.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {generatedDiagram.inputTokens} in /{" "}
                        {generatedDiagram.outputTokens} out
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Retries
                      </div>
                      <div className="font-mono font-bold mt-0.5 text-foreground">
                        {generatedDiagram.retryCount}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {generatedDiagram.retryCount === 1
                            ? "attempt"
                            : "attempts"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {}
                  {generatedDiagram.retryHistory &&
                    generatedDiagram.retryHistory.length > 0 && (
                      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowAuditTrail(!showAuditTrail)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <History className="h-3.5 w-3.5 text-primary" />
                            <span>Retry &amp; Validation Audit Trail</span>
                            <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] text-primary font-bold">
                              {generatedDiagram.retryHistory.length}
                            </span>
                          </div>
                          {showAuditTrail ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {showAuditTrail && (
                          <div className="p-3 pt-0 space-y-2 text-[11px] border-t border-border/50">
                            {generatedDiagram.retryHistory.map((item, idx) => (
                              <div
                                key={idx}
                                className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                                  item.checksPassed
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <span>
                                    Attempt #{item.attemptNumber} (
                                    {item.trigger === "auto_validation"
                                      ? "Auto-Retry Feedback"
                                      : "Manual Reviewer"}
                                    )
                                  </span>
                                  <span>
                                    {item.checksPassed
                                      ? "PASSED"
                                      : "FAILED CHECKS"}
                                  </span>
                                </div>
                                <ul className="list-disc list-inside space-y-0.5 text-[10px] font-mono">
                                  {item.feedback.map((f, fIdx) => (
                                    <li key={fIdx} className="break-words">
                                      {f}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>

              {}
              <div className="border-t border-border px-5 py-2.5 bg-muted/30 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Curriculum: "{currentConcept?.promptText || customPrompt}"
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Synced to Main Review Dashboard
                </span>
              </div>
            </div>
          )}
        </div>

        {}
        <div className="border-t border-border px-6 py-3.5 bg-muted/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {generatedDiagram
              ? "Diagram generated and verified live."
              : "Select a concept and run live generation."}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleGenerate()}
              disabled={isLoading}
              className="shadow-md shadow-primary/20 font-bold cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>Generating &amp; Verifying...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  <span>Run Live Generation</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
