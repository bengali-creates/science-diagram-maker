"use client";

import React, { useState, useEffect } from "react";
import initialResultsData from "@/data/results.json";
import { DiagramResult, ReviewState } from "@/types";
import { Header } from "@/components/Header";
import { StatsBar } from "@/components/StatsBar";
import { DiagramRow } from "@/components/DiagramRow";
import { SvgModal } from "@/components/SvgModal";
import { LiveGeneratorModal } from "@/components/LiveGeneratorModal";
import { ApiKeyModal, STORAGE_KEY_GEMINI } from "@/components/ApiKeyModal";
import {
  loadAllReviews,
  saveReview,
  clearAllReviews,
  exportReviewsJson,
} from "@/lib/storage";
import { Download, Sparkles, Filter, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [diagrams, setDiagrams] = useState<DiagramResult[]>(
    initialResultsData as DiagramResult[]
  );
  const [reviews, setReviews] = useState<Record<number, ReviewState>>({});
  const [activeDiagramForModal, setActiveDiagramForModal] =
    useState<DiagramResult | null>(null);

  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "approved" | "rejected" | "pending"
  >("all");

  // Load reviews and API key from localStorage on client mount
  useEffect(() => {
    const savedReviews = loadAllReviews();
    setReviews(savedReviews);

    const savedKey = localStorage.getItem(STORAGE_KEY_GEMINI) || "";
    setApiKey(savedKey);
  }, []);

  const handleReviewChange = (conceptId: number, review: ReviewState) => {
    saveReview(conceptId, review);
    setReviews((prev) => ({
      ...prev,
      [conceptId]: review,
    }));
  };

  const handleResetReviews = () => {
    if (confirm("Reset all reviewer decisions and notes in this browser?")) {
      clearAllReviews();
      setReviews({});
    }
  };

  const handleExportReviews = () => {
    const jsonStr = exportReviewsJson();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `udhi-science-diagram-reviews-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    if (typeof window !== "undefined") {
      if (newKey) {
        localStorage.setItem(STORAGE_KEY_GEMINI, newKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_GEMINI);
      }
    }
  };

  const handleDiagramGenerated = (newResult: DiagramResult) => {
    setDiagrams((prev) => {
      const idx = prev.findIndex((d) => d.concept === newResult.concept);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newResult;
        return copy;
      }
      return [newResult, ...prev];
    });
  };

  // Stats calculation
  const totalCount = diagrams.length;
  let approvedCount = 0;
  let rejectedCount = 0;
  let totalCostUSD = 0;
  let totalRetries = 0;

  diagrams.forEach((d) => {
    const rev = reviews[d.id];
    if (rev?.status === "approved") approvedCount++;
    if (rev?.status === "rejected") rejectedCount++;
    totalCostUSD += d.costUSD;
    totalRetries += d.retryCount;
  });

  const filteredDiagrams = diagrams.filter((d) => {
    if (filterStatus === "all") return true;
    const rev = reviews[d.id];
    const status = rev?.status || "pending";
    return status === filterStatus;
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors selection:bg-primary/20 selection:text-primary">
        <Header
          onOpenGenerate={() => setIsGeneratorOpen(true)}
          onOpenApiKey={() => setIsApiKeyOpen(true)}
          hasApiKey={!!apiKey}
          onResetReviews={handleResetReviews}
        />

        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 space-y-8">
          {/* Hero & Intro Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Diagram Verification Dashboard</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                UK GCSE Science Diagram Reviewer
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                Each animated SVG diagram is generated by Gemini Flash, strictly verified
                by 6 automated code checks (parseability, transform-aware viewBox limits, title/labels, animations, vector richness, and zero text collisions), with one-time feedback retry loops.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportReviews}
                className="font-semibold text-foreground shadow-sm"
                title="Download reviewer decisions as JSON"
              >
                <Download className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>Export Decisions</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={() => setIsGeneratorOpen(true)}
                className="font-bold shadow-md shadow-primary/20"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                <span>Test Live Generation</span>
              </Button>
            </div>
          </div>

          {/* Global Performance & Review Stats */}
          <StatsBar
            totalCount={totalCount}
            approvedCount={approvedCount}
            rejectedCount={rejectedCount}
            totalCostUSD={totalCostUSD}
            totalRetries={totalRetries}
            model={diagrams[0]?.model || "gemini-3.5-flash-lite"}
          />

          {/* Filter & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-primary" />
                Filter by Verdict:
              </span>
              <div className="flex rounded-xl border border-border bg-muted/60 p-1 text-xs">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                    filterStatus === "all"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setFilterStatus("approved")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                    filterStatus === "approved"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approved ({approvedCount})
                </button>
                <button
                  onClick={() => setFilterStatus("rejected")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                    filterStatus === "rejected"
                      ? "bg-destructive text-destructive-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <XCircle className="h-3 w-3" />
                  Rejected ({rejectedCount})
                </button>
                <button
                  onClick={() => setFilterStatus("pending")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                    filterStatus === "pending"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <HelpCircle className="h-3 w-3" />
                  Pending ({totalCount - approvedCount - rejectedCount})
                </button>
              </div>
            </div>

            <span className="text-xs text-muted-foreground">
              Showing {filteredDiagrams.length} of {totalCount} science concepts
            </span>
          </div>

          {/* 5 Concepts Diagram Table Rows */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredDiagrams.map((diagram) => (
                <DiagramRow
                  key={diagram.id}
                  diagram={diagram}
                  review={reviews[diagram.id] || { status: "pending", note: "" }}
                  onReviewChange={handleReviewChange}
                  onInspect={(d) => setActiveDiagramForModal(d)}
                  onRegenerateLive={(d) => {
                    setIsGeneratorOpen(true);
                  }}
                />
              ))}
            </AnimatePresence>

            {filteredDiagrams.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                <p className="text-sm">No diagrams match the "{filterStatus}" filter.</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setFilterStatus("all")}
                  className="mt-2 text-xs"
                >
                  Reset filter to show all
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/50 py-6 text-center text-xs text-muted-foreground transition-colors">
          <p>
            Udhi Technologies — AI-generated Animated Science Diagrams for UK GCSE Students
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/75">
            Built with Next.js, Tailwind CSS v4, Shadcn UI primitives, Framer Motion, and deterministic SVG verification engines.
          </p>
        </footer>

        {/* Modals */}
        <SvgModal
          diagram={activeDiagramForModal}
          onClose={() => setActiveDiagramForModal(null)}
        />

        <LiveGeneratorModal
          isOpen={isGeneratorOpen}
          onClose={() => setIsGeneratorOpen(false)}
          onGenerated={handleDiagramGenerated}
          apiKey={apiKey}
          onOpenApiKey={() => setIsApiKeyOpen(true)}
        />

        <ApiKeyModal
          isOpen={isApiKeyOpen}
          onClose={() => setIsApiKeyOpen(false)}
          onSave={handleSaveApiKey}
          currentKey={apiKey}
        />
      </div>
    </TooltipProvider>
  );
}
