// @ts-nocheck
"use client";

/**
 * Audit Trail Component
 * Comprehensive audit log with search, filtering, and export
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

interface AuditTrailProps {
  orgId: string;
  conversationId?: Id<"unified_conversations">;
  targetId?: string;
  limit?: number;
}

export function AuditTrail({
  orgId,
  conversationId,
  targetId,
  limit = 100,
}: AuditTrailProps) {
  const [actionFilter, setActionFilter] = useState<string[]>([]);
  const [targetTypeFilter, setTargetTypeFilter] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");

  // Query audit logs
  const auditLogs = useQuery(api.collaboration.audit.getAuditLogs, {
    orgId,
    conversationId,
    targetId,
    actions: actionFilter.length > 0 ? actionFilter : undefined,
    actorId: userFilter,
    limit,
  });

  const auditActions = [
    { value: "note_create", label: "Note Create", color: "bg-green-100 text-green-800" },
    { value: "note_update", label: "Note Update", color: "bg-yellow-100 text-yellow-800" },
    { value: "note_delete", label: "Note Delete", color: "bg-red-100 text-red-800" },
    { value: "note_view", label: "Note View", color: "bg-blue-100 text-blue-800" },
    { value: "assignment_create", label: "Assignment Create", color: "bg-purple-100 text-purple-800" },
    { value: "assignment_update", label: "Assignment Update", color: "bg-yellow-100 text-yellow-800" },
    { value: "assignment_delete", label: "Assignment Delete", color: "bg-red-100 text-red-800" },
    { value: "permission_change", label: "Permission Change", color: "bg-orange-100 text-orange-800" },
    { value: "access_granted", label: "Access Granted", color: "bg-green-100 text-green-800" },
    { value: "access_denied", label: "Access Denied", color: "bg-red-100 text-red-800" },
  ];

  const targetTypes = ["note", "assignment", "mention", "tag", "permission"];

  const handleExportCSV = () => {
    if (!filteredLogs) return;

    const csv = [
      ["Timestamp", "Action", "Actor", "Target Type", "Target ID", "IP Address", "User Agent", "Changes"].join(","),
      ...filteredLogs.map(log =>
        [
          new Date(log.timestamp).toISOString(),
          log.action,
          log.actorName,
          log.targetType,
          log.targetId,
          log.ipAddress || "",
          `"${log.userAgent || ""}"`,
          `"${JSON.stringify(log.changes || {})}"`,
        ].join(",")
      ),
    ].join("\n");

    downloadFile(csv, `audit-trail-${Date.now()}.csv`, "text/csv");
  };

  const handleExportJSON = () => {
    if (!filteredLogs) return;

    const json = JSON.stringify(filteredLogs, null, 2);
    downloadFile(json, `audit-trail-${Date.now()}.json`, "application/json");
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter logs by search term
  const filteredLogs = auditLogs?.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.actorName.toLowerCase().includes(term) ||
      log.targetType.toLowerCase().includes(term) ||
      (log.description && log.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Audit Trail</h2>
          <p className="text-sm text-gray-600">
            Comprehensive security and compliance audit log
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!filteredLogs || filteredLogs.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            📥 Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            disabled={!filteredLogs || filteredLogs.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            📥 Export JSON
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Search */}
        <div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit logs..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Action Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Actions</label>
          <div className="flex gap-2 flex-wrap">
            {auditActions.map((action) => (
              <button
                key={action.value}
                onClick={() => {
                  if (actionFilter.includes(action.value)) {
                    setActionFilter(actionFilter.filter(a => a !== action.value));
                  } else {
                    setActionFilter([...actionFilter, action.value]);
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  actionFilter.includes(action.value)
                    ? action.color
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Type Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Target Types</label>
          <div className="flex gap-2 flex-wrap">
            {targetTypes.map((type) => (
              <button
                key={type}
                onClick={() => {
                  if (targetTypeFilter.includes(type)) {
                    setTargetTypeFilter(targetTypeFilter.filter(t => t !== type));
                  } else {
                    setTargetTypeFilter([...targetTypeFilter, type]);
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm capitalize ${
                  targetTypeFilter.includes(type)
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      {filteredLogs && (
        <div className="text-sm text-gray-600">
          Showing {filteredLogs.length} of {auditLogs?.length || 0} audit entries
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {!filteredLogs || filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit logs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map((log) => (
                  <AuditLogRow key={log._id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Audit Log Row Component
function AuditLogRow({ log }: { log: any }) {
  const [showDetails, setShowDetails] = useState(false);

  const actionColors: Record<string, string> = {
    note_create: "bg-green-100 text-green-800",
    note_update: "bg-yellow-100 text-yellow-800",
    note_delete: "bg-red-100 text-red-800",
    note_view: "bg-blue-100 text-blue-800",
    assignment_create: "bg-purple-100 text-purple-800",
    assignment_update: "bg-yellow-100 text-yellow-800",
    assignment_delete: "bg-red-100 text-red-800",
    permission_change: "bg-orange-100 text-orange-800",
    access_granted: "bg-green-100 text-green-800",
    access_denied: "bg-red-100 text-red-800",
  };

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
          {new Date(log.timestamp).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${actionColors[log.action] || "bg-gray-100 text-gray-800"}`}>
            {log.action.replace(/_/g, " ")}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-900">
          {log.actorName}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          <div className="capitalize">{log.targetType}</div>
          <div className="text-xs text-gray-500">{log.targetId}</div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
          {log.ipAddress || "—"}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showDetails ? "Hide" : "Show"} Details
          </button>
        </td>
      </tr>
      {showDetails && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-gray-50">
            <div className="space-y-2 text-sm">
              {log.description && (
                <div>
                  <span className="font-medium">Description:</span> {log.description}
                </div>
              )}
              {log.userAgent && (
                <div>
                  <span className="font-medium">User Agent:</span>
                  <div className="text-xs text-gray-600 font-mono mt-1">{log.userAgent}</div>
                </div>
              )}
              {log.changes && Object.keys(log.changes).length > 0 && (
                <div>
                  <span className="font-medium">Changes:</span>
                  <pre className="text-xs text-gray-700 bg-white p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(log.changes, null, 2)}
                  </pre>
                </div>
              )}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div>
                  <span className="font-medium">Metadata:</span>
                  <pre className="text-xs text-gray-700 bg-white p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
