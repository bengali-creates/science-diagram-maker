import {
  GenerateOptions,
  GenerationExecutionLog,
  generateScienceDiagram,
} from "@/lib/gemini";

export interface IDiagramService {
  name: string;
  generateDiagram(options: GenerateOptions): Promise<GenerationExecutionLog>;
}

export class NativeDiagramService implements IDiagramService {
  name = "Native In-House Engine (Gemini Flash + SvgValidator)";

  async generateDiagram(
    options: GenerateOptions,
  ): Promise<GenerationExecutionLog> {
    return generateScienceDiagram(options);
  }
}

export class LangGraphMicroserviceClient implements IDiagramService {
  name = "LangGraph / LangChain Microservice";
  private serviceUrl: string;

  constructor(serviceUrl?: string) {
    this.serviceUrl =
      serviceUrl ||
      process.env.LANGGRAPH_SERVICE_URL ||
      "http://localhost:8000/api/v1/generate-diagram";
  }

  async generateDiagram(
    options: GenerateOptions,
  ): Promise<GenerationExecutionLog> {
    try {
      const response = await fetch(this.serviceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.apiKey
            ? { Authorization: `Bearer ${options.apiKey}` }
            : {}),
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
          `LangGraph Microservice returned HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data as GenerationExecutionLog;
    } catch (error: unknown) {
      console.warn(
        `[LangGraphMicroserviceClient] Microservice call failed: ${error instanceof Error ? error.message : String(error)}. Falling back to Native Engine.`,
      );
      const fallbackNative = new NativeDiagramService();
      return fallbackNative.generateDiagram(options);
    }
  }
}

export function getDiagramService(): IDiagramService {
  const useLangGraph = process.env.USE_LANGGRAPH_MICROSERVICE === "true";

  if (useLangGraph) {
    return new LangGraphMicroserviceClient();
  }

  return new NativeDiagramService();
}
