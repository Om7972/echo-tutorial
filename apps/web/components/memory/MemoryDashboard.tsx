// @ts-nocheck
"use client";

/**
 * Memory Dashboard Component
 * Displays memory analytics, health score, and cost tracking
 */

import { useState } from "react";
import { useMemoryAnalytics } from "@/lib/memory/MemoryService";
import { formatCost } from "@/lib/memory/MemoryService";

interface MemoryDashboardProps {
  orgId: string;
}

export function MemoryDashboard({ orgId }: MemoryDashboardProps) {
  const [days, setDays] = useState(30);
  const analytics = useMemoryAnalytics(orgId);

  const memoryAnalytics = analytics.getAnalytics();
  const costBreakdown = analytics.getCostBreakdown();
  const usageTrends = analytics.getUsageTrends(days);
  const healthScore = analytics.healthScore;
  const topMemories = analytics.topMemories;

  if (!memoryAnalytics) {
    return <div>Loading memory analytics...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Memory System Dashboard</h1>

      {/* Health Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">System Health</h2>
        {healthScore && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl font-bold">{healthScore.score}</div>
              <div>
                <div className="text-2xl font-semibold">Grade: {healthScore.grade}</div>
                <div className="text-gray-600">Health Score</div>
              </div>
            </div>

            {healthScore.issues.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-red-600 mb-2">Issues:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {healthScore.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-gray-700">{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {healthScore.recommendations.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-blue-600 mb-2">Recommendations:</h3>
                <ul className="list-disc list-inside space-y-1">
                  {healthScore.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-700">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Memories"
          value={memoryAnalytics.totals.totalMemories}
          subtitle={`${memoryAnalytics.totals.shortTermMemories} short-term`}
        />
        <StatCard
          title="Embeddings"
          value={memoryAnalytics.totals.totalEmbeddings}
          subtitle="Vector embeddings"
        />
        <StatCard
          title="Total Cost"
          value={formatCost(memoryAnalytics.totals.totalCostUSD)}
          subtitle={`Avg: ${formatCost(memoryAnalytics.averages.avgCostPerDay)}/day`}
        />
        <StatCard
          title="Retrievals"
          value={memoryAnalytics.totals.totalRetrievals}
          subtitle={`${memoryAnalytics.averages.avgRetrievalTimeMs.toFixed(0)}ms avg`}
        />
      </div>

      {/* Cost Breakdown */}
      {costBreakdown && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Cost Breakdown</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>Summarization</span>
                <span className="font-semibold">
                  {formatCost(costBreakdown.breakdown.summarization.cost)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${costBreakdown.breakdown.summarization.percentage}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {costBreakdown.breakdown.summarization.percentage.toFixed(1)}% of total
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span>Embeddings</span>
                <span className="font-semibold">
                  {formatCost(costBreakdown.breakdown.embeddings.cost)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${costBreakdown.breakdown.embeddings.percentage}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {costBreakdown.breakdown.embeddings.percentage.toFixed(1)}% of total
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Trends */}
      {usageTrends && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Usage Trends</h2>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border rounded-md"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          
          <div className="mb-4">
            <div className="text-sm text-gray-600">Growth Rate</div>
            <div className={`text-2xl font-semibold ${usageTrends.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {usageTrends.growthRate >= 0 ? '+' : ''}{usageTrends.growthRate.toFixed(1)}%
            </div>
          </div>

          {/* Simple chart - in production use a charting library */}
          <div className="space-y-2">
            {usageTrends.trends.slice(-10).map((trend, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-xs text-gray-600 w-20">{trend.date}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-purple-600 h-4 rounded-full"
                    style={{
                      width: `${Math.min((trend.totalMemories / Math.max(...usageTrends.trends.map(t => t.totalMemories))) * 100, 100)}%`
                    }}
                  />
                </div>
                <div className="text-sm font-medium w-16 text-right">{trend.totalMemories}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Memories */}
      {topMemories && topMemories.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Most Accessed Memories</h2>
          <div className="space-y-3">
            {topMemories.map((memory) => (
              <div key={memory.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium">{memory.type}</div>
                  <div className="text-sm text-gray-600">{memory.accessCount} accesses</div>
                </div>
                <div className="text-sm text-gray-700">{memory.preview}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Last accessed: {new Date(memory.lastAccessedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}
