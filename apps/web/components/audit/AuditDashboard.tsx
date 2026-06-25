// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface AuditDashboardProps {
  orgId: string;
}

export function AuditDashboard({ orgId }: AuditDashboardProps) {
  const [selectedAction, setSelectedAction] = useState<string | undefined>();
  const [selectedUser, setSelectedUser] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  const getDateRangeTimestamps = () => {
    const now = Date.now();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return {
      dateFrom: now - days * 24 * 60 * 60 * 1000,
      dateTo: now,
    };
  };

  const { dateFrom, dateTo } = getDateRangeTimestamps();

  const logs = useQuery(
    api.audit.logs.getAuditLogs,
    searchTerm
      ? "skip"
      : {
          orgId,
          action: selectedAction,
          userId: selectedUser,
          dateFrom,
          dateTo,
          limit: 100,
        }
  );

  const searchResults = useQuery(
    api.audit.logs.searchAuditLogs,
    searchTerm
      ? {
          orgId,
          searchTerm,
          limit: 100,
        }
      : "skip"
  );

  const stats = useQuery(api.audit.logs.getAuditStats, {
    orgId,
    days: dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90,
  });

  const exportLogs = useQuery(
    api.audit.logs.exportAuditLogs,
    dateFrom && dateTo ? { orgId, dateFrom, dateTo } : "skip"
  );

  const displayLogs = searchTerm ? searchResults : logs;

  const handleExport = () => {
    if (!exportLogs || exportLogs.length === 0) return;

    const headers = Object.keys(exportLogs[0]);
    const rows = exportLogs.map((row: any) =>
      headers.map((header) => row[header])
    );

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    if (action.includes("delete") || action.includes("revoke"))
      return "bg-red-100 text-red-800";
    if (action.includes("create") || action.includes("login"))
      return "bg-green-100 text-green-800";
    if (action.includes("edit") || action.includes("update"))
      return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getActionIcon = (action: string) => {
    if (action.includes("login")) return "🔑";
    if (action.includes("delete")) return "🗑️";
    if (action.includes("create")) return "✨";
    if (action.includes("edit")) return "✏️";
    if (action.includes("export")) return "📥";
    if (action.includes("role")) return "👤";
    if (action.includes("billing")) return "💳";
    if (action.includes("api_key")) return "🔐";
    return "📝";
  };

  if (!displayLogs || !stats) {
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
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-gray-600 mt-1">
            Track all system activities for compliance and security
          </p>
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
            onClick={handleExport}
            disabled={!exportLogs || exportLogs.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Events</div>
          <div className="text-3xl font-bold mt-2">{stats.total}</div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Success Rate</div>
          <div className="text-3xl font-bold mt-2 text-green-600">
            {stats.successRate.toFixed(1)}%
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Security Events</div>
          <div className="text-3xl font-bold mt-2 text-orange-600">
            {stats.securityEvents}
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Failed Events</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {stats.failed}
          </div>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Activity by Type</h3>
          <div className="space-y-3">
            {Object.entries(stats.byAction)
              .sort(([, a]: any, [, b]: any) => b - a)
              .slice(0, 8)
              .map(([action, count]: any) => (
                <div key={action} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xl">{getActionIcon(action)}</span>
                    <span className="text-sm font-medium capitalize">
                      {action.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(count / stats.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold ml-4">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Users</h3>
          <div className="space-y-3">
            {stats.topUsers.map((user: any, index: number) => (
              <div
                key={user.userId}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-4">
                    {index + 1}.
                  </span>
                  <span className="text-sm font-medium">{user.userId}</span>
                </div>
                <span className="text-sm font-semibold">{user.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Action
            </label>
            <select
              value={selectedAction || "all"}
              onChange={(e) =>
                setSelectedAction(e.target.value === "all" ? undefined : e.target.value)
              }
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="all">All Actions</option>
              {Object.keys(stats.byAction).map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by User
            </label>
            <select
              value={selectedUser || "all"}
              onChange={(e) =>
                setSelectedUser(e.target.value === "all" ? undefined : e.target.value)
              }
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="all">All Users</option>
              {stats.topUsers.map((user: any) => (
                <option key={user.userId} value={user.userId}>
                  {user.userId}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayLogs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium">
                        {log.userName || log.userId}
                      </div>
                      {log.userEmail && (
                        <div className="text-xs text-gray-500">
                          {log.userEmail}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${getActionColor(log.action)}`}
                    >
                      {getActionIcon(log.action)} {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.resource && (
                      <div className="text-sm">
                        <div className="font-medium capitalize">
                          {log.resource}
                        </div>
                        {log.resourceId && (
                          <div className="text-xs text-gray-500">
                            {log.resourceId}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {log.success ? (
                      <span className="text-green-600 text-sm">✓ Success</span>
                    ) : (
                      <span className="text-red-600 text-sm">✗ Failed</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {log.ipAddress || "-"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {displayLogs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No audit logs found
            </div>
          )}
        </div>
      </div>

      {/* Retention Policy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-blue-600 text-xl">ℹ️</span>
          <div>
            <h4 className="font-medium text-blue-900">Retention Policy</h4>
            <p className="text-sm text-blue-700 mt-1">
              Audit logs are retained for 90 days for compliance purposes. Export
              logs regularly if you need longer retention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
