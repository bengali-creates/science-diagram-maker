import { GoogleGenerativeAI } from "@google/generative-ai";
import { DiagramResult, Subject } from "@/types";
import { validateSvg } from "./svg-validator";
import { DEFAULT_MODEL } from "./constants";
import { calculateCost } from "./utils";

export interface StatusEvent {
  type: "step" | "chunk" | "retry" | "model_fallback" | "validation" | "done" | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface GenerateOptions {
  conceptId?: number;
  conceptName: string;
  subject: Subject;
  promptText: string;
  apiKey?: string;
  modelName?: string;
  userFeedback?: string; // Human reviewer critique
  previousSvg?: string;  // SVG to be corrected
  maxRetries?: number;   // Maximum automated validation retries (defaults to 5)
  onStream?: (chunk: string) => void;
  onStatus?: (status: StatusEvent) => void;
}

export interface GenerationExecutionLog {
  result: DiagramResult;
  apiRetries: number;
  validationRetries: number;
  errorsLogged: string[];
  modelUsed?: string;
  modelSwitched?: boolean;
}


function sleepWithJitter(baseDelayMs: number): Promise<void> {
  const jitter = Math.random() * 500;
  return new Promise((resolve) => setTimeout(resolve, baseDelayMs + jitter));
}


function getAlternativeModel(currentModel: string): string {
  if (currentModel.includes("flash-lite")) {
    return "gemini-3.5-flash";
  }
  return "gemini-3.5-flash-lite";
}


function isRateLimitOrOverload(errorMsg: string): boolean {
  const lower = errorMsg.toLowerCase();
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("503") ||
    lower.includes("resource exhausted") ||
    lower.includes("quota") ||
    lower.includes("overloaded") ||
    lower.includes("high demand") ||
    lower.includes("unavailable") ||
    lower.includes("failed to parse stream") ||
    lower.includes("fetch failed") ||
    lower.includes("stream") ||
    lower.includes("socket") ||
    lower.includes("econnreset")
  );
}


async function callGeminiWithStreamingAndFallback(
  genAI: GoogleGenerativeAI,
  primaryModel: string,
  fullPrompt: string,
  callbacks?: {
    onStream?: (chunk: string) => void;
    onStatus?: (status: StatusEvent) => void;
  }
): Promise<{
  text: string;
  inputTokens: number;
  outputTokens: number;
  apiRetries: number;
  modelUsed: string;
  modelSwitched: boolean;
}> {
  const modelsToTry = [primaryModel, getAlternativeModel(primaryModel)];
  let totalApiRetries = 0;
  let lastError: Error | null = null;

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const currentModel = modelsToTry[mIdx];
    const isFallbackAttempt = mIdx > 0;

    if (isFallbackAttempt) {
      callbacks?.onStatus?.({
        type: "model_fallback",
        message: `Primary model ${primaryModel} reached rate limits / high demand (503/429). Automatically switching to ${currentModel}...`,
        data: { fromModel: primaryModel, toModel: currentModel },
      });
      console.warn(
        `[Gemini Fallback] Switching from ${primaryModel} to ${currentModel} due to 429/503 limits.`
      );
    }

    let attempt = 0;
    const maxAttemptsForThisModel = isFallbackAttempt ? 1 : 1; // On 503/429, fall back promptly to the alternate model
    let delay = 1500;

    while (attempt <= maxAttemptsForThisModel) {
      try {
        const model = genAI.getGenerativeModel({
          model: currentModel,
          generationConfig: {
            temperature: 0.2, // Low temperature for deterministic code output
            maxOutputTokens: 2500, // Capped tokens prevents 70s generation latency and keeps SVGs concise
          },
        });

        // Direct generateContent call: immune to SDK SSE stream parser crashes and unhandledRejections on Vercel
        const response = await model.generateContent(fullPrompt);
        const candidates = response.response;
        const text = candidates.text();

        // Deliver text in chunks to client so the browser live terminal renders smooth real-time typing
        if (callbacks?.onStream) {
          const chunkSize = 75;
          for (let i = 0; i < text.length; i += chunkSize) {
            callbacks.onStream(text.slice(i, i + chunkSize));
          }
        }

        const usage = candidates.usageMetadata || {
          promptTokenCount: Math.ceil(fullPrompt.length / 4),
          candidatesTokenCount: Math.ceil(text.length / 4),
          totalTokenCount: Math.ceil((fullPrompt.length + text.length) / 4),
        };

        return {
          text,
          inputTokens: usage.promptTokenCount || 0,
          outputTokens: usage.candidatesTokenCount || 0,
          apiRetries: totalApiRetries,
          modelUsed: currentModel,
          modelSwitched: isFallbackAttempt,
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        lastError = err instanceof Error ? err : new Error(errorMsg);

        if (isRateLimitOrOverload(errorMsg)) {
          totalApiRetries++;
          attempt++;
          if (attempt <= maxAttemptsForThisModel && !isFallbackAttempt) {
            callbacks?.onStatus?.({
              type: "step",
              message: `[${currentModel}] 503 High Demand encountered. Retrying in ${delay / 1000}s...`,
            });
            console.warn(
              `[Gemini API] Received 429/503 on ${currentModel}. Retrying in ${delay}ms...`,
              errorMsg
            );
            await sleepWithJitter(delay);
            delay *= 2;
            continue;
          } else {
            console.warn(
              `[Gemini API] Switching away from ${currentModel} to alternate model due to demand spike.`
            );
            break;
          }
        } else {
          throw lastError;
        }
      }
    }
  }
  const finalError = new Error(
    `Gemini rate limit or high demand reached on models [${modelsToTry.join(", ")}]. ` +
    `Spikes in demand are temporary. Please enter your own Gemini API key or retry in a few moments.`
  );
  (finalError as unknown as { isRateLimit: boolean }).isRateLimit = true;
  throw finalError;
}


