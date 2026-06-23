"use client";

/**
 * Memory Search Component
 * Allows searching through conversation memories with different strategies
 */

import { useState } from "react";
import { useMemoryRetriever } from "@/lib/memory/MemoryService";
import { Id } from "@workspace/backend/convex/_generated/dataModel";
import { formatMemoryPreview } from "@/lib/memory/MemoryService";

interface MemorySearchProps {
  conversationId: Id<"conversations">;
  orgId: string;
}

export function MemorySearch({ conversationId, orgId }: MemorySearchProps) {
  const [query, setQuery] = useState("");
  const [strategy, setStrategy] = useState<"hybrid" | "contextRanked" | "semantic">("hybrid");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const retriever = useMemoryRetriever(conversationId, orgId);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      let searchResults;

      switch (strategy) {
        case "hybrid":
          searchResults = retriever.hybrid(query, { limit: 10 });
          break;
        case "contextRanked":
          const keywords = query.split(/\s+/).filter(w => w.length > 2);
          searchResults = retriever.contextRanked(keywords, 10);
          break;
        case "semantic":
          searchResults = await retriever.semanticSearch(query, { limit: 10, minScore: 0.7 });
          break;
      }

      if (searchResults) {
        setResults(Array.isArray(searchResults) ? searchResults : searchResults.results || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Search Memories</h2>

        <div className="space-y-4">
          {/* Search Input */}
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search conversation memories..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Strategy Selection */}
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">Strategy:</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="hybrid">Hybrid (Recency + Semantic)</option>
              <option value="contextRanked">Context Ranked</option>
              <option value="semantic">Semantic Only</option>
            </select>

            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Strategy Description */}
          <div className="text-sm text-gray-600">
            {strategy === "hybrid" && (
              <p>Combines recency and semantic similarity for balanced results</p>
            )}
            {strategy === "contextRanked" && (
              <p>Ranks by keyword and topic matches in memory content</p>
            )}
            {strategy === "semantic" && (
              <p>Uses vector embeddings to find conceptually similar memories</p>
            )}
          </div>
        </div>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Results ({results.length})
          </h3>

          <div className="space-y-4">
            {results.map((result, index) => (
              <MemoryResult key={index} memory={result} rank={index + 1} />
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && query && !isSearching && (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
          No memories found for "{query}"
        </div>
      )}
    </div>
  );
}

interface MemoryResultProps {
  memory: any;
  rank: number;
}

function MemoryResult({ memory, rank }: MemoryResultProps) {
  const relevanceScore = memory.retrievalScore || memory.relevanceScore || 0;
  const scorePercentage = relevanceScore * 100;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold">
            {rank}
          </div>
          <div>
            <div className="font-medium">{memory.type}</div>
            <div className="text-xs text-gray-500">
              Created: {new Date(memory.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Relevance Score */}
        <div className="text-right">
          <div className="text-sm font-medium">Relevance</div>
          <div className="text-lg font-bold text-blue-600">
            {scorePercentage.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Content Preview */}
      <div className="text-gray-700 mb-3">
        {formatMemoryPreview(memory.content, 200)}
      </div>

      {/* Metadata */}
      {memory.metadata && (
        <div className="flex gap-4 text-sm">
          {memory.metadata.sentiment && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600">Sentiment:</span>
              <span
                className={`font-medium ${
                  memory.metadata.sentiment === "positive"
                    ? "text-green-600"
                    : memory.metadata.sentiment === "negative"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {memory.metadata.sentiment}
              </span>
            </div>
          )}

          {memory.metadata.topics && memory.metadata.topics.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600">Topics:</span>
              <div className="flex gap-1">
                {memory.metadata.topics.slice(0, 3).map((topic: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-gray-600">
        <div>Accessed: {memory.accessCount} times</div>
        <div>Tokens: {memory.tokenCount}</div>
        <div>Last accessed: {new Date(memory.lastAccessedAt).toLocaleString()}</div>
      </div>
    </div>
  );
}
