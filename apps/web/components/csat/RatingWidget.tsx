// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface RatingWidgetProps {
  orgId: string;
  conversationId: Id<"unified_conversations">;
  customerId?: Id<"unified_customers">;
  agentId?: string;
  agentName?: string;
  surveyId?: Id<"csat_surveys">;
  ratingType?: "stars" | "emoji" | "thumbs" | "nps";
  onSubmitted?: () => void;
}

export function RatingWidget({
  orgId,
  conversationId,
  customerId,
  agentId,
  agentName,
  surveyId,
  ratingType = "stars",
  onSubmitted,
}: RatingWidgetProps) {
  const submitRating = useMutation(api.csat.ratings.submitRating);

  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<string | undefined>(undefined);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedScore === null) {
      alert("Please select a rating");
      return;
    }

    setSubmitting(true);

    try {
      await submitRating({
        orgId,
        conversationId,
        customerId,
        ratingType,
        score: selectedScore,
        rawScore: ratingType === "nps" ? selectedScore : undefined,
        feedbackComment: feedbackComment || undefined,
        feedbackCategory,
        agentId,
        agentName,
        surveyId,
      });

      setSubmitted(true);
      onSubmitted?.();
    } catch (error) {
      console.error("Failed to submit rating:", error);
      alert("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-xl font-semibold mb-2">Thank you for your feedback!</h3>
        <p className="text-gray-600">
          Your feedback helps us improve our service.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">How was your experience?</h3>
        <p className="text-gray-600">We'd love to hear your feedback</p>
      </div>

      {/* Rating Input */}
      <div className="flex justify-center">
        {ratingType === "stars" && (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedScore(star)}
                className="text-4xl hover:scale-110 transition-transform"
              >
                {selectedScore !== null && star <= selectedScore ? "⭐" : "☆"}
              </button>
            ))}
          </div>
        )}

        {ratingType === "emoji" && (
          <div className="flex gap-4">
            {[
              { score: 1, emoji: "😞" },
              { score: 2, emoji: "😐" },
              { score: 3, emoji: "🙂" },
              { score: 4, emoji: "😊" },
              { score: 5, emoji: "😍" },
            ].map(({ score, emoji }) => (
              <button
                key={score}
                onClick={() => setSelectedScore(score)}
                className={`text-5xl hover:scale-110 transition-transform ${
                  selectedScore === score ? "ring-4 ring-blue-500 rounded-full" : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {ratingType === "thumbs" && (
          <div className="flex gap-8">
            <button
              onClick={() => setSelectedScore(1)}
              className={`text-6xl hover:scale-110 transition-transform ${
                selectedScore === 1 ? "ring-4 ring-blue-500 rounded-full p-2" : ""
              }`}
            >
              👎
            </button>
            <button
              onClick={() => setSelectedScore(5)}
              className={`text-6xl hover:scale-110 transition-transform ${
                selectedScore === 5 ? "ring-4 ring-blue-500 rounded-full p-2" : ""
              }`}
            >
              👍
            </button>
          </div>
        )}

        {ratingType === "nps" && (
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              // Convert NPS (0-10) to normalized score (1-5)
              const normalizedScore = Math.ceil(((num + 1) / 11) * 5);
              return (
                <button
                  key={num}
                  onClick={() => setSelectedScore(normalizedScore)}
                  className={`w-10 h-10 rounded flex items-center justify-center font-semibold ${
                    selectedScore === normalizedScore
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedScore !== null && (
        <div className="text-center text-sm text-gray-600">
          {selectedScore <= 2 && "We're sorry to hear that. How can we improve?"}
          {selectedScore === 3 && "Thanks for your feedback. How can we do better?"}
          {selectedScore >= 4 && "Great! We're glad you had a good experience!"}
        </div>
      )}

      {/* Feedback Category (for low scores) */}
      {selectedScore !== null && selectedScore <= 3 && (
        <div>
          <label className="block text-sm font-medium mb-2">
            What could we improve?
          </label>
          <select
            value={feedbackCategory || ""}
            onChange={(e) => setFeedbackCategory(e.target.value || undefined)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">Select a category (optional)</option>
            <option value="response_time">Response Time</option>
            <option value="issue_resolution">Issue Resolution</option>
            <option value="agent_knowledge">Agent Knowledge</option>
            <option value="agent_friendliness">Agent Friendliness</option>
            <option value="overall_experience">Overall Experience</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}

      {/* Feedback Comment */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Additional comments (optional)
        </label>
        <textarea
          value={feedbackComment}
          onChange={(e) => setFeedbackComment(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          rows={3}
          placeholder="Tell us more about your experience..."
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={selectedScore === null || submitting}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
      >
        {submitting ? "Submitting..." : "Submit Feedback"}
      </button>

      {agentName && (
        <p className="text-center text-sm text-gray-500">
          You were assisted by {agentName}
        </p>
      )}
    </div>
  );
}
