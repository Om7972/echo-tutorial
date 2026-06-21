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
    fileType: v.union(v.literal("pdf"), v.literal("docx"), v.literal("txt")),
    storageId: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const documentId = await ctx.db.insert("documents", {
      orgId: args.orgId,
      title: args.title,
      fileName: args.fileName,
      fileType: args.fileType,
      storageId: args.storageId ? (args.storageId as any) : undefined,
      status: "processing",
      version: 1,
      category: args.category,
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

export const addChunksAndEmbeddings = mutation({
  args: {
    documentId: v.id("documents"),
    orgId: v.string(),
    chunks: v.array(v.object({ text: v.string(), index: v.number() })),
    embeddings: v.array(v.object({ chunkIndex: v.number(), embedding: v.array(v.float64()) })),
    summary: v.optional(v.string()),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Update the document status
    await ctx.db.patch(args.documentId, {
      status: "indexed",
      summary: args.summary,
      version: args.version,
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
        });
      }
    }
  },
});

export const updateDocumentStatus = mutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(v.literal("processing"), v.literal("indexed"), v.literal("failed")),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: args.status,
      summary: args.summary,
      updatedAt: Date.now(),
    });
  },
});

// ─── Document Queries ───

export const listDocuments = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();
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

    const chunkIds = results.map((r) => r._id as any); // The match returns matching document IDs or embedding record IDs
    // Wait, in Convex, vectorSearch returns the _id of the record in the indexed table!
    // Since our vectorIndex is on "embeddings", results will contain the _id of the matching record in the "embeddings" table.
    // Let's retrieve those embedding records to get chunkId and documentId!
    
    // We can write a helper query to resolve embedding IDs to chunk and document data!
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
