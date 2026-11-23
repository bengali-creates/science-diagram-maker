"use client";

import React, { useState, useEffect } from "react";
import { Key, Check, ExternalLink, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string;
}

export const STORAGE_KEY_GEMINI = "udhi_gemini_api_key";

export function ApiKeyModal({ isOpen, onClose, onSave, currentKey }: ApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState(currentKey);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKeyInput(currentKey);
  }, [currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(keyInput.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  };

  const handleClear = () => {
    setKeyInput("");
    onSave("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Gemini API Key</h3>
              <p className="text-xs text-muted-foreground">For live on-demand generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get a completely free key at Google AI Studio. No credit card required.
          </p>

          <a
            href="https://aistudio.google.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>Get free key at aistudio.google.com/api-keys</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-foreground">
              Enter API Key
            </label>
            <Input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="font-mono"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2.5 border border-border text-[11px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Saved securely in your browser session. Never committed to git.</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear Key
          </button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              className="font-bold shadow-md shadow-primary/20"
            >
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  Saved
                </>
              ) : (
                "Save API Key"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
