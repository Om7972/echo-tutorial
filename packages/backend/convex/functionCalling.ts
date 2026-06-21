import { v } from "convex/values";
import { action, internalAction, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Define our providers
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Provider-independent interface
interface LLMProvider {
  name: "openai" | "anthropic";
  chatCompletions: (params: any) => Promise<any>;
  streamChatCompletions: (params: any) => AsyncIterable<any>;
  toolsSchema: (tools: any[]) => any[];
}

class OpenAIProvider implements LLMProvider {
  name: "openai" = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  toolsSchema(tools: any[]) {
    return tools;
  }

  async chatCompletions(params: any) {
    return await this.client.chat.completions.create(params);
  }

  async *streamChatCompletions(params: any) {
    const stream = await this.client.chat.completions.create({
      ...params,
      stream: true,
    });
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}

class AnthropicProvider implements LLMProvider {
  name: "anthropic" = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  toolsSchema(tools: any[]) {
    return tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));
  }

  async chatCompletions(params: any) {
    const { model, messages, max_tokens, tools, ...rest } = params;
    return await this.client.messages.create({
      model,
      messages,
      max_tokens: max_tokens || 1024,
      tools,
      ...rest,
    });
  }

  async *streamChatCompletions(params: any) {
    const { model, messages, max_tokens, tools, ...rest } = params;
    const stream = await this.client.messages.create({
      model,
      messages,
      max_tokens: max_tokens || 1024,
      tools,
      stream: true,
      ...rest,
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  }
}

// ─── Main Function Calling Action ───────────────────────────────────────────────
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
  async handler(ctx, args) {
    const apiKey = args.provider === "openai" 
      ? process.env.OPENAI_API_KEY 
      : process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(`${args.provider} API key not found");
    }

    const provider: LLMProvider =
      args.provider === "openai"
        ? new OpenAIProvider(apiKey!)
        : new AnthropicProvider(apiKey!);

    const availableTools = args.tools || (await ctx.runQuery(internal.aiFunctions.getToolsSchema, {}));

    const request = {
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
      let response = await provider.chatCompletions(request);
      // Process tool calls here
      return response = await processToolCalls(ctx, args, response, provider);
      return response;
    } catch (error) {
      // Fallback execution
      console.error("Primary provider failed, trying fallback...");
      throw error;
    }
  },
});

// ─── Process Tool Calls ─────────────────────────────────────────────────────────
async function processToolCalls(
  ctx: any,
  args: any,
  response: any,
  provider: LLMProvider
) {
  let toolCalls: any[] = [];
  if (provider.name === "openai") {
    toolCalls = response.choices?.[0]?.message?.tool_calls || [];
  } else if (provider.name === "anthropic") {
    toolCalls = response.content?.filter((c: any) => c.type === "tool_use") || [];
  }

  const toolResults = [];

  for (const toolCall of toolCalls) {
    const toolName = provider.name === "openai" ? toolCall.function.name : toolCall.name;
    const toolArgs = provider.name === "openai" ? JSON.parse(toolCall.function.arguments) : toolCall.input;

    // Execute tool via internal mutation
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

// ─── Streaming Response Generator Action ─────────────────────────────────────────────────────────
export const streamResponseWithTools = internalAction({
  args: {
    orgId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    messages: v.array(v.any()),
    provider: v.union(v.literal("openai"), v.literal("anthropic")),
    model: v.string(),
  },
  async handler(ctx, args) {
    throw new Error("Streaming not implemented yet");
  },
});

export const getAnalytics = action({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  async handler(ctx, args) {
    throw new Error("Analytics not implemented yet");
  },
});
