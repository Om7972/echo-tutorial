import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@workspace/backend/_generated/api";
import OpenAI from "openai";
// @ts-ignore
import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";

// Initialize Convex Client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

// Initialize OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Helper: Chunk Text
function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let startIndex = 0;
  
  // Clean white spaces
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  if (cleanedText.length <= chunkSize) {
    return [cleanedText];
  }

  while (startIndex < cleanedText.length) {
    let endIndex = startIndex + chunkSize;
    
    // Find natural word boundary
    if (endIndex < cleanedText.length) {
      const lastSpace = cleanedText.lastIndexOf(' ', endIndex);
      if (lastSpace > startIndex + chunkSize - overlap) {
        endIndex = lastSpace;
      }
    }
    
    const chunk = cleanedText.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    startIndex = endIndex - overlap;
    if (startIndex >= cleanedText.length) {
      break;
    }
    if (endIndex <= startIndex) {
      startIndex += chunkSize;
    }
  }
  
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orgId = formData.get("orgId") as string | null;
    const category = formData.get("category") as string | null;

    if (!file || !orgId) {
      return NextResponse.json(
        { error: "Missing required fields (file or orgId)" },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    let fileType: "pdf" | "docx" | "txt";
    if (fileExtension === "pdf") {
      fileType = "pdf";
    } else if (fileExtension === "docx") {
      fileType = "docx";
    } else if (fileExtension === "txt" || fileExtension === "md") {
      fileType = "txt";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, DOCX, or TXT." },
        { status: 400 }
      );
    }

    // 1. Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 2. Extract plain text
    let extractedText = "";
    if (fileType === "txt") {
      extractedText = fileBuffer.toString("utf-8");
    } else if (fileType === "pdf") {
      try {
        // @ts-ignore
        const parser = pdfParse.default || pdfParse;
        const data = await (parser as any)(fileBuffer);
        extractedText = data.text;
      } catch (err: any) {
        return NextResponse.json(
          { error: `Failed to parse PDF document: ${err.message}` },
          { status: 500 }
        );
      }
    } else if (fileType === "docx") {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
      } catch (err: any) {
        return NextResponse.json(
          { error: `Failed to parse DOCX document: ${err.message}` },
          { status: 500 }
        );
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: "No text content could be extracted from this document." },
        { status: 400 }
      );
    }

    // 3. Chunk text
    const chunks = chunkText(extractedText);
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "Document content is too short to chunk." },
        { status: 400 }
      );
    }

    // 4. Upload file to Convex storage
    let storageId: string | undefined;
    try {
      const uploadUrl = await convex.mutation(api.kb.generateUploadUrl, {});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: fileBuffer,
      });
      if (uploadResponse.ok) {
        const json = await uploadResponse.json();
        storageId = json.storageId;
      }
    } catch (err) {
      console.error("Failed to upload file to Convex storage:", err);
    }

    // 5. Create document in database (starts in 'processing' status)
    const documentId = await convex.mutation(api.kb.createDocument, {
      orgId,
      title: fileName.replace(/\.[^/.]+$/, ""), // strip extension
      fileName,
      fileType,
      storageId,
      category: category || "General",
    });

    // 6. Generate embeddings using OpenAI (with local mock fallback if no key)
    let embeddings: { chunkIndex: number; embedding: number[] }[] = [];
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    
    if (hasApiKey) {
      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunks,
        });
        
        embeddings = response.data.map((item, idx) => ({
          chunkIndex: idx,
          embedding: item.embedding,
        }));
      } catch (err) {
        console.error("OpenAI Embedding generation failed, using fallback:", err);
      }
    }

    // Fallback: If OpenAI key is missing or failed, generate mock vectors (1536 dims)
    if (embeddings.length === 0) {
      embeddings = chunks.map((_, idx) => {
        const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
        // Normalize vector for cosine similarity
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        const normalized = vector.map((val) => val / magnitude);
        return {
          chunkIndex: idx,
          embedding: normalized,
        };
      });
    }

    // 7. Auto summarize document using OpenAI (with fallback)
    let summary = "";
    if (hasApiKey) {
      try {
        const summaryResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a professional assistant. Summarize the following document content in 2 to 3 concise sentences.",
            },
            {
              role: "user",
              content: extractedText.slice(0, 4000),
            },
          ],
        });
        summary = summaryResponse.choices[0]?.message?.content || "";
      } catch (err) {
        console.error("OpenAI summary generation failed:", err);
      }
    }
    
    if (!summary) {
      summary = `A parsed ${fileType.toUpperCase()} file containing ${chunks.length} semantic chunks. Starts with: "${chunks[0]?.slice(0, 100)}..."`;
    }

    // 8. Write chunks and embeddings to Convex and update document status to 'indexed'
    await convex.mutation(api.kb.addChunksAndEmbeddings, {
      documentId,
      orgId,
      chunks: chunks.map((text, idx) => ({ text, index: idx })),
      embeddings,
      summary,
      version: 1,
    });

    return NextResponse.json({
      success: true,
      documentId,
      chunksCount: chunks.length,
      summary,
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}