async function callGeminiWithBackoff(
  genAI: GoogleGenerativeAI,
  modelName: string,
  fullPrompt: string,
  _maxApiRetries = 3
): Promise<{ text: string; inputTokens: number; outputTokens: number; apiRetries: number; modelUsed: string; modelSwitched: boolean }> {
  return callGeminiWithStreamingAndFallback(genAI, modelName, fullPrompt);
}


function buildInitialPrompt(concept: string, subject: string, promptText: string): string {
  return `You are an expert UK GCSE Science teacher and master SVG designer for Udhi Technologies.
Create a high-quality, scientifically accurate, animated SVG diagram explaining the following GCSE ${subject} concept:

CONCEPT: ${concept}
CURRICULUM TEXT: "${promptText}"

CRITICAL DESIGN & QUALITY SPECIFICATIONS:
1. OUTPUT FORMAT:
   - Return ONLY standalone raw SVG code starting with <svg> and ending with </svg>.
   - No markdown fences (\`\`\`), no explanations, no HTML wrappers.
   - Root tag: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">.

2. ACTIVE SCIENTIFIC ANIMATION (MANDATORY & VISIBLE):
   - You MUST include visible, continuous motion directly illustrating the scientific concept.
   - For Pythagoras: Smooth pulsing glow/highlight on hypotenuse and squares illustrating a² + b² = c² (using SMIL <animate> or CSS @keyframes with 'infinite' loop).
   - For Series Circuit: Continuous moving electron dots flowing along the series loop wire.
   - For Photosynthesis: Animated energy transfer (sunlight rays pulsing, CO2/H2O arrows, glucose/O2 flow).
   - For States of Matter: Particles visibly vibrating in solid, sliding in liquid, and rapidly bouncing in gas.
   - For Circle: Animated drawing of circumference or sweeping radius vector.
   - All animations MUST loop indefinitely (repeatCount="indefinite" in SMIL or "infinite" in CSS).

3. ZERO COLLISION & CLEAR SPACING ARCHITECTURE (STRICTLY CHECKED):
   - Text labels MUST NEVER overlap shapes, lines, or other labels!
   - NEVER place text directly on top of line strokes, triangle edges, or square borders.
   - Place labels either:
     a) Inside dedicated white or pill cards (<rect rx="8" fill="#ffffff" stroke="#e2e8f0" />).
     b) Or outside the geometry with clear 25px+ clearance and optional clean pointer lines.
   - Keep all elements safely within viewBox margins (x: 25 to 775, y: 25 to 575).

4. EDUCATIONAL LABELS & VISUAL RICHNESS:
   - Must include <title>${concept}</title>.
   - Must include AT LEAST 4 distinct educational <text> labels explaining specific scientific components with high color contrast (font-family="system-ui, -apple-system, sans-serif").
   - Include a clear title banner at the top and key formula/fact box.

Generate the clean animated SVG now:`;
}


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
4. Ensure at least 4 descriptive <text> labels and active looping SMIL/CSS motion.`;
}


function summarizeValidationErrors(feedbackItems: string[]): string {
  if (feedbackItems.length === 0) {
    return "Fix any clipping, overlapping text or missing animation.";
  }

  const summaries: string[] = [];
  const collisionIssues = feedbackItems.filter(
    (f) => f.includes("collide") || f.includes("overlap") || f.includes("cuts across") || f.includes("intersects")
  );
  if (collisionIssues.length > 0) {
    const labels = Array.from(new Set(
      collisionIssues
        .map((f) => {
          const m = f.match(/"([^"]+)"/);
          return m ? `"${m[1]}"` : null;
        })
        .filter(Boolean)
    ));
    const target = labels.length > 0 ? ` on ${labels.join(", ")}` : "";
    summaries.push(`[COLLISIONS]: Resolve label/stroke overlaps${target}. Place text in white pill cards (<rect rx="6" fill="#ffffff" />) with 25px clearance.`);
  }
  const boundsIssues = feedbackItems.filter(
    (f) => f.includes("viewBox") || f.includes("out of bounds") || f.includes("outside")
  );
  if (boundsIssues.length > 0) {
    summaries.push("[BOUNDS]: Keep all coordinates strictly inside x: 25-775, y: 25-575.");
  }
  const contrastIssues = feedbackItems.filter((f) => f.includes("contrast") || f.includes("legibility"));
  if (contrastIssues.length > 0) {
    summaries.push("[CONTRAST]: Ensure high text contrast: dark text #0f172a on light cards, white text #ffffff on dark backgrounds.");
  }
  const animIssues = feedbackItems.filter((f) => f.includes("animation") || f.includes("motion") || f.includes("SMIL"));
  if (animIssues.length > 0) {
    summaries.push("[ANIMATION]: Include active continuous motion (repeatCount='indefinite' in SMIL or CSS animation: ... infinite).");
  }
  const labelIssues = feedbackItems.filter((f) => f.includes("title") || (f.includes("label") && !f.includes("collide")));
  if (labelIssues.length > 0) {
    summaries.push("[LABELS]: Must include <title> and at least 4 clear <text> labels explaining key scientific terms.");
  }
  if (summaries.length === 0) {
    summaries.push(...feedbackItems.slice(0, 3));
  }
  return summaries.slice(0, 4).map((s, idx) => `${idx + 1}. ${s}`).join("\n");
}


function buildRetryPrompt(
  concept: string,
  subject: string,
  promptText: string,
  compactErrorSummary: string,
  retryAttempt: number,
  maxAttempts: number,
  previousSvg?: string
): string {
  return `Retry attempt #${retryAttempt} of ${maxAttempts} for "${concept}" (${subject}).
