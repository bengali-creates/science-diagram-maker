import { GenerateOptions, GenerationExecutionLog, generateScienceDiagram } from "@/lib/gemini";

/**
 * Common interface for diagram generation services.
 * Allows transparent switching between the in-house native Gemini pipeline
 * and an external LangGraph / LangChain microservice.
 */
export interface IDiagramService {
  name: string;
  generateDiagram(options: GenerateOptions): Promise<GenerationExecutionLog>;
}

/**
 * 1. Native In-House Generation Service
 * Calls Google Gemini directly with exponential backoff, AST validation,
 * and 1-time automated feedback retry.
 */
export class NativeDiagramService implements IDiagramService {
  name = "Native In-House Engine (Gemini Flash + SvgValidator)";

  async generateDiagram(options: GenerateOptions): Promise<GenerationExecutionLog> {
    return generateScienceDiagram(options);
  }
}

/**
 * 2. LangGraph / LangChain Microservice Adapter
 * Pre-configured HTTP client ready to dispatch requests to an external
 * LangGraph agent or FastAPI orchestration microservice.
 */
export class LangGraphMicroserviceClient implements IDiagramService {
  name = "LangGraph / LangChain Microservice";
  private serviceUrl: string;

  constructor(serviceUrl?: string) {
    this.serviceUrl =
      serviceUrl ||
      process.env.LANGGRAPH_SERVICE_URL ||
      "http://localhost:8000/api/v1/generate-diagram";
  }

  async generateDiagram(options: GenerateOptions): Promise<GenerationExecutionLog> {
    try {
      const response = await fetch(this.serviceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        },
        body: JSON.stringify({
          concept_name: options.conceptName,
          subject: options.subject,
          prompt_text: options.promptText,
          model_name: options.modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `LangGraph Microservice returned HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data as GenerationExecutionLog;
    } catch (error: unknown) {
      console.warn(
        `[LangGraphMicroserviceClient] Microservice call failed: ${error instanceof Error ? error.message : String(error)}. Falling back to Native Engine.`
      );
      // Resilient fallback to native in-house engine if microservice is offline
      const fallbackNative = new NativeDiagramService();
      return fallbackNative.generateDiagram(options);
    }
  }
}

/**
 * Factory function to retrieve the active diagram generation engine.
 * Switch to LangGraph microservice anytime via:
 * USE_LANGGRAPH_MICROSERVICE=true
 * LANGGRAPH_SERVICE_URL=https://your-langgraph-service.com/generate
 */
export function getDiagramService(): IDiagramService {
  const useLangGraph = process.env.USE_LANGGRAPH_MICROSERVICE === "true";

  if (useLangGraph) {
    return new LangGraphMicroserviceClient();
  }

  return new NativeDiagramService();
}
