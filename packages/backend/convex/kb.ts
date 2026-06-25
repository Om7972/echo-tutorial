// @ts-nocheck
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// ─── Document Mutations ───

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const createDocument = mutation({
  args: {
    orgId: v.string(),
    title: v.string(),
    fileName: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx"), v.literal("txt"), v.literal("md")),
    storageId: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const documentId = await ctx.db.insert("documents", {
      orgId: args.orgId,
      title: args.title,
      fileName: args.fileName,
      fileType: args.fileType,
      storageId: args.storageId ? (args.storageId as any) : undefined,
      status: "uploading",
      progress: 0,
      version: 1,
      category: args.category,
      tags: args.tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create a source entry
    await ctx.db.insert("sources", {
      orgId: args.orgId,
      documentId,
      name: args.title,
      description: `Uploaded document: ${args.fileName}`,
      createdAt: Date.now(),
    });

    return documentId;
  },
});

export const updateDocumentProgress = mutation({
  args: {
    documentId: v.id("documents"),
    progress: v.number(),
    status: v.union(v.literal("uploading"), v.literal("processing"), v.literal("indexing"), v.literal("indexed"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      progress: args.progress,
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const addChunksAndEmbeddings = mutation({
  args: {
    documentId: v.id("documents"),
    orgId: v.string(),
    chunks: v.array(v.object({ text: v.string(), index: v.number(), tokenCount: v.optional(v.number()) })),
    embeddings: v.array(v.object({ chunkIndex: v.number(), embedding: v.array(v.float64()) })),
    summary: v.optional(v.string()),
    version: v.number(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Update the document status
    await ctx.db.patch(args.documentId, {
      status: "indexed",
      summary: args.summary,
      version: args.version,
      progress: 100,
      updatedAt: Date.now(),
    });

    // 2. Insert chunks and keep track of their indices
    const chunkIdsMap: Record<number, any> = {};
    for (const chunk of args.chunks) {
      const chunkId = await ctx.db.insert("chunks", {
        orgId: args.orgId,
        documentId: args.documentId,
        text: chunk.text,
        index: chunk.index,
        tokenCount: chunk.tokenCount,
        createdAt: Date.now(),
      });
      chunkIdsMap[chunk.index] = chunkId;
    }

    // 3. Insert embeddings linked to chunk IDs
    for (const emb of args.embeddings) {
      const chunkId = chunkIdsMap[emb.chunkIndex];
      if (chunkId) {
        await ctx.db.insert("embeddings", {
          orgId: args.orgId,
          chunkId,
          documentId: args.documentId,
          embedding: emb.embedding,
          model: args.model || "text-embedding-3-small",
          createdAt: Date.now(),
        });
      }
    }
  },
});

export const updateDocumentStatus = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(v.literal("uploading"), v.literal("processing"), v.literal("indexing"), v.literal("indexed"), v.literal("failed")),
    summary: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: args.status,
      summary: args.summary,
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
  },
});

export const reindexDocument = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    // Delete old chunks and embeddings
    const chunks = await ctx.db.query("chunks").withIndex("by_document_id", q => q.eq("documentId", args.documentId)).collect();
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }
    const embeddings = await ctx.db.query("embeddings").withIndex("by_document_id", q => q.eq("documentId", args.documentId)).collect();
    for (const emb of embeddings) {
      await ctx.db.delete(emb._id);
    }

    // Update document status and version
    await ctx.db.patch(args.documentId, {
      status: "indexing",
      version: doc.version + 1,
      progress: 10,
      updatedAt: Date.now(),
    });

    return doc.version + 1;
  },
});

// ─── Citation Mutations & Queries ───
export const addCitation = mutation({
  args: {
    orgId: v.string(),
    chunkId: v.id("chunks"),
    documentId: v.id("documents"),
    query: v.string(),
    score: v.number(),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("citations", {
      ...args,
      citedAt: Date.now(),
    });
  },
});

export const getCitationsByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const citations = await ctx.db.query("citations")
      .withIndex("by_conversation_id", q => q.eq("conversationId", args.conversationId))
      .collect();

    // Resolve chunks and docs for citations
    const results = [];
    for (const cit of citations) {
      const chunk = await ctx.db.get(cit.chunkId);
      const doc = await ctx.db.get(cit.documentId);
      if (chunk && doc) {
        results.push({
          ...cit,
          chunk,
          document: doc,
        });
      }
    }
    return results;
  },
});

// ─── Document Queries ───

export const listDocuments = query({
  args: {
    orgId: v.string(),
    category: v.optional(v.string()),
    status: v.optional(v.union(v.literal("uploading"), v.literal("processing"), v.literal("indexing"), v.literal("indexed"), v.literal("failed"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("documents").withIndex("by_org_id", (q) => q.eq("orgId", args.orgId));
    
    if (args.category) {
      query = ctx.db.query("documents").withIndex("by_org_category", (q) => 
        q.eq("orgId", args.orgId).eq("category", args.category));
    }
    
    if (args.status) {
      query = ctx.db.query("documents").withIndex("by_org_status", (q) => 
        q.eq("orgId", args.orgId).eq("status", args.status!));
    }

    return await query.order("desc").collect();
  },
});

export const getDocument = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

export const getDocumentWithChunks = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return null;

    const chunks = await ctx.db.query("chunks")
      .withIndex("by_document_id", q => q.eq("documentId", args.documentId))
      .order("asc")
      .collect();

    return { doc, chunks };
  },
});

