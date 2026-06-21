import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Provider-independent interface
interface LLMProvider {
  name: "openai" | "anthropic";
  chatCompletions: (params: any) => Promise<any>;
  toolsSchema: (tools: any[]) => any[];
}

class OpenAIProvider implements LLMProvider {
  name: "openai" = "openai";

  constructor(apiKey: string) {}

  toolsSchema(tools: any[]): any[] {
    return tools;
  }

  async chatCompletions(params: any): Promise<any> {
    return { choices: [] };
  }
}

class AnthropicProvider implements LLMProvider {
  name: "anthropic" = "anthropic";

  constructor(apiKey: string) {}

  toolsSchema(tools: any[]): any[] {
    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));
  }

  async chatCompletions(params: any): Promise<any> {
    return { content: [] };
  }
}

export const processMessageWithTools = action({
  args: {
    orgId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    messages: v.array(v.any()),
    tools: v.optional(v.array(v.any())),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
    stream: v.optional(v.boolean()),
  },
  async handler(ctx: any, args: any) {
    const apiKey = "mock-key";

    const provider: LLMProvider =
      args.provider === "openai"
        ? new OpenAIProvider(apiKey)
        : new AnthropicProvider(apiKey);

    const availableTools =
      args.tools || (await (ctx as any).runQuery((internal as any).aiFunctions.getToolsSchema, {}));

    const request: any = {
      model: args.model,
      messages: args.messages,
      tools: provider.toolsSchema(availableTools),
      tool_choice: "auto",
      stream: args.stream || false,
    };

    if (args.stream) {
      throw new Error("Streaming not fully implemented yet");
    }

    try {
      const response = await provider.chatCompletions(request);
      return await processToolCalls(ctx, args, response, provider);
    } catch (error) {
      console.error("Primary provider failed, trying fallback...");
      throw error;
    }
  },
});

async function processToolCalls(
  ctx: any,
  args: any,
  response: any,
  provider: LLMProvider
): Promise<any> {
  let toolCalls: any[] = [];
  if (provider.name === "openai") {
    toolCalls = response.choices?.[0]?.message?.tool_calls || [];
  } else if (provider.name === "anthropic") {
    toolCalls = response.content?.filter((c: any) => c.type === "tool_use") || [];
  }

  const toolResults: any[] = [];

  for (const toolCall of toolCalls) {
    const toolName =
      provider.name === "openai" ? toolCall.function.name : toolCall.name;
    const toolArgs =
      provider.name === "openai"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.input;

    const result = await ctx.runMutation(internal.aiFunctions.executeTool, {
      orgId: args.orgId,
      conversationId: args.conversationId,
      toolName,
      arguments: toolArgs,
      provider: args.provider,
      model: args.model,
    });
    toolResults.push(result);
  }

  return toolResults;
}

export const streamResponseWithTools = internalAction({
  args: {
    orgId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    messages: v.array(v.any()),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
  },
  async handler(ctx: any, args: any) {
    throw new Error("Streaming not implemented yet");
  },
});

export const getAnalytics = action({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  async handler(ctx: any, args: any) {
    throw new Error("Analytics not implemented yet");
  },
});
