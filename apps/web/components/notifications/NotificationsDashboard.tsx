"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface NotificationsDashboardProps {
  orgId: string;
}

export function NotificationsDashboard({ orgId }: NotificationsDashboardProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [selectedNotification, setSelectedNotification] = useState<Id<"notification_queue"> | null>(null);

  const notifications = useQuery(api.notifications.queue.getQueuedNotifications, {
    orgId,
    status: selectedStatus,
    limit: 50,
  });

  const stats = useQuery(api.notifications.queue.getNotificationStats, {
    orgId,
    days: 30,
  });

  const templates = useQuery(api.notifications.templates.getTemplates, {
    orgId,
  });

  const cancelNotification = useMutation(api.notifications.queue.cancelNotification);
  const retryNotification = useMutation(api.notifications.queue.retryNotification);

  const handleCancel = async (notificationId: Id<"notification_queue">) => {
    if (confirm("Are you sure you want to cancel this notification?")) {
      await cancelNotification({ notificationId });
    }
  };

  const handleRetry = async (notificationId: Id<"notification_queue">) => {
    await retryNotification({ notificationId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!notifications || !stats) {
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
          <h2 className="text-2xl font-bold">Notification Service</h2>
          <p className="text-gray-600 mt-1">Email notifications and delivery tracking</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Sent</div>
          <div className="text-3xl font-bold mt-2">{stats.total}</div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Delivered</div>
          <div className="text-3xl font-bold mt-2 text-green-600">{stats.sent}</div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Failed</div>
          <div className="text-3xl font-bold mt-2 text-red-600">{stats.failed}</div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-3xl font-bold mt-2 text-yellow-600">{stats.pending}</div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <div className="text-sm text-gray-600">Success Rate</div>
          <div className="text-3xl font-bold mt-2">{stats.successRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Templates Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Email Templates</h3>
        <div className="grid grid-cols-3 gap-4">
          {templates?.slice(0, 6).map((template) => (
            <div key={template._id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{template.name}</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    template.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {template.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="text-xs text-gray-600">{template.templateType}</div>
              {template.isDefault && (
                <div className="mt-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Default
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        {templates && templates.length > 6 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-700">
              View all {templates.length} templates
            </button>
          </div>
        )}
      </div>

      {/* Notification Type Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Notifications by Type (Last 30 Days)</h3>
        <div className="space-y-3">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium capitalize">
                  {type.replace(/_/g, " ")}
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

      {/* Notifications Queue */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Notification Queue</h3>
            <select
              value={selectedStatus || "all"}
              onChange={(e) => setSelectedStatus(e.target.value === "all" ? undefined : e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Attempts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notifications.map((notification) => (
                <tr
                  key={notification._id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedNotification(notification._id)}
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium">{notification.recipientEmail}</div>
                    {notification.recipientName && (
                      <div className="text-xs text-gray-500">{notification.recipientName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{notification.subject}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs capitalize">
                      {notification.notificationType.replace(/_/g, " ")}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(notification.priority)}`}>
                      {notification.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(notification.status)}`}>
                      {notification.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {notification.attempts} / {notification.maxAttempts}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {notification.status === "pending" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(notification._id);
                          }}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Cancel
                        </button>
                      )}
                      {notification.status === "failed" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(notification._id);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {notifications.length === 0 && (
            <div className="text-center py-12 text-gray-500">No notifications found</div>
          )}
        </div>
      </div>

      {/* Notification Details Modal */}
      {selectedNotification && (
        <NotificationDetailsModal
          notificationId={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </div>
  );
}

function NotificationDetailsModal({
  notificationId,
  onClose,
}: {
  notificationId: Id<"notification_queue">;
  onClose: () => void;
}) {
  const notification = useQuery(api.notifications.queue.getNotification, {
    notificationId,
  });

  if (!notification) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notification Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h4 className="font-medium mb-3">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Recipient:</span>
                <div className="font-medium">{notification.recipientEmail}</div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <div className="font-medium capitalize">{notification.status}</div>
              </div>
              <div>
                <span className="text-gray-600">Priority:</span>
                <div className="font-medium capitalize">{notification.priority}</div>
              </div>
              <div>
                <span className="text-gray-600">Type:</span>
                <div className="font-medium capitalize">
                  {notification.notificationType.replace(/_/g, " ")}
                </div>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div>
            <h4 className="font-medium mb-3">Email Content</h4>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Subject:</span>
                <div className="font-medium">{notification.subject}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">HTML Body:</span>
                <div
                  className="mt-2 p-4 bg-gray-50 rounded border text-sm"
                  dangerouslySetInnerHTML={{ __html: notification.htmlBody }}
                />
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div>
            <h4 className="font-medium mb-3">Delivery Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Attempts:</span>
                <div className="font-medium">
                  {notification.attempts} / {notification.maxAttempts}
                </div>
              </div>
              {notification.sentAt && (
                <div>
                  <span className="text-gray-600">Sent At:</span>
                  <div className="font-medium">{new Date(notification.sentAt).toLocaleString()}</div>
                </div>
              )}
              {notification.failedAt && (
                <div>
                  <span className="text-gray-600">Failed At:</span>
                  <div className="font-medium">{new Date(notification.failedAt).toLocaleString()}</div>
                </div>
              )}
              {notification.lastError && (
                <div className="col-span-2">
                  <span className="text-gray-600">Last Error:</span>
                  <div className="font-medium text-red-600">{notification.lastError}</div>
                </div>
              )}
            </div>
          </div>

          {/* Logs */}
          {notification.logs && notification.logs.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Activity Log</h4>
              <div className="space-y-2">
                {notification.logs.map((log, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <div className="text-xs text-gray-500 w-32">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium capitalize">{log.event}</span>
                      {log.errorMessage && (
                        <div className="text-red-600 text-xs mt-1">{log.errorMessage}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
