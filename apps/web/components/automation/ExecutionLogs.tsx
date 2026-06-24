"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ExecutionLogsProps {
  workflowId: Id<"automation_workflows">;
  orgId: string;
}

export function ExecutionLogs({ workflowId, orgId }: ExecutionLogsProps) {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedExecution, setSelectedExecution] = useState<Id<"automation_executions"> | null>(
    null
  );

  const executions = useQuery(api.automation.logs.getExecutions, {
    workflowId,
    limit: 50,
    status: statusFilter,
  });

  const executionDetails = useQuery(
    api.automation.logs.getExecution,
    selectedExecution ? { executionId: selectedExecution } : "skip"
  );

  const stats = useQuery(api.automation.logs.getExecutionStats, {
    orgId,
    days: 30,
  });

  const formatDuration = (startedAt: number, completedAt?: number) => {
    if (!completedAt) return "Running...";
    const duration = completedAt - startedAt;
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      case "info":
        return "text-blue-600";
      case "debug":
        return "text-gray-600";
      default:
        return "text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Executions</div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-600">Success Rate</div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              {stats.successRate.toFixed(1)}%
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-600">Failed</div>
            <div className="text-2xl font-bold mt-1 text-red-600">{stats.failed}</div>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-sm text-gray-600">Avg Duration</div>
            <div className="text-2xl font-bold mt-1">
              {(stats.avgExecutionTimeMs / 1000).toFixed(2)}s
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Executions List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Execution History</h3>

              <select
                value={statusFilter || "all"}
                onChange={(e) =>
                  setStatusFilter(e.target.value === "all" ? undefined : e.target.value)
                }
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="divide-y max-h-[600px] overflow-y-auto">
            {executions && executions.length > 0 ? (
              executions.map((execution) => (
                <div
                  key={execution._id}
                  onClick={() => setSelectedExecution(execution._id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedExecution === execution._id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${getStatusColor(
                        execution.status
                      )}`}
                    >
                      {execution.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDuration(execution.startedAt, execution.completedAt)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    Step {execution.currentStep} / {execution.totalSteps}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(execution.startedAt).toLocaleString()}
                  </div>

                  {execution.errorMessage && (
                    <div className="text-xs text-red-600 mt-2 truncate">
                      {execution.errorMessage}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No executions found
              </div>
            )}
          </div>
        </div>

        {/* Execution Details */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Execution Logs</h3>
          </div>

          <div className="p-4 max-h-[600px] overflow-y-auto">
            {executionDetails ? (
              <div className="space-y-4">
                {/* Execution Info */}
                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${getStatusColor(
                        executionDetails.status
                      )}`}
                    >
                      {executionDetails.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Duration:</span>
                    <span className="text-sm">
                      {formatDuration(
                        executionDetails.startedAt,
                        executionDetails.completedAt
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress:</span>
                    <span className="text-sm">
                      {executionDetails.currentStep} / {executionDetails.totalSteps} steps
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Actions Executed:</span>
                    <span className="text-sm">{executionDetails.actionsExecuted}</span>
                  </div>

                  {executionDetails.actionsFailed > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Actions Failed:</span>
                      <span className="text-sm text-red-600">
                        {executionDetails.actionsFailed}
                      </span>
                    </div>
                  )}
                </div>

                {/* Logs */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Execution Log:</h4>

                  {executionDetails.logs && executionDetails.logs.length > 0 ? (
                    <div className="space-y-2 font-mono text-xs">
                      {executionDetails.logs.map((log, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded">
                          <div className="flex items-start gap-2">
                            <span className={`font-semibold ${getLevelColor(log.level)}`}>
                              [{log.level.toUpperCase()}]
                            </span>
                            <div className="flex-1">
                              <div className="font-semibold">{log.step}</div>
                              <div className="text-gray-600">{log.message}</div>
                              {log.errorMessage && (
                                <div className="text-red-600 mt-1">
                                  Error: {log.errorMessage}
                                </div>
                              )}
                              {log.details && (
                                <pre className="mt-1 text-gray-500 overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </div>
                            <span className="text-gray-400 text-xs">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No logs available</p>
                  )}
                </div>
              </div>
            ) : selectedExecution ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Loading execution details...</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select an execution to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
