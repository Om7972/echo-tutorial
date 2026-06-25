// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AnalyticsDashboardProps {
  orgId: string;
}

export function AnalyticsDashboard({ orgId }: AnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  const getDateRange = () => {
    const now = Date.now();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return {
      dateFrom: now - days * 24 * 60 * 60 * 1000,
      dateTo: now,
    };
  };

  const analytics = useQuery(api.csat.analytics.getAnalytics, {
    orgId,
    ...getDateRange(),
  });

  const trend = useQuery(api.csat.analytics.getTrend, {
    orgId,
    days: dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90,
    groupBy: "day",
  });

  const negativeFeedback = useQuery(api.csat.ratings.getNegativeFeedback, {
    orgId,
    days: 7,
  });

  const exportToCSV = () => {
    if (!analytics) return;

    const csv = [
      ["Metric", "Value"],
      ["Total Ratings", analytics.totalRatings],
      ["Average Score", analytics.avgScore.toFixed(2)],
      ["CSAT Score", `${analytics.csatScore.toFixed(1)}%`],
      ["Total Comments", analytics.totalComments],
      ["Negative Comments", analytics.negativeComments],
      ["Positive Comments", analytics.positiveComments],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `csat-analytics-${dateRange}.csv`;
    a.click();
  };

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">CSAT Analytics</h2>
          <p className="text-gray-600 mt-1">Customer satisfaction metrics and insights</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">CSAT Score</div>
          <div className="text-3xl font-bold mt-2">{analytics.csatScore.toFixed(1)}%</div>
          <div className="flex items-center gap-1 mt-2 text-sm">
            {analytics.trend.direction === "up" && (
              <span className="text-green-600">
                ↑ {analytics.trend.percentage.toFixed(1)}%
              </span>
            )}
            {analytics.trend.direction === "down" && (
              <span className="text-red-600">
                ↓ {analytics.trend.percentage.toFixed(1)}%
              </span>
            )}
            {analytics.trend.direction === "stable" && (
              <span className="text-gray-600">→ Stable</span>
            )}
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Average Score</div>
          <div className="text-3xl font-bold mt-2">{analytics.avgScore.toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-2">out of 5.0</div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Ratings</div>
          <div className="text-3xl font-bold mt-2">{analytics.totalRatings}</div>
          <div className="text-sm text-gray-500 mt-2">
            {analytics.totalComments} with comments
          </div>
        </div>

        {analytics.npsScore !== null && (
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-600">NPS Score</div>
            <div className="text-3xl font-bold mt-2">{analytics.npsScore}</div>
            <div className="text-sm text-gray-500 mt-2">
              {analytics.promoterCount} promoters
            </div>
          </div>
        )}
      </div>

      {/* Score Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>

        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((score) => {
            const count = analytics.scoreDistribution[score] || 0;
            const percentage =
              analytics.totalRatings > 0
                ? (count / analytics.totalRatings) * 100
                : 0;

            return (
              <div key={score} className="flex items-center gap-3">
                <div className="text-sm font-medium w-12">
                  {score} {"⭐".repeat(score)}
                </div>

                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full ${
                      score >= 4
                        ? "bg-green-500"
                        : score === 3
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="text-sm text-gray-600 w-20 text-right">
                  {count} ({percentage.toFixed(1)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">CSAT Trend</h3>

          {trend && trend.length > 0 ? (
            <div className="space-y-2">
              {trend.map((point, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="text-xs text-gray-600 w-24">
                    {new Date(point.date).toLocaleDateString()}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${point.csatScore}%` }}
                    />
                  </div>
                  <div className="text-sm font-medium w-16 text-right">
                    {point.csatScore.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No trend data available
            </p>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Feedback Categories</h3>

          {Object.keys(analytics.categoryBreakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(analytics.categoryBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {category.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No categorized feedback yet
            </p>
          )}
        </div>
      </div>

      {/* Top Agents */}
      {analytics.topAgents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performing Agents</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Agent</th>
                  <th className="text-right py-2 px-4">Average Score</th>
                  <th className="text-right py-2 px-4">Total Ratings</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topAgents.map((agent, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{agent.agentName}</td>
                    <td className="text-right py-3 px-4">
                      <span className="font-semibold">{agent.avgScore.toFixed(2)}</span>
                      <span className="text-gray-500 ml-1">/5.0</span>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-600">
                      {agent.totalRatings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Negative Feedback Alert */}
      {negativeFeedback && negativeFeedback.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Recent Negative Feedback
              </h3>
              <p className="text-sm text-red-800 mb-4">
                {negativeFeedback.length} customer{negativeFeedback.length !== 1 ? "s" : ""}{" "}
                gave low ratings in the last 7 days
              </p>

              <div className="space-y-3">
                {negativeFeedback.slice(0, 3).map((rating, index) => (
                  <div key={index} className="bg-white rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {"⭐".repeat(rating.score)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(rating.ratedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {rating.feedbackComment && (
                      <p className="text-sm text-gray-700">{rating.feedbackComment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
