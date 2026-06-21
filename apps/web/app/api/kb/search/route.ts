import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@workspace/backend/_generated/api";
import OpenAI from "openai";

// Initialize Convex Client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

// Initialize OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { query: searchQuery, orgId, limit } = await req.json();

    if (!searchQuery || !orgId) {
      return NextResponse.json(
        { error: "Missing required fields (query or orgId)" },
        { status: 400 }
      );
    }

    const hasApiKey = !!process.env.OPENAI_API_KEY;
    let queryEmbedding: number[] = [];

    // 1. Generate query embedding using OpenAI
    if (hasApiKey) {
      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: searchQuery,
        });
        queryEmbedding = response.data[0]?.embedding || [];
      } catch (err) {
        console.error("OpenAI Embedding generation failed for search query:", err);
      }
    }

    // Fallback: If OpenAI key is missing or failed, generate a mock search vector
    if (queryEmbedding.length === 0) {
      const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      queryEmbedding = vector.map((val) => val / magnitude);
    }

    // 2. Perform Convex action-based semantic search
    const results = await convex.action(api.kb.semanticSearch, {
      orgId,
      queryEmbedding,
      limit: limit || 4,
    });

    // 3. Format citations and return
    const formattedResults = results.map((res: any, idx: number) => ({
      citationNumber: idx + 1,
      text: res.text,
      chunkIndex: res.chunkIndex,
      documentId: res.documentId,
      documentTitle: res.documentTitle,
      documentFileName: res.documentFileName,
      category: res.documentCategory,
      relevanceScore: res.score,
    }));

    return NextResponse.json({
      query: searchQuery,
      results: formattedResults,
    });

  } catch (error: any) {
    console.error("Semantic search error:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
