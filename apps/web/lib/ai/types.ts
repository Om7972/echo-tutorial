// @ts-nocheck
export type AIProviderName = "openai" | "anthropic" | "grok";

export interface AIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: AIToolCall[];
}

export interface AIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AICostEstimate {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  fallbackProvider?: AIProviderName;
  fallbackModel?: string;
}

export interface AISessionMetadata {
  userId?: string;
  orgId: string;
  conversationId: string;
}
