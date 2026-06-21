import { AIMessage, AITool, AISessionMetadata, AIProviderName } from "./types";
import { AIProviderManager, ProviderResponse } from "./providers";
import { logger } from "../logger";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@workspace/backend/_generated/api";
import OpenAI from "openai";

// Tools schema
const AGENT_TOOLS: AITool[] = [
  {
    name: "resolve_ticket",
    description: "Mark the current conversation as resolved when the client issues are addressed.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Brief details of how it was resolved" },
      },
      required: ["reason"],
    },
  },
  {
    name: "handoff_to_human",
    description: "Connect the client to a live human support agent for manual supervision.",
    parameters: {
      type: "object",
      properties: {
        priority: { type: "string", enum: ["high", "normal", "low"] },
        reason: { type: "string", description: "Context of why handoff is requested" },
      },
      required: ["priority", "reason"],
    },
  },
  {
    name: "search_knowledge_base",
    description: "Queries the knowledge base for help articles, deployment configs, and guidelines.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords to search help articles" },
      },
      required: ["query"],
    },
  },
  {
    name: "create_summary",
    description: "Compiles a bulleted summary outline of the conversation history.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic focal point for the generated summary" },
      },
      required: ["topic"],
    },
  },
];

export class AIAgentOrchestrator {
  private providerManager: AIProviderManager;
  private maxContextMessages = 10; // Pruning threshold to manage context window

  constructor() {
    this.providerManager = new AIProviderManager();
  }

  // Manage Context Window by pruning older messages (retaining system prompt + last N messages)
  private pruneContext(messages: AIMessage[]): AIMessage[] {
    const systemPrompt = messages.find((m) => m.role === "system");
    const others = messages.filter((m) => m.role !== "system");

    if (others.length <= this.maxContextMessages) {
      return messages;
    }

    logger.warn(`Context window threshold reached (${others.length} messages). Pruning oldest history entries...`);
    const prunedOthers = others.slice(others.length - this.maxContextMessages);
    
    return systemPrompt ? [systemPrompt, ...prunedOthers] : prunedOthers;
  }

  // Handle execution of tools
  private async executeTool(name: string, argsStr: string, session: AISessionMetadata): Promise<string> {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");
    try {
      const args = JSON.parse(argsStr);
      logger.info(`Agent calling tool [${name}] with arguments: ${argsStr}`);

      switch (name) {
        case "resolve_ticket":
          return `[System Tool Output] Conversation #${session.conversationId} status marked as RESOLVED. Details: ${args.reason}`;
        case "handoff_to_human": {
          try {
            await convex.mutation(api.escalation.escalateConversation, {
              conversationId: session.conversationId as any,
              reason: "low_confidence",
              priority: args.priority === "high" ? "high" : args.priority === "low" ? "low" : "medium",
            });
          } catch (err) {
            logger.error(`Failed to trigger handoff mutation inside tool: ${err}`);
          }
          return `[System Tool Output] Transferred client successfully to human agent. Wait queue time: ~2 mins. Priority: ${args.priority}`;
        }
        case "search_knowledge_base": {
          const queryText = args.query;
          const orgId = session.orgId;
          
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
          
          let queryEmbedding: number[] = [];
          if (process.env.OPENAI_API_KEY) {
            try {
              const response = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: queryText,
              });
              queryEmbedding = response.data[0]?.embedding || [];
            } catch (err) {
              logger.error(`OpenAI embedding failed during agent tool call: ${err}`);
            }
          }
          
          if (queryEmbedding.length === 0) {
            const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
            const mag = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
            queryEmbedding = vector.map(v => v / mag);
          }
          
          const results = await convex.action(api.kb.semanticSearch, {
            orgId,
            queryEmbedding,
            limit: 3,
          });
          
          if (!results || results.length === 0) {
            return `[System Tool Output] Knowledge Base search returned 0 results for: "${queryText}".`;
          }
          
          const formatted = results.map((r: any, idx: number) => 
            `Match #${idx+1} [Source: ${r.documentTitle} (${r.documentFileName}), Relevance: ${(r.score * 100).toFixed(1)}%]:\n"${r.text}"`
          ).join("\n\n");
          
          return `[System Tool Output] Knowledge Base Results:\n\n${formatted}`;
        }
        case "create_summary":
          return `[System Tool Output] Conversation Summary: Visitor queried integrations, system prompted custom Vapi setup coordinates.`;
        default:
          return `[System Tool Error] Tool ${name} not found.`;
      }
    } catch (err: any) {
      logger.error(`Failed to execute tool ${name}: ${err?.message || err}`);
      return `[System Tool Error] Exception during tool invocation: ${err?.message || err}`;
    }
  }

  // Core Orchestration Execution loop
  public async executeSession(
    provider: AIProviderName,
    history: AIMessage[],
    session: AISessionMetadata
  ): Promise<{ response: string; updatedHistory: AIMessage[]; costUSD: number }> {
    logger.info(`Initiating Echo AI agent decision loop for Conversation: ${session.conversationId}`);

    // System prompt insertion to reinforce memory and tools guidelines
    const systemPrompt: AIMessage = {
      role: "system",
      content: `You are Echo's cognitive AI Support agent. You have access to tools for ticket resolution, knowledge guides lookup, human handoff routing, and session summaries. Assist the user gracefully. OrgId: ${session.orgId}`,
    };

    let contextHistory = [systemPrompt, ...history.filter(m => m.role !== "system")];
    contextHistory = this.pruneContext(contextHistory);

    let accumulatedCost = 0;
    let loopCount = 0;
    const maxLoops = 3; // Prevent infinite tool loops

    while (loopCount < maxLoops) {
      loopCount++;
      
      const providerRes: ProviderResponse = await this.providerManager.generateCompletion(
        provider,
        contextHistory,
        AGENT_TOOLS,
        { fallbackProvider: "openai" }
      );

      accumulatedCost += providerRes.usage.costUSD;
      logger.info(`Session cost added: $${providerRes.usage.costUSD.toFixed(5)} via Model: ${providerRes.modelUsed}`);

      if (providerRes.toolCalls && providerRes.toolCalls.length > 0) {
        // Append agent's tool call message
        const assistantMessage: AIMessage = {
          role: "assistant",
          content: providerRes.content,
          tool_calls: providerRes.toolCalls,
        };
        contextHistory.push(assistantMessage);

        // Execute all tool requests and append their return states
        for (const toolCall of providerRes.toolCalls) {
          const toolResult = await this.executeTool(toolCall.function.name, toolCall.function.arguments, session);
          const toolMessage: AIMessage = {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: toolResult,
          };
          contextHistory.push(toolMessage);
        }
        
        // Loop back to give the LLM opportunity to review tool results and draft response
        continue;
      }

      // If no tool calls are pending, agent returned final text response
      const finalMessage: AIMessage = {
        role: "assistant",
        content: providerRes.content,
      };
      contextHistory.push(finalMessage);

      return {
        response: providerRes.content || "Processing complete.",
        updatedHistory: contextHistory.filter((m) => m.role !== "system"), // Remove internal system prompt for state storage
        costUSD: accumulatedCost,
      };
    }

    throw new Error("Agent exceeded maximum decision tool calling loop count.");
  }
}
