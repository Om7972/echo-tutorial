// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@workspace/backend/_generated/api";
import OpenAI from "openai";

// Initialize clients
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, orgId, limit = 5, provider = "openai", model } = body;

    if (!query || !orgId) {
      return NextResponse.json(
        { error: "Missing required fields (query or orgId)" },
        { status: 400 }
      );
    }

    // Generate query embedding
    let queryEmbedding: number[];
    const hasApiKey = !!process.env.OPENAI_API_KEY;

    if (hasApiKey) {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      });
      if (!response.data[0]) {
        throw new Error("Failed to generate embedding");
      }
      queryEmbedding = response.data[0].embedding;
    } else {
      // Mock embedding for testing
      queryEmbedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
      // Normalize
      const magnitude = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
      queryEmbedding = queryEmbedding.map((val) => val / magnitude);
    }

    // Perform semantic search
    const searchResults = await convex.action(api.kb.semanticSearch, {
      orgId,
      queryEmbedding,
      limit,
    });

    // Generate RAG answer
    const ragAnswer = await convex.action(api.kb.generateRAGAnswer, {
      orgId,
      query,
      context: searchResults,
      provider,
      model,
    });

    return NextResponse.json({
      success: true,
      query,
      searchResults,
      ragAnswer,
    });
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
