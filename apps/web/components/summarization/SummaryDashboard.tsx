// @ts-nocheck
"use client";

/**
 * Summary Dashboard Component
 * Display conversation summaries with action items
 */

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

interface SummaryDashboardProps {
  conversationId: Id<"unified_conversations">;
  orgId: string;
}

export function SummaryDashboard({ conversationId, orgId }: SummaryDashboardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");

  // Query
  const summary = useQuery(api.summarization.generator.getSummary, {
    conversationId,
  });

  // Mutations
  const generateSummary = useAction(api.summarization.generator.generateSummary);
  const completeActionItem = useMutation(api.summarization.generator.completeActionItem);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateSummary({
        orgId,
        conversationId,
        provider,
      });
    } catch (error) {
      console.error("Failed to generate summary:", error);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompleteAction = async (index: number) => {
    if (!summary) return;
    try {
      await completeActionItem({
        summaryId: summary._id,
        actionItemIndex: index,
      });
    } catch (error) {
      console.error("Failed to complete action item:", error);
    }
  };

  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold mb-2">No Summary Yet</h3>
          <p className="text-gray-600 mb-4">
            Generate an AI-powered summary of this conversation
          </p>

          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={() => setProvider("openai")}
              className={`px-4 py-2 rounded-lg ${
                provider === "openai"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              OpenAI (GPT-4)
            </button>
            <button
              onClick={() => setProvider("anthropic")}
              className={`px-4 py-2 rounded-lg ${
                provider === "anthropic"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              Anthropic (Claude)
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate Summary"}
          </button>
        </div>
      </div>
    );
  }

  const sentimentColors: Record<string, string> = {
    positive: "bg-green-100 text-green-800",
    negative: "bg-red-100 text-red-800",
    neutral: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Conversation Summary</h2>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            🔄 Regenerate
          </button>
          <button
            onClick={() => {
              // Export to PDF logic
              window.print();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Short Summary */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
        <h3 className="font-semibold text-lg mb-2">Quick Summary</h3>
        <p className="text-gray-800">{summary.shortSummary}</p>
      </div>

      {/* Sentiment */}
      {summary.sentiment && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Sentiment Analysis</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                sentimentColors[summary.sentiment] || sentimentColors.neutral
              }`}
            >
              {summary.sentiment}
            </span>
          </div>
          {summary.sentimentScore !== undefined && (
            <div className="mt-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Negative</span>
                <span>Neutral</span>
                <span>Positive</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-red-500 via-gray-400 to-green-500 h-3 rounded-full"
                  style={{ width: "100%" }}
                >
                  <div
                    className="w-2 h-5 bg-blue-600 rounded-full border-2 border-white -mt-1"
                    style={{
                      marginLeft: `${((summary.sentimentScore + 1) / 2) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="text-center text-sm text-gray-600 mt-1">
                Score: {summary.sentimentScore.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-lg mb-3">Detailed Summary</h3>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p className="whitespace-pre-wrap">{summary.detailedSummary}</p>
        </div>
      </div>

      {/* Root Cause */}
      {summary.rootCause && (
        <div className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded-r-lg">
          <h3 className="font-semibold text-lg mb-2">Root Cause</h3>
          <p className="text-gray-800">{summary.rootCause}</p>
        </div>
      )}

      {/* Resolution Steps */}
      {summary.resolutionSteps && summary.resolutionSteps.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-3">Resolution Steps</h3>
          <ol className="list-decimal list-inside space-y-2">
            {summary.resolutionSteps.map((step, index) => (
              <li key={index} className="text-gray-700">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Action Items */}
      {summary.actionItems && summary.actionItems.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-3">Action Items</h3>
          <div className="space-y-3">
            {summary.actionItems.map((item, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
                  item.completed
                    ? "bg-gray-50 border-gray-200"
                    : "bg-white border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleCompleteAction(index)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p
                    className={`${
                      item.completed ? "line-through text-gray-500" : "text-gray-800"
                    }`}
                  >
                    {item.description}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.priority === "high"
                          ? "bg-red-100 text-red-800"
                          : item.priority === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.priority}
                    </span>
                    {item.dueDate && (
                      <span className="text-xs text-gray-600">
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {summary.tags && summary.tags.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-3">Tags</h3>
          <div className="flex gap-2 flex-wrap">
            {summary.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="font-medium">Generated:</span> {new Date(summary.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Messages:</span> {summary.messageCount}
          </div>
          <div>
            <span className="font-medium">Provider:</span> {summary.provider}
          </div>
          <div>
            <span className="font-medium">Cost:</span> ${summary.costUSD.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
}
