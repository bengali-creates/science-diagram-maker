import { NextRequest, NextResponse } from "next/server";
import { getDiagramService } from "@/lib/services/diagram-service";
import { GenerationRequest, Subject } from "@/types";

export const maxDuration = 60; // Allow sufficient time for generation & retries

export async function POST(req: NextRequest) {
  try {
    const body: GenerationRequest = await req.json();

    if (!body.promptText || !body.conceptName || !body.subject) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: promptText, conceptName, or subject.",
        },
        { status: 400 }
      );
    }

    const validSubjects: Subject[] = ["Maths", "Physics", "Biology", "Chemistry"];
    if (!validSubjects.includes(body.subject)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid subject: ${body.subject}. Expected one of: ${validSubjects.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Retrieve active diagram service (Native or LangGraph microservice)
    const diagramService = getDiagramService();

    const executionLog = await diagramService.generateDiagram({
      conceptId: body.conceptId,
      conceptName: body.conceptName,
      subject: body.subject,
      promptText: body.promptText,
      apiKey: body.apiKey,
      modelName: body.model,
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
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
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
      { status: statusCode }
    );
  }
}
