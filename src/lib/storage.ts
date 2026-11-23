import { ReviewState } from "@/types";

const STORAGE_PREFIX = "udhi_science_reviews_v1";

export function loadAllReviews(): Record<number, ReviewState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load reviews from localStorage:", err);
    return {};
  }
}

export function saveReview(conceptId: number, review: ReviewState): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadAllReviews();
    current[conceptId] = {
      ...review,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_PREFIX, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to save review to localStorage:", err);
  }
}

export function clearAllReviews(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_PREFIX);
  } catch (err) {
    console.error("Failed to clear reviews from localStorage:", err);
  }
}

export function exportReviewsJson(): string {
  if (typeof window === "undefined") return "{}";
  const current = loadAllReviews();
  return JSON.stringify(current, null, 2);
}
