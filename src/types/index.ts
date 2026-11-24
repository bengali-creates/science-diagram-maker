export type Subject = "Maths" | "Physics" | "Biology" | "Chemistry";

export interface ConceptDefinition {
  id: number;
  slug: string;
  concept: string;
  subject: Subject;
  promptText: string;
}

export interface ValidationCheck {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  details?: string;
}

export interface RetryLogItem {
  attemptNumber: number;
  trigger: "auto_validation" | "manual_reviewer";
  timestamp: string;
  feedback: string[];
  userCritique?: string;
  checksPassed: boolean;
  failedCheckNames?: string[];
  costUSD?: number;
}

export interface DiagramResult {
  id: number;
  concept: string;
  subject: Subject;
  promptText: string;
  svg: string;
  checks: {
    xmlValid: boolean;
    viewBoxContained: boolean;
    hasTitleAndLabels: boolean;
    hasAnimation: boolean;
    customSemanticRichness: boolean;
    noOverlappingLabels?: boolean;
  };
  checkDetails: ValidationCheck[];
  allChecksPassed: boolean;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD: number;
  retryCount: number;
  retryHistory?: RetryLogItem[];
  lastFeedback?: string;
  timestamp: string;
}

export interface ReviewState {
  status: "pending" | "approved" | "rejected";
  note: string;
  updatedAt?: string;
}

export interface GenerationRequest {
  conceptId?: number;
  conceptName?: string;
  subject?: Subject;
  promptText: string;
  apiKey?: string;
  model?: string;
  userFeedback?: string;
  previousSvg?: string;
  stream?: boolean;
}

export interface GenerationResponse {
  success: boolean;
  result?: DiagramResult;
  error?: string;
  retriesAttempted?: number;
  apiRetries?: number;
  validationRetries?: number;
}
