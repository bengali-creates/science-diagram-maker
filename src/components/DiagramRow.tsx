"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Maximize2,
  RefreshCw,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileCheck,
  Wand2,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import { DiagramResult, ReviewState } from "@/types";
import { CheckBadge } from "./CheckBadge";
import { ReviewerRetryModal } from "./ReviewerRetryModal";
import { formatCost, getSubjectColor } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface DiagramRowProps {
  diagram: DiagramResult;
  review: ReviewState;
  onReviewChange: (conceptId: number, review: ReviewState) => void;
  onInspect: (diagram: DiagramResult) => void;
  onRegenerateLive?: (diagram: DiagramResult) => void;
  onDiagramUpdated?: (updated: DiagramResult) => void;
  apiKey?: string;
}

export function DiagramRow({
  diagram,
  review,
  onReviewChange,
  onInspect,
  onRegenerateLive,
  onDiagramUpdated,
  apiKey = "",
}: DiagramRowProps) {
  const [note, setNote] = useState(review.note || "");
  const [svgKey, setSvgKey] = useState(0); // for replaying animation
  const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const subjectStyle = getSubjectColor(diagram.subject);

  const handleApprove = () => {
    const newStatus = review.status === "approved" ? "pending" : "approved";
    onReviewChange(diagram.id, {
      status: newStatus,
      note,
    });

    if (newStatus === "approved") {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#10b981", "#3b82f6", "#6366f1"],
        });
      } catch {
        // ignore if confetti blocked
      }
    }
  };

  const handleReject = () => {
    const newStatus = review.status === "rejected" ? "pending" : "rejected";
    onReviewChange(diagram.id, {
      status: newStatus,
      note,
    });
  };

  const handleNoteBlur = () => {
    onReviewChange(diagram.id, {
      status: review.status,
      note,
    });
  };

  const handleReplayAnimation = () => {
    setSvgKey((k) => k + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        className={`group relative transition-all duration-200 overflow-hidden border ${
          review.status === "approved"
            ? "border-emerald-500/40 bg-card/95 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/20"
            : review.status === "rejected"
            ? "border-destructive/40 bg-card/95 shadow-md shadow-destructive/5 ring-1 ring-destructive/20"
            : "border-border bg-card/75 hover:border-border/80 shadow-sm"
        }`}
      >
        {/* Top Banner / Concept Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 bg-muted/40">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${subjectStyle.badge}`}
            >
              {diagram.subject}
            </span>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>{diagram.concept}</span>
              <span className="text-xs font-normal text-muted-foreground">
                #{diagram.id}
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Status Badge */}
            {review.status === "approved" && (
              <Badge variant="success" className="gap-1 font-bold">
                <CheckCircle className="h-3.5 w-3.5" /> Approved
              </Badge>
            )}
            {review.status === "rejected" && (
              <Badge variant="destructive" className="gap-1 font-bold">
                <XCircle className="h-3.5 w-3.5" /> Rejected
              </Badge>
            )}
            {review.status === "pending" && (
              <Badge variant="outline" className="gap-1 text-muted-foreground font-medium">
                <HelpCircle className="h-3 w-3" /> Needs Review
              </Badge>
            )}

            {/* Visual Retry Badge */}
            {diagram.retryCount > 0 && (
              <Badge variant="warning" className="gap-1 font-bold">
                ⚡ {diagram.retryCount} {diagram.retryCount === 1 ? "Auto-Retry" : "Retries"}
              </Badge>
            )}

            {/* Request AI Revision Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRetryModalOpen(true)}
              className="h-8 gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold"
              title="Open Reviewer AI Retry & Critique Dialog"
            >
              <Wand2 className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">AI Revision</span>
            </Button>

            {/* Replay SVG Animation Button */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleReplayAnimation}
              title="Replay SVG Animation"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>

            {/* Fullscreen Inspector Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onInspect(diagram)}
              title="Open Fullscreen SVG Inspector"
              className="h-8 text-foreground"
            >
              <Maximize2 className="h-3.5 w-3.5 mr-1" />
              <span>Inspect</span>
            </Button>
          </div>
        </div>

        {/* Main Grid: Left Diagram (Animated) & Right Checks/Review */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5">
          {/* Left Column: Animated SVG Diagram */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div
              key={svgKey}
              className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/20 p-2 shadow-inner group/preview cursor-pointer"
              onClick={() => onInspect(diagram)}
              title="Click to view full screen"
            >
              <div
                className="svg-wrapper flex h-full w-full items-center justify-center"
                dangerouslySetInnerHTML={{ __html: diagram.svg }}
              />
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="rounded-lg bg-popover/90 border border-border px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm">
                  Click to Inspect &amp; Zoom
                </span>
              </div>
            </div>

            <p className="mt-2 text-xs italic text-muted-foreground line-clamp-2">
              Curriculum Text: "{diagram.promptText}"
            </p>
          </div>

          {/* Right Column: Automated Checks, Metrics & Reviewer Station */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            {/* Automated Checks Panel */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-primary" />
                  Automated Verification Checks
                </span>
                <span
                  className={`text-xs font-semibold ${
                    diagram.allChecksPassed
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {diagram.allChecksPassed ? "6/6 Passed" : "Action Required"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {diagram.checkDetails.map((check) => (
                  <CheckBadge key={check.id} check={check} />
                ))}
              </div>
            </div>

            {/* Model Metrics & Cost Row */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/40 p-2.5 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">Cost (USD)</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatCost(diagram.costUSD)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Total Tokens</span>
                <span className="font-mono font-semibold text-foreground">
                  {diagram.totalTokens} ({diagram.inputTokens} in / {diagram.outputTokens} out)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Retries</span>
                <span className="font-semibold text-primary">
                  {diagram.retryCount} attempt{diagram.retryCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Reviewer Action Station */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Reviewer Verdict
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Auto-saved to browser storage
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={handleApprove}
                  variant={review.status === "approved" ? "success" : "outline"}
                  className="font-bold cursor-pointer"
                >
                  <Check className="h-4 w-4 mr-1" />
                  <span>Approve</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleReject}
                  variant={review.status === "rejected" ? "destructive" : "outline"}
                  className="font-bold cursor-pointer"
                >
                  <X className="h-4 w-4 mr-1" />
                  <span>Reject</span>
                </Button>
              </div>

              {/* Note box */}
              <div>
                <Input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={handleNoteBlur}
                  placeholder="Reviewer note (e.g. 'Accurate triangle grid, clean labels')"
                  className="text-xs"
                />
              </div>

              {/* Collapsible Retry & Audit Trail */}
              <div className="pt-1 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAuditTrail(!showAuditTrail)}
                  className="flex w-full items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-0.5"
                >
                  <span className="flex items-center gap-1.5">
                    <History className="h-3 w-3 text-primary" />
                    <span>Retry &amp; Validation Audit Trail</span>
                    {diagram.retryCount > 0 && (
                      <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 text-[10px] font-mono">
                        {diagram.retryCount}
                      </span>
                    )}
                  </span>
                  {showAuditTrail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                <AnimatePresence>
                  {showAuditTrail && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-2.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between text-muted-foreground font-mono text-[10px]">
                        <span>Model: {diagram.model}</span>
                        <span>Total Retries: {diagram.retryCount}</span>
                      </div>

                      {diagram.retryHistory && diagram.retryHistory.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {diagram.retryHistory.map((step, idx) => (
                            <div
                              key={idx}
                              className="rounded-md border border-border bg-background p-2 text-[11px]"
                            >
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-foreground">
                                  Attempt #{step.attemptNumber} ({step.trigger === "auto_validation" ? "Auto Retry" : "Human Revision"})
                                </span>
                                <span
                                  className={`font-mono text-[10px] ${
                                    step.checksPassed
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {step.checksPassed ? "✓ Checks Passed" : "⚠ Checks Failed"}
                                </span>
                              </div>
                              {step.failedCheckNames && step.failedCheckNames.length > 0 && (
                                <p className="mt-1 text-[10px] text-destructive font-mono">
                                  Failed: {step.failedCheckNames.join(", ")}
                                </p>
                              )}
                              {step.userCritique && (
                                <p className="mt-1 text-[10px] text-primary font-medium">
                                  Reviewer Critique: "{step.userCritique}"
                                </p>
                              )}
                              {step.feedback && step.feedback.length > 0 && (
                                <p className="mt-1 text-[10px] text-muted-foreground italic">
                                  Prompt Feedback: "{step.feedback.join("; ")}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">
                          Generated directly in initial pass with 6/6 deterministic AST &amp; collision checks satisfied.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Human AI Revision Dialog */}
      <ReviewerRetryModal
        isOpen={isRetryModalOpen}
        onClose={() => setIsRetryModalOpen(false)}
        diagram={diagram}
        apiKey={apiKey}
        onUpdated={(updated) => {
          onDiagramUpdated?.(updated);
        }}
      />
    </motion.div>
  );
}
