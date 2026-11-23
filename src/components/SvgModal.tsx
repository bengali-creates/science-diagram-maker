"use client";

import React, { useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Copy, Check, Download, Code, Eye } from "lucide-react";
import { DiagramResult } from "@/types";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col h-[90vh] w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-blue-400">
                {diagram.subject}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">
                {diagram.model} ({diagram.totalTokens} tokens)
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">{diagram.concept}</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === "preview"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  activeTab === "code"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                Raw SVG
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              title="Copy SVG to Clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              title="Download SVG file"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative flex-1 overflow-auto p-6 bg-slate-950 flex items-center justify-center">
          {activeTab === "preview" ? (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/30 p-4">
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
              <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-lg backdrop-blur-md">
                <button
                  onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-mono font-medium text-slate-300">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setScale(1)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full w-full overflow-auto rounded-xl border border-slate-800 bg-slate-900/80 p-4 font-mono text-xs text-slate-300">
              <pre className="whitespace-pre-wrap">{diagram.svg}</pre>
            </div>
          )}
        </div>

        {/* Footer Checks Summary */}
        <div className="border-t border-slate-800/80 px-6 py-3 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
          <p className="italic">"{diagram.promptText}"</p>
          <div className="flex items-center gap-3">
            <span>Input Tokens: <strong className="text-slate-200">{diagram.inputTokens}</strong></span>
            <span>Output Tokens: <strong className="text-slate-200">{diagram.outputTokens}</strong></span>
            <span>Cost: <strong className="text-amber-400">${diagram.costUSD.toFixed(6)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
