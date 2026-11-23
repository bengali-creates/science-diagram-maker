"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import {
  Check,
  X,
  Maximize2,
  RefreshCw,
  Coins,
  Cpu,
  FileCheck,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { DiagramResult, ReviewState } from "@/types";
import { CheckBadge } from "./CheckBadge";
import { formatCost, getSubjectColor } from "@/lib/utils";

interface DiagramRowProps {
  diagram: DiagramResult;
  review: ReviewState;
  onReviewChange: (conceptId: number, review: ReviewState) => void;
  onInspect: (diagram: DiagramResult) => void;
  onRegenerateLive?: (diagram: DiagramResult) => void;
}

export function DiagramRow({
  diagram,
  review,
  onReviewChange,
  onInspect,
  onRegenerateLive,
}: DiagramRowProps) {
  const [note, setNote] = useState(review.note || "");
  const [svgKey, setSvgKey] = useState(0); // for replaying animation
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
    <div
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        review.status === "approved"
          ? "border-emerald-500/40 bg-slate-900/90 shadow-lg shadow-emerald-950/20"
          : review.status === "rejected"
          ? "border-rose-500/40 bg-slate-900/90 shadow-lg shadow-rose-950/20"
          : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700/80"
      }`}
    >
      {/* Top Banner / Concept Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-3 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${subjectStyle.badge}`}
          >
            {diagram.subject}
          </span>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>{diagram.concept}</span>
            <span className="text-xs font-normal text-slate-400">
              #{diagram.id}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Status Badge */}
          {review.status === "approved" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="h-3.5 w-3.5" /> Approved
            </span>
          )}
          {review.status === "rejected" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 font-semibold text-rose-400 border border-rose-500/30">
              <XCircle className="h-3.5 w-3.5" /> Rejected
            </span>
          )}
          {review.status === "pending" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 font-medium text-slate-400 border border-slate-700">
              <HelpCircle className="h-3 w-3" /> Needs Review
            </span>
          )}

          {/* Replay SVG Animation */}
          <button
            onClick={handleReplayAnimation}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Replay Animation"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {/* Fullscreen Inspector */}
          <button
            onClick={() => onInspect(diagram)}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            title="Open Fullscreen SVG Inspector"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inspect</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Diagram (Animated) & Right Checks/Review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5">
        {/* Left Column: Animated SVG Diagram (6 cols on lg) */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div
            key={svgKey}
            className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950 p-2 shadow-inner group/preview cursor-pointer"
            onClick={() => onInspect(diagram)}
            title="Click to view full screen"
          >
            <div
              className="svg-wrapper flex h-full w-full items-center justify-center"
              dangerouslySetInnerHTML={{ __html: diagram.svg }}
            />
            <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="rounded-lg bg-slate-950/90 border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg">
                Click to Inspect & Zoom
              </span>
            </div>
          </div>

          <p className="mt-2 text-xs italic text-slate-400 line-clamp-2">
            Curriculum Text: "{diagram.promptText}"
          </p>
        </div>

        {/* Right Column: Automated Checks, Metrics & Reviewer Station (6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          {/* Automated Checks Panel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-blue-400" />
                Automated Verification Checks
              </span>
              <span
                className={`text-xs font-semibold ${
                  diagram.allChecksPassed ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {diagram.allChecksPassed ? "5/5 Passed" : "Action Required"}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {diagram.checkDetails.map((check) => (
                <CheckBadge key={check.id} check={check} />
              ))}
            </div>
          </div>

          {/* Model Metrics & Cost Row */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">Cost (USD)</span>
              <span className="font-mono font-bold text-amber-400">
                {formatCost(diagram.costUSD)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Total Tokens</span>
              <span className="font-mono font-semibold text-slate-200">
                {diagram.totalTokens} ({diagram.inputTokens} in / {diagram.outputTokens} out)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Retries</span>
              <span className="font-semibold text-purple-300">
                {diagram.retryCount} attempt{diagram.retryCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Reviewer Action Station */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Reviewer Verdict
              </span>
              <span className="text-[10px] text-slate-500">
                Auto-saved to browser storage
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleApprove}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
                  review.status === "approved"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400"
                    : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-emerald-500/50 hover:bg-emerald-950/30 hover:text-emerald-300"
                }`}
              >
                <Check className="h-4 w-4" />
                <span>Approve</span>
              </button>

              <button
                type="button"
                onClick={handleReject}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
                  review.status === "rejected"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400"
                    : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-rose-500/50 hover:bg-rose-950/30 hover:text-rose-300"
                }`}
              >
                <X className="h-4 w-4" />
                <span>Reject</span>
              </button>
            </div>

            {/* Note box */}
            <div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Reviewer note (e.g. 'Accurate triangle grid, animation runs smoothly')"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