CURRICULUM: "${promptText}"

BATCH DEFECTS TO SOLVE (SOLVE ALL SIMULTANEOUSLY IN THIS PASS):
${compactErrorSummary}

${
  previousSvg
    ? `PREVIOUS SVG CODE TO FIX & REFINE:
${previousSvg.slice(0, 2200)}
`
    : ""
}
BATCH REVISION RULES:
1. Return ONLY the raw revised valid <svg> code from <svg> to </svg>. No markdown backticks, no conversational text.
2. Directly solve the batch of defects above:
   - For [COLLISIONS]: Shift overlapping labels, pill cards, or lines by 25px+ so they have clean separation.
   - For [CONTRAST]: If text is on a dark card or dark background, use pure white fill="#ffffff". If on a light pill card, use dark fill="#0f172a".
   - For [BOUNDS]: Keep all coordinates safely inside x: 25-775, y: 25-575.
3. Keep the overall diagram design and scientific layout, but adjust the specific colliding coordinates and contrast fills.
4. Retain and enhance active continuous scientific animation (repeatCount='indefinite' in SMIL or CSS animation infinite).`;
}


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

  options.onStatus?.({
    type: "step",
    message: isHumanRetry
      ? `Processing reviewer feedback for "${options.conceptName}"...`
      : `Connecting to ${modelName} for "${options.conceptName}"...`,
  });

  let effectiveModel = modelName;
  let modelSwitchedAcrossAttempts = false;

  const initialResponse = await callGeminiWithStreamingAndFallback(
    genAI,
    modelName,
    primaryPrompt,
    {
      onStream: options.onStream,
      onStatus: options.onStatus,
    }
  );

  effectiveModel = initialResponse.modelUsed;
  modelSwitchedAcrossAttempts = initialResponse.modelSwitched;
  totalInputTokens += initialResponse.inputTokens;
  totalOutputTokens += initialResponse.outputTokens;
  totalApiRetries += initialResponse.apiRetries;
  let currentSvg = initialResponse.text;
  let validation = validateSvg(currentSvg);

  options.onStatus?.({
    type: "validation",
    message: validation.isValid
      ? "All 6 automated checks passed on initial generation!"
      : `Initial checks: ${validation.checkDetails.filter((c) => c.passed).length}/6 passed.`,
    data: {
      passed: validation.isValid,
      checkDetails: validation.checkDetails,
    },
  });
  // Auto-retries per serverless invocation: capped at 2 to stay comfortably within Vercel's serverless timeout window
  const maxValidationRetries = Math.min(options.maxRetries ?? 2, 2);
  while (validationRetries < maxValidationRetries && !validation.isValid) {
    validationRetries++;
    const compactSummary = summarizeValidationErrors(validation.feedbackForRetry);
    errorsLogged.push(compactSummary);

    options.onStatus?.({
      type: "retry",
      message: `[Auto-Retry ${validationRetries}/${maxValidationRetries}] Solving batch of ${validation.feedbackForRetry.length} validation issues...`,
      data: { summary: compactSummary, attempt: validationRetries, maxAttempts: maxValidationRetries },
    });

    console.warn(
      `[Auto-Retry ${validationRetries}/${maxValidationRetries}] Concept "${options.conceptName}":`,
      compactSummary
    );

    retryHistory.push({
      attemptNumber: retryHistory.length + 1,
      trigger: "auto_validation",
      timestamp: new Date().toISOString(),
      feedback: [compactSummary],
      checksPassed: false,
      failedCheckNames: validation.checkDetails.filter((c) => !c.passed).map((c) => c.name),
    });

    const retryPrompt = buildRetryPrompt(
      options.conceptName,
      options.subject,
      options.promptText,
      compactSummary,
      validationRetries,
      maxValidationRetries,
      currentSvg
    );

    try {
      const retryResponse = await callGeminiWithStreamingAndFallback(
        genAI,
        effectiveModel,
        retryPrompt,
        {
          onStream: options.onStream,
          onStatus: options.onStatus,
        }
      );

      if (retryResponse.modelSwitched) {
        effectiveModel = retryResponse.modelUsed;
        modelSwitchedAcrossAttempts = true;
      }

      totalInputTokens += retryResponse.inputTokens;
      totalOutputTokens += retryResponse.outputTokens;
      totalApiRetries += retryResponse.apiRetries;

      currentSvg = retryResponse.text;
      const retryValidation = validateSvg(currentSvg);
      validation = retryValidation;

      options.onStatus?.({
        type: "validation",
        message: retryValidation.isValid
          ? `All 6 checks passed on retry #${validationRetries}!`
          : `Retry #${validationRetries} checks: ${retryValidation.checkDetails.filter((c) => c.passed).length}/6 passed.`,
        data: {
          passed: retryValidation.isValid,
          checkDetails: retryValidation.checkDetails,
        },
      });

      if (retryValidation.isValid) {
        retryHistory.push({
          attemptNumber: retryHistory.length + 1,
          trigger: "auto_validation",
          timestamp: new Date().toISOString(),
          feedback: ["All 6 automated checks passed successfully on auto-retry."],
          checksPassed: true,
        });
        break;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errorsLogged.push(`Retry attempt #${validationRetries} failed: ${msg}`);
      break;
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
    model: effectiveModel,
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
    modelUsed: effectiveModel,
    modelSwitched: modelSwitchedAcrossAttempts,
  };
}