export const deleteDocument = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    if (!doc) return;

    // Delete associated chunks
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
      .collect();
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Delete associated embeddings
    const embeddings = await ctx.db
      .query("embeddings")
      .withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
      .collect();
    for (const emb of embeddings) {
      await ctx.db.delete(emb._id);
    }

    // Delete associated citations
    const citations = await ctx.db.query("citations")
      .withIndex("by_document_id", q => q.eq("documentId", args.documentId))
      .collect();
    for (const cit of citations) {
      await ctx.db.delete(cit._id);
    }

    // Delete associated sources
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
      .collect();
    for (const src of sources) {
      await ctx.db.delete(src._id);
    }

    // Delete the file from storage if present
    if (doc.storageId) {
      await ctx.storage.delete(doc.storageId);
    }

    // Delete document
    await ctx.db.delete(args.documentId);
  },
});

// ─── Vector Metrics Query ───
export const getVectorMetrics = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const docs = await ctx.db.query("documents").withIndex("by_org_id", q => q.eq("orgId", args.orgId)).collect();
    const chunks = await ctx.db.query("chunks").withIndex("by_org_id", q => q.eq("orgId", args.orgId)).collect();
    const embeddings = await ctx.db.query("embeddings").withIndex("by_org_id", q => q.eq("orgId", args.orgId)).collect();
    
    const statusCounts = docs.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalTokens = chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0);

    return {
      documentCount: docs.length,
      chunkCount: chunks.length,
      embeddingCount: embeddings.length,
      statusCounts,
      totalTokens,
    };
  },
});

// ─── Semantic Search Action & Helpers ───

export const getChunksAndDocuments = query({
  args: {
    chunkIds: v.array(v.id("chunks")),
    documentIds: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const chunks: Record<string, any> = {};
    const documents: Record<string, any> = {};

    for (const id of args.chunkIds) {
      const chunk = await ctx.db.get(id);
      if (chunk) chunks[id] = chunk;
    }

    for (const id of args.documentIds) {
      const doc = await ctx.db.get(id);
      if (doc) documents[id] = doc;
    }

    return { chunks, documents };
  },
});

export const semanticSearch = action({
  args: {
    orgId: v.string(),
    queryEmbedding: v.array(v.float64()),
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const searchLimit = args.limit ?? 5;

    // 1. Perform vector search in Convex
    const results = await ctx.vectorSearch("embeddings", "by_embedding", {
      vector: args.queryEmbedding,
      limit: searchLimit,
      filter: (q) => q.eq("orgId", args.orgId),
    });

    if (results.length === 0) {
      return [];
    }

    // Resolve embedding IDs to chunk and document data
    const resolvedData = (await ctx.runQuery(api.kb.resolveEmbeddingsWithContent as any, {
      embeddingIds: results.map((r) => r._id),
    })) as any[];

    // Map scores back to the resolved content
    return resolvedData.map((data: any) => {
      const match = results.find((r) => r._id === data.embeddingId);
      return {
        ...data,
        score: match ? match._score : 0,
      };
    });
  },
});

export const resolveEmbeddingsWithContent = query({
  args: {
    embeddingIds: v.array(v.id("embeddings")),
  },
  handler: async (ctx, args) => {
    const output = [];

    for (const id of args.embeddingIds) {
      const emb = await ctx.db.get(id);
      if (!emb) continue;

      const chunk = await ctx.db.get(emb.chunkId);
      const doc = await ctx.db.get(emb.documentId);

      if (chunk && doc) {
        output.push({
          embeddingId: id,
          chunkId: chunk._id,
          documentId: doc._id,
          text: chunk.text,
          chunkIndex: chunk.index,
          documentTitle: doc.title,
          documentFileName: doc.fileName,
          documentCategory: doc.category ?? "General",
        });
      }
    }

    return output;
  },
});

// ─── RAG Answer Generation ───
export const generateRAGAnswer = action({
  args: {
    orgId: v.string(),
    query: v.string(),
    context: v.array(v.object({
      text: v.string(),
      documentTitle: v.string(),
      score: v.number(),
      chunkId: v.id("chunks"),
      documentId: v.id("documents"),
    })),
    provider: v.optional(v.union(v.literal("openai"), v.literal("anthropic"), v.literal("grok"))),
    model: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const provider = args.provider || "openai";
    const model = args.model || (provider === "openai" ? "gpt-4o-mini" : provider === "anthropic" ? "claude-3-haiku-20240307" : "grok-beta");
    
    // Build context string
    const contextText = args.context.map((c, i) => `[${i + 1}] ${c.text} (Source: ${c.documentTitle})`).join("\n\n");

    // Build prompt
    const systemPrompt = `
You are an expert assistant that answers questions using the provided context from a knowledge base.
Always cite your sources using [1], [2], etc. based on the numbered context.
Structure your answer clearly and concisely.
If you don't know the answer based on the context, say so clearly.
`.trim();

    const userPrompt = `
Context:
${contextText}

Question: ${args.query}

Please provide your answer in the following JSON format:
{
  "answer": "Your answer here with citations like [1]",
  "sources": [
    { "id": "chunkId", "title": "Document Title", "score": 0.95 },
  ],
  "confidence": 0.85 // 0-1 score of how confident you are in the answer
}
`.trim();

    let answerData: any;
    
    // TODO: Add actual provider integrations (Anthropic, Grok)
    // For now, mock or use OpenAI if key is available
    answerData = {
      answer: `This is a sample RAG answer for: "${args.query}"`,
      sources: args.context.map(c => ({ id: c.chunkId, title: c.documentTitle, score: c.score })),
      confidence: 0.85,
    };

    // Add citations
    for (const source of answerData.sources) {
      await ctx.runMutation(api.kb.addCitation, {
        orgId: args.orgId,
        chunkId: source.id,
        documentId: args.context.find(c => c.chunkId === source.id)!.documentId,
        query: args.query,
        score: source.score,
        conversationId: args.conversationId,
        messageId: args.messageId,
      });
    }

    return answerData;
  },
});
