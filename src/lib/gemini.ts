import { GoogleGenerativeAI } from "@google/generative-ai";
import { DiagramResult, Subject } from "@/types";
import { validateSvg } from "./svg-validator";
import { DEFAULT_MODEL } from "./constants";
import { calculateCost } from "./utils";

export interface GenerateOptions {
  conceptId?: number;
  conceptName: string;
  subject: Subject;
  promptText: string;
  apiKey?: string;
  modelName?: string;
  userFeedback?: string; // Human reviewer critique
  previousSvg?: string;  // SVG to be corrected
}

export interface GenerationExecutionLog {
  result: DiagramResult;
  apiRetries: number;
  validationRetries: number;
  errorsLogged: string[];
}

/**
 * Utility to sleep with jitter for exponential backoff
 */
function sleepWithJitter(baseDelayMs: number): Promise<void> {
  const jitter = Math.random() * 500;
  return new Promise((resolve) => setTimeout(resolve, baseDelayMs + jitter));
}

/**
 * Calls Gemini model with automatic exponential backoff on 429/503 errors (up to 3 times)
 */
async function callGeminiWithBackoff(
  genAI: GoogleGenerativeAI,
  modelName: string,
  fullPrompt: string,
  maxApiRetries = 3
): Promise<{ text: string; inputTokens: number; outputTokens: number; apiRetries: number }> {
  let attempt = 0;
  let delay = 2000;

  while (attempt <= maxApiRetries) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2, // Low temperature for deterministic code output
        },
      });

      const response = await model.generateContent(fullPrompt);
      const candidates = response.response;
      const text = candidates.text();

      const usage = candidates.usageMetadata || {
        promptTokenCount: Math.ceil(fullPrompt.length / 4),
        candidatesTokenCount: Math.ceil(text.length / 4),
        totalTokenCount: Math.ceil((fullPrompt.length + text.length) / 4),
      };

      return {
        text,
        inputTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
        apiRetries: attempt,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isRateLimitOrUnavailable =
        errorMsg.includes("429") ||
        errorMsg.includes("503") ||
        errorMsg.toLowerCase().includes("resource exhausted") ||
        errorMsg.toLowerCase().includes("quota") ||
        errorMsg.toLowerCase().includes("overloaded");

      if (isRateLimitOrUnavailable && attempt < maxApiRetries) {
        attempt++;
        console.warn(
          `[Gemini API] Received 429/503 error on attempt ${attempt}. Waiting ${delay}ms before retry...`,
          errorMsg
        );
        await sleepWithJitter(delay);
        delay *= 2; // Exponential backoff: 2s -> 4s -> 8s
      } else {
        throw new Error(`Gemini API Error after ${attempt} retries: ${errorMsg}`);
      }
    }
  }

  throw new Error(`Failed to generate content after ${maxApiRetries} API retries.`);
}

/**
 * Builds the initial prompt for GCSE animated science diagrams
 */
function buildInitialPrompt(concept: string, subject: string, promptText: string): string {
  return `You are an expert UK GCSE Science teacher and master SVG designer for Udhi Technologies.
Create a high-quality, scientifically accurate, animated SVG diagram explaining the following GCSE ${subject} concept:

CONCEPT: ${concept}
CURRICULUM TEXT: "${promptText}"

REQUIREMENTS:
1. Return ONLY the raw SVG code. No markdown backticks, no explanations, no wrappers.
2. The <svg> tag MUST have: viewBox="0 0 800 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg".
3. Title & Labels:
   - Must include an explicit <title>${concept}</title> tag.
   - Must include AT LEAST 3 distinct <text> labels explaining specific scientific parts of the diagram (font-family="system-ui, sans-serif", font-size="14" to "18", clean contrast).
4. Motion & Animation:
   - Must include AT LEAST ONE clear animation (using SMIL <animate>, <animateTransform>, or CSS <style> @keyframes) showing movement, flow, or energy transfer appropriate for the scientific concept.
5. Geometry & Boundary:
   - Must contain at least 3 vector graphic shape elements (<path>, <circle>, <rect>, <polygon>, or <line>).
   - ALL elements, coordinates, and labels MUST stay strictly within the viewBox bounds (0 0 800 600). Do not place anything outside!
6. Palette:
   - Use clean, modern educational colors with subtle strokes and gradients suited for students. Include a clean subtle background rect or transparent canvas.

Generate the standalone SVG code now:`;
}

/**
 * Builds prompt for human-directed manual retry with specific reviewer instructions
 */
function buildHumanRetryPrompt(
  concept: string,
  subject: string,
  promptText: string,
  previousSvg: string | undefined,
  userFeedback: string
): string {
  return `You are an expert UK GCSE Science teacher and master SVG designer.
A human curriculum reviewer inspected your previous animated SVG diagram for "${concept}" (${subject}) and provided feedback to resolve.

HUMAN REVIEWER INSTRUCTIONS:
"${userFeedback}"

ORIGINAL CURRICULUM TEXT:
"${promptText}"

${previousSvg ? `PREVIOUS SVG TO REVISE:\n${previousSvg.slice(0, 1500)}...` : ""}

REVISE AND FIX:
1. Return ONLY the raw SVG code starting with <svg> and ending with </svg>. No markdown backticks.
2. Directly solve the reviewer's instructions: ensure all labels, shapes, and texts have clean clearance with ZERO collisions or overlaps.
3. Keep viewBox="0 0 800 600" width="100%" height="100%".
4. Ensure at least 3 descriptive <text> labels and active SMIL/CSS motion.`;
}

