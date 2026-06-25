// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface EnterpriseDashboardProps {
  orgId: string;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export function EnterpriseDashboard({ orgId }: EnterpriseDashboardProps) {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
  const [comparePeriods, setComparePeriods] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;

    const dateTo = now.toISOString().split("T")[0];
    const dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    return { dateFrom, dateTo };
  };

  const { dateFrom, dateTo } = getDateRange();

  const analytics = useQuery(api.analytics.enterprise.getEnterpriseAnalytics, {
    orgId,
    dateFrom,
    dateTo,
  });

  const summary = useQuery(api.analytics.enterprise.getAnalyticsSummary, {
    orgId,
    dateFrom,
    dateTo,
  });

  // Calculate previous period for comparison
  const comparison = useQuery(
    api.analytics.enterprise.comparePeriods,
    comparePeriods
      ? {
          orgId,
          period1From: dateFrom,
          period1To: dateTo,
          period2From: new Date(
            new Date(dateFrom!).getTime() - (dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90) * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
          period2To: new Date(new Date(dateFrom!).getTime() - 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        }
      : "skip"
  );

  const exportToCSV = () => {
    if (!analytics || analytics.length === 0) return;

    const headers = [
      "Date",
      "Total Conversations",
      "Avg Response Time (ms)",
      "AI Accuracy %",
      "Handoff Rate %",
      "CSAT Score",
      "Sentiment Score",
      "Total Cost USD",
    ];

    const rows = analytics.map((day: any) => [
      day.date,
      day.totalConversations,
      day.avgResponseTimeMs.toFixed(0),
      day.aiAccuracyRate.toFixed(1),
      day.humanHandoffRate.toFixed(1),
      day.avgCsatScore.toFixed(2),
      day.avgSentimentScore.toFixed(2),
      day.totalCostUSD.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enterprise-analytics-${dateFrom}-to-${dateTo}.csv`;
    a.click();
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (!analytics || !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Prepare chart data
  const responseTimeData = analytics.map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    responseTime: day.avgResponseTimeMs / 1000, // Convert to seconds
    resolutionTime: day.avgResolutionTimeMs / 1000,
  }));

  const volumeData = analytics.map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    new: day.newConversations,
    resolved: day.resolvedConversations,
    open: day.openConversations,
  }));

  const aiMetricsData = analytics.map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    accuracy: day.aiAccuracyRate,
    handoffRate: day.humanHandoffRate,
  }));

  const csatData = analytics.map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    csat: day.avgCsatScore,
    sentiment: (day.avgSentimentScore + 1) * 2.5, // Convert -1 to 1 scale to 0 to 5
  }));

  const costData = analytics.map((day) => ({
    date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    cost: day.totalCostUSD,
  }));

  const channelData = [
    { name: "Email", value: summary.channelBreakdown.email },
    { name: "Chat", value: summary.channelBreakdown.chat },
    { name: "Phone", value: summary.channelBreakdown.phone },
    { name: "Social", value: summary.channelBreakdown.social },
    { name: "Other", value: summary.channelBreakdown.other },
  ].filter((item) => item.value > 0);

  const priorityData = [
    { name: "Low", value: summary.priorityBreakdown.low },
    { name: "Medium", value: summary.priorityBreakdown.medium },
    { name: "High", value: summary.priorityBreakdown.high },
    { name: "Urgent", value: summary.priorityBreakdown.urgent },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enterprise Analytics</h2>
          <p className="text-gray-600 mt-1">Comprehensive performance metrics</p>
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

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={comparePeriods}
              onChange={(e) => setComparePeriods(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Compare periods</span>
          </label>

          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          title="Avg Response Time"
          value={formatTime(summary.avgFirstResponseTimeMs)}
          change={comparison?.changes.avgResponseTimeMs}
          inverse
        />
        <MetricCard
          title="Total Conversations"
          value={summary.totalConversations.toString()}
          change={comparison?.changes.totalConversations}
        />
        <MetricCard
          title="AI Accuracy"
          value={`${summary.aiAccuracyRate.toFixed(1)}%`}
          change={comparison?.changes.aiAccuracyRate}
        />
        <MetricCard
          title="CSAT Score"
          value={summary.avgCsatScore.toFixed(2)}
          change={comparison?.changes.avgCsatScore}
        />
        <MetricCard
          title="Total Cost"
          value={`$${summary.totalCostUSD.toFixed(2)}`}
          change={comparison?.changes.totalCostUSD}
          inverse
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Response Times */}
        <ChartCard title="Response & Resolution Times">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: "Seconds", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke="#3B82F6"
                name="Response Time"
              />
              <Line
                type="monotone"
                dataKey="resolutionTime"
                stroke="#10B981"
                name="Resolution Time"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Conversation Volume */}
        <ChartCard title="Conversation Volume">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="new" fill="#3B82F6" name="New" />
              <Bar dataKey="resolved" fill="#10B981" name="Resolved" />
              <Bar dataKey="open" fill="#F59E0B" name="Open" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* AI Metrics */}
        <ChartCard title="AI Performance">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={aiMetricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: "Percentage", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="accuracy" stroke="#10B981" name="AI Accuracy %" />
              <Line
                type="monotone"
                dataKey="handoffRate"
                stroke="#EF4444"
                name="Handoff Rate %"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* CSAT & Sentiment */}
        <ChartCard title="CSAT & Sentiment Scores">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={csatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="csat" stroke="#3B82F6" name="CSAT Score" />
              <Line type="monotone" dataKey="sentiment" stroke="#8B5CF6" name="Sentiment Score" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Token Costs */}
        <ChartCard title="AI Token Costs">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: "USD", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Bar dataKey="cost" fill="#F59E0B" name="Daily Cost" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Channel Breakdown */}
        <ChartCard title="Conversations by Channel">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={channelData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {channelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Priority Breakdown</h3>
          <div className="space-y-2">
            {priorityData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-sm">{item.name}</span>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Efficiency Metrics</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-500">Avg Resolution Time</div>
              <div className="text-lg font-semibold">
                {formatTime(summary.avgResolutionTimeMs)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Conversations per Day</div>
              <div className="text-lg font-semibold">
                {(summary.totalConversations / analytics.length).toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Resolution Rate</div>
              <div className="text-lg font-semibold">
                {((summary.resolvedConversations / summary.totalConversations) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Sentiment Analysis</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <span className="text-green-600">●</span> Positive
              </span>
              <span className="text-sm font-semibold">
                {((analytics.reduce((sum, d) => sum + d.positiveCount, 0) / summary.totalConversations) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <span className="text-gray-600">●</span> Neutral
              </span>
              <span className="text-sm font-semibold">
                {((analytics.reduce((sum, d) => sum + d.neutralCount, 0) / summary.totalConversations) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <span className="text-red-600">●</span> Negative
              </span>
              <span className="text-sm font-semibold">
                {((analytics.reduce((sum, d) => sum + d.negativeCount, 0) / summary.totalConversations) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components

function MetricCard({
  title,
  value,
  change,
  inverse = false,
}: {
  title: string;
  value: string;
  change?: { value: number; percentage: number };
  inverse?: boolean;
}) {
  const isPositive = change ? (inverse ? change.percentage < 0 : change.percentage > 0) : undefined;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      {change && (
        <div
          className={`text-sm mt-2 ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {isPositive ? "↑" : "↓"} {Math.abs(change.percentage).toFixed(1)}% vs previous period
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}
