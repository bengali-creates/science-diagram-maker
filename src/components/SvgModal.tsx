"use client";

import React, { useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Copy, Check, Download, Code, Eye } from "lucide-react";
import { DiagramResult } from "@/types";
import { Button } from "@/components/ui/button";

interface SvgModalProps {
  diagram: DiagramResult | null;
  onClose: () => void;
}

export function SvgModal({ diagram, onClose }: SvgModalProps) {
  const [scale, setScale] = useState(1);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  if (!diagram) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(diagram.svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([diagram.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagram.concept.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col h-[90vh] w-full max-w-5xl rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-primary">
                {diagram.subject}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {diagram.model} ({diagram.totalTokens} tokens)
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground">{diagram.concept}</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex rounded-lg border border-border bg-muted p-1">
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "code"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                Raw SVG
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 text-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500 mr-1" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  <span>Copy</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-foreground"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              <span>Download</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative flex-1 overflow-auto p-6 bg-muted/10 flex items-center justify-center">
          {activeTab === "preview" ? (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-4">
              <div
                style={{
                  transform: `scale(${scale})`,
                  transition: "transform 0.15s ease-out",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
                className="flex items-center justify-center w-full h-full"
                dangerouslySetInnerHTML={{ __html: diagram.svg }}
              />

              {/* Floating Zoom Controls */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border border-border bg-card/90 p-1.5 shadow-lg backdrop-blur-md">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 text-xs font-mono font-medium text-foreground">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setScale(1)}
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full w-full overflow-auto rounded-xl border border-border bg-card p-4 font-mono text-xs text-foreground">
              <pre className="whitespace-pre-wrap">{diagram.svg}</pre>
            </div>
          )}
        </div>

        {/* Footer Checks Summary */}
        <div className="border-t border-border px-6 py-3 bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
          <p className="italic max-w-xl truncate">"{diagram.promptText}"</p>
          <div className="flex items-center gap-3">
            <span>Input: <strong className="text-foreground">{diagram.inputTokens}</strong></span>
            <span>Output: <strong className="text-foreground">{diagram.outputTokens}</strong></span>
            <span>Cost: <strong className="text-amber-600 dark:text-amber-400 font-mono">${diagram.costUSD.toFixed(6)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