/**
 * Builds the retry prompt providing targeted validation feedback
 */
function buildRetryPrompt(
  concept: string,
  subject: string,
  promptText: string,
  previousSvg: string,
  feedbackItems: string[]
): string {
  return `Your previous SVG diagram for "${concept}" (${subject}) failed automated quality checks.

ERRORS DETECTED:
${feedbackItems.map((f, i) => `${i + 1}. ${f}`).join("\n")}

ORIGINAL INSTRUCTION:
"${promptText}"

Please regenerate the COMPLETE, corrected SVG code fixing every issue above.
Remember:
- Return ONLY the raw SVG starting with <svg> and ending with </svg>.
- Ensure viewBox="0 0 800 600".
- Must include <title> and at least 3 descriptive <text> labels.
- Must have at least one active SMIL or CSS @keyframes animation.
- All coordinates must remain strictly inside (0, 0, 800, 600).
- ZERO element collisions: no overlapping labels or clipping shapes!`;
}

/**
 * Generates an animated science diagram with automated validation & retry on failure
 */
export async function generateScienceDiagram(
  options: GenerateOptions
): Promise<GenerationExecutionLog> {
  const apiKey =
    options.apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please set it in .env.local or provide it in the request."
    );
  }

  const modelName =
    options.modelName || process.env.NEXT_PUBLIC_GEMINI_MODEL || DEFAULT_MODEL;
  const genAI = new GoogleGenerativeAI(apiKey);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalApiRetries = 0;
  let validationRetries = 0;
  const errorsLogged: string[] = [];
  const retryHistory: DiagramResult["retryHistory"] = [];

  // Determine prompt: Human reviewer retry OR Initial prompt
  const isHumanRetry = Boolean(options.userFeedback && options.userFeedback.trim());
  const primaryPrompt = isHumanRetry
    ? buildHumanRetryPrompt(
        options.conceptName,
        options.subject,
        options.promptText,
        options.previousSvg,
        options.userFeedback!
      )
    : buildInitialPrompt(
        options.conceptName,
        options.subject,
        options.promptText
      );

  if (isHumanRetry) {
    retryHistory.push({
      attemptNumber: 1,
      trigger: "manual_reviewer",
      timestamp: new Date().toISOString(),
      feedback: [options.userFeedback!],
      userCritique: options.userFeedback!,
      checksPassed: false,
    });
  }

  const initialResponse = await callGeminiWithBackoff(
    genAI,
    modelName,
    primaryPrompt
  );

  totalInputTokens += initialResponse.inputTokens;
  totalOutputTokens += initialResponse.outputTokens;
  totalApiRetries += initialResponse.apiRetries;

  // Validate SVG
  let validation = validateSvg(initialResponse.text);

  // If validation failed, auto-retry once with targeted feedback
  if (!validation.isValid) {
    validationRetries = 1;
    errorsLogged.push(...validation.feedbackForRetry);
    console.warn(
      `[Validation Failed] Concept "${options.conceptName}". Auto-retrying once with feedback:`,
      validation.feedbackForRetry
    );

    retryHistory.push({
      attemptNumber: retryHistory.length + 1,
      trigger: "auto_validation",
      timestamp: new Date().toISOString(),
      feedback: validation.feedbackForRetry,
      checksPassed: false,
      failedCheckNames: validation.checkDetails.filter((c) => !c.passed).map((c) => c.name),
    });

    const retryPrompt = buildRetryPrompt(
      options.conceptName,
      options.subject,
      options.promptText,
      initialResponse.text,
      validation.feedbackForRetry
    );

    try {
      const retryResponse = await callGeminiWithBackoff(
        genAI,
        modelName,
        retryPrompt
      );

      totalInputTokens += retryResponse.inputTokens;
      totalOutputTokens += retryResponse.outputTokens;
      totalApiRetries += retryResponse.apiRetries;

      const retryValidation = validateSvg(retryResponse.text);
      validation = retryValidation;

      if (retryValidation.isValid) {
        retryHistory.push({
          attemptNumber: retryHistory.length + 1,
          trigger: "auto_validation",
          timestamp: new Date().toISOString(),
          feedback: ["All 6 checks passed successfully on auto-retry."],
          checksPassed: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errorsLogged.push(`Retry call failed: ${msg}`);
    }
  }

  const totalTokens = totalInputTokens + totalOutputTokens;
  const costUSD = calculateCost(totalInputTokens, totalOutputTokens);

  const result: DiagramResult = {
    id: options.conceptId || Date.now(),
    concept: options.conceptName,
    subject: options.subject,
    promptText: options.promptText,
    svg: validation.cleanSvg,
    checks: validation.checks,
    checkDetails: validation.checkDetails,
    allChecksPassed: validation.isValid,
    model: modelName,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    totalTokens,
    costUSD,
    retryCount: (isHumanRetry ? 1 : 0) + totalApiRetries + validationRetries,
    retryHistory,
    lastFeedback: isHumanRetry
      ? options.userFeedback
      : validation.feedbackForRetry.length > 0
      ? validation.feedbackForRetry.join("; ")
      : undefined,
    timestamp: new Date().toISOString(),
  };

  return {
    result,
    apiRetries: totalApiRetries,
    validationRetries,
    errorsLogged,
  };
}
