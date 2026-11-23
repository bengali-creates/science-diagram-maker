import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { GEMINI_FLASH_INPUT_COST_PER_TOKEN, GEMINI_FLASH_OUTPUT_COST_PER_TOKEN } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateCost(inputTokens: number, outputTokens: number): number {
  const cost =
    inputTokens * GEMINI_FLASH_INPUT_COST_PER_TOKEN +
    outputTokens * GEMINI_FLASH_OUTPUT_COST_PER_TOKEN;
  return Number(cost.toFixed(6));
}

export function formatCost(costUSD: number): string {
  if (costUSD === 0) return "$0.000000 (Free)";
  return `$${costUSD.toFixed(6)}`;
}

export function getSubjectColor(subject: string): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  switch (subject) {
    case "Maths":
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-500 dark:text-blue-400",
        border: "border-blue-500/20",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      };
    case "Physics":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-500 dark:text-amber-400",
        border: "border-amber-500/20",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    case "Biology":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-500 dark:text-emerald-400",
        border: "border-emerald-500/20",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    case "Chemistry":
      return {
        bg: "bg-purple-500/10",
        text: "text-purple-500 dark:text-purple-400",
        border: "border-purple-500/20",
        badge: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      };
    default:
      return {
        bg: "bg-zinc-500/10",
        text: "text-zinc-500 dark:text-zinc-400",
        border: "border-zinc-500/20",
        badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
      };
  }
}
