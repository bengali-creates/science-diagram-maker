import { NextRequest, NextResponse } from "next/server";
import { getDiagramService } from "@/lib/services/diagram-service";
import { generateScienceDiagram } from "@/lib/gemini";
import { GenerationRequest, Subject } from "@/types";

export const maxDuration = 180; // Allow sufficient time for live generation & verification retries

export async function POST(req: NextRequest) {
  try {
    const body: GenerationRequest = await req.json();

    if (!body.promptText || !body.conceptName || !body.subject) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: promptText, conceptName, or subject.",
        },
        { status: 400 },
      );
    }

    const validSubjects: Subject[] = [
      "Maths",
      "Physics",
      "Biology",
      "Chemistry",
    ];
    if (!validSubjects.includes(body.subject)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid subject: ${body.subject}. Expected one of: ${validSubjects.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const conceptName = body.conceptName;
    const subject = body.subject;
    const promptText = body.promptText;
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (data: Record<string, unknown>) => {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
              );
            } catch {}
          };

          try {
            send({
              type: "step",
              message: `Initializing live connection to Gemini (${body.model || "gemini-3.5-flash-lite"})...`,
            });

            const executionLog = await generateScienceDiagram({
              conceptId: body.conceptId,
              conceptName,
              subject,
              promptText,
              apiKey: body.apiKey,
              modelName: body.model,
              userFeedback: body.userFeedback,
              previousSvg: body.previousSvg,
              onStream: (chunk) => {
                send({ type: "chunk", text: chunk });
              },
              onStatus: (status) => {
                send(status as unknown as Record<string, unknown>);
              },
            });

            send({
              type: "done",
              success: true,
              result: executionLog.result,
              apiRetries: executionLog.apiRetries,
              validationRetries: executionLog.validationRetries,
              errorsLogged: executionLog.errorsLogged,
              modelUsed: executionLog.modelUsed,
              modelSwitched: executionLog.modelSwitched,
            });
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            const isRateLimit =
              Boolean((error as { isRateLimit?: boolean })?.isRateLimit) ||
              message.includes("429") ||
              message.includes("503") ||
              message.toLowerCase().includes("quota") ||
              message.toLowerCase().includes("resource exhausted") ||
              message.toLowerCase().includes("high demand") ||
              message.toLowerCase().includes("overloaded");

            const currentModel = body.model || "gemini-3.5-flash-lite";
            const fallbackModel = currentModel.includes("flash-lite")
              ? "gemini-3.5-flash"
              : "gemini-3.5-flash-lite";

            send({
              type: "error",
              error: message,
              isRateLimit,
              modelUsed: currentModel,
              fallbackModel,
            });
          } finally {
            try {
              controller.close();
            } catch {}
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }
    const diagramService = getDiagramService();

    const executionLog = await diagramService.generateDiagram({
      conceptId: body.conceptId,
      conceptName,
      subject,
      promptText,
      apiKey: body.apiKey,
      modelName: body.model,
      userFeedback: body.userFeedback,
      previousSvg: body.previousSvg,
    });

    return NextResponse.json({
      success: true,
      serviceUsed: diagramService.name,
      result: executionLog.result,
      apiRetries: executionLog.apiRetries,
      validationRetries: executionLog.validationRetries,
      errorsLogged: executionLog.errorsLogged,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    console.error("[API Generate Error]:", message);

    const is429 =
      message.includes("429") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("resource exhausted");
    const statusCode = is429 ? 429 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
        isRateLimit: is429,
        troubleshooting: is429
          ? "Gemini API free tier rate limit reached. Please wait ~60 seconds before trying again, or use your own API key."
          : "Please check your network and API key configuration.",
      },
      { status: statusCode },
    );
  }
}
