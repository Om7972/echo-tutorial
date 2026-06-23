"use client";

/**
 * Sentiment Analysis Dashboard
 * Real-time sentiment and intent analytics with charts
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";

interface SentimentDashboardProps {
  orgId: string;
}

export function SentimentDashboard({ orgId }: SentimentDashboardProps) {
  const [days, setDays] = useState(7);

  const analytics = useQuery(api.sentiment.analytics.getSentimentAnalytics, {
    orgId,
  });

  const dailyTrends = useQuery(api.sentiment.analytics.getDailySentimentTrends, {
    orgId,
    days,
  });

  const realtimeOverview = useQuery(api.sentiment.analytics.getRealtimeSentimentOverview, {
    orgId,
  });

  const comparison = useQuery(api.sentiment.analytics.getSentimentComparison, {
    orgId,
    days,
  });

  const triggerStats = useQuery(api.sentiment.analytics.getTriggerStatistics, {
    orgId,
  });

  if (!analytics) {
    return <div>Loading sentiment analytics...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Sentiment Analysis Dashboard</h1>

      {/* Real-time Overview */}
      {realtimeOverview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Today's Messages"
            value={realtimeOverview.today?.totalAnalyses || 0}
            subtitle="Analyzed today"
            trend={comparison?.change.total}
          />
          <MetricCard
            title="Positive Rate"
            value={`${((realtimeOverview.last24h.positive / realtimeOverview.last24h.total) * 100 || 0).toFixed(1)}%`}
            subtitle="Last 24 hours"
            trend={comparison?.change.positiveRate}
            isPercentage
          />
          <MetricCard
            title="Negative Rate"
            value={`${((realtimeOverview.last24h.negative / realtimeOverview.last24h.total) * 100 || 0).toFixed(1)}%`}
            subtitle="Last 24 hours"
            trend={comparison?.change.negativeRate}
            inverse
            isPercentage
          />
          <MetricCard
            title="Avg Sentiment"
            value={analytics.avgSentimentScore.toFixed(2)}
            subtitle="Score: -1 to 1"
            trend={comparison?.change.avgScore}
          />
        </div>
      )}

      {/* Sentiment Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Sentiment Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(analytics.sentimentDistribution).map(([sentiment, count]) => (
            <SentimentBar
              key={sentiment}
              sentiment={sentiment}
              count={count}
              total={analytics.totalMessages}
            />
          ))}
        </div>
      </div>

      {/* Daily Trends Chart */}
      {dailyTrends && dailyTrends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Sentiment Trends</h2>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border rounded-md"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>

          <div className="space-y-2">
            {dailyTrends.map((trend) => (
              <div key={trend.date} className="flex items-center gap-2">
                <div className="text-xs text-gray-600 w-24">{trend.date}</div>
                <div className="flex-1 flex gap-1 h-8">
                  <TrendBar
                    label="Positive"
                    value={trend.positive}
                    total={trend.total}
                    color="bg-green-500"
                  />
                  <TrendBar
                    label="Negative"
                    value={trend.negative}
                    total={trend.total}
                    color="bg-red-500"
                  />
                  <TrendBar
                    label="Angry"
                    value={trend.angry}
                    total={trend.total}
                    color="bg-red-700"
                  />
                  <TrendBar
                    label="Neutral"
                    value={trend.neutral}
                    total={trend.total}
                    color="bg-gray-400"
                  />
                </div>
                <div className="text-sm font-medium w-12 text-right">{trend.total}</div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Positive</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Negative</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-700 rounded"></div>
              <span>Angry</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              <span>Neutral</span>
            </div>
          </div>
        </div>
      )}

      {/* Intent Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Top Intents</h2>
        <div className="space-y-3">
          {Object.entries(analytics.intentDistribution)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([intent, count]) => (
              <IntentBar
                key={intent}
                intent={intent}
                count={count}
                total={analytics.totalMessages}
              />
            ))}
        </div>
      </div>

      {/* Triggers & Actions */}
      {triggerStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Auto-Triggers</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Human Handoffs</div>
              <div className="text-2xl font-bold">{analytics.triggers.handoffCount}</div>
              <div className="text-xs text-gray-600">
                {analytics.triggers.handoffRate.toFixed(1)}% of messages
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-gray-600">Priority Increased</div>
              <div className="text-2xl font-bold">{analytics.triggers.priorityIncreaseCount}</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm text-gray-600">VIP Routing</div>
              <div className="text-2xl font-bold">{analytics.triggers.vipRoutingCount}</div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Trigger Success Rate</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-600 h-4 rounded-full"
                  style={{ width: `${triggerStats.successRate}%` }}
                />
              </div>
              <span className="font-semibold">{triggerStats.successRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {realtimeOverview && realtimeOverview.recent.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Analysis</h2>
          <div className="space-y-2">
            {realtimeOverview.recent.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <SentimentBadge sentiment={item.sentiment} />
                  <div className="text-sm">
                    <div className="font-medium">{formatIntent(item.intent)}</div>
                    <div className="text-xs text-gray-600">
                      Score: {item.sentimentScore.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Tracking */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Cost Analysis</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Cost</div>
            <div className="text-2xl font-bold">
              ${analytics.costMetrics.totalCost.toFixed(4)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Avg Cost/Message</div>
            <div className="text-2xl font-bold">
              ${analytics.costMetrics.avgCostPerMessage.toFixed(6)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  inverse?: boolean;
  isPercentage?: boolean;
}

function MetricCard({ title, value, subtitle, trend, inverse, isPercentage }: MetricCardProps) {
  const trendColor = trend === undefined ? "" :
    (inverse ? trend < 0 : trend > 0) ? "text-green-600" : trend < 0 ? "text-red-600" : "";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      {trend !== undefined && (
        <div className={`text-xs ${trendColor} mt-1`}>
          {trend > 0 ? "+" : ""}{isPercentage ? trend.toFixed(1) + "%" : trend}
        </div>
      )}
    </div>
  );
}

function SentimentBar({ sentiment, count, total }: { sentiment: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  const colors: Record<string, string> = {
    positive: "bg-green-500",
    negative: "bg-red-500",
    neutral: "bg-gray-400",
    angry: "bg-red-700",
    urgent: "bg-orange-500",
    confused: "bg-yellow-500",
    frustrated: "bg-red-600",
    satisfied: "bg-green-600",
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="capitalize">{sentiment}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colors[sentiment] || "bg-blue-500"} h-2 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-600 mt-1">{percentage.toFixed(1)}%</div>
    </div>
  );
}

function TrendBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div
      className={`${color} rounded`}
      style={{ width: `${percentage}%` }}
      title={`${label}: ${value} (${percentage.toFixed(1)}%)`}
    />
  );
}

function IntentBar({ intent, count, total }: { intent: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{formatIntent(intent)}</span>
        <span className="font-medium">{count} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-purple-600 h-3 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const colors: Record<string, string> = {
    positive: "bg-green-100 text-green-800",
    negative: "bg-red-100 text-red-800",
    neutral: "bg-gray-100 text-gray-800",
    angry: "bg-red-200 text-red-900",
    urgent: "bg-orange-100 text-orange-800",
    confused: "bg-yellow-100 text-yellow-800",
    frustrated: "bg-red-150 text-red-900",
    satisfied: "bg-green-200 text-green-900",
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[sentiment] || "bg-blue-100 text-blue-800"}`}>
      {sentiment}
    </span>
  );
}

function formatIntent(intent: string): string {
  return intent
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
