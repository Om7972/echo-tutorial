"use client";

/**
 * Notification Panel Component
 * Real-time notifications with filtering and actions
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

interface NotificationPanelProps {
  orgId: string;
  currentUserId: string;
}

export function NotificationPanel({ orgId, currentUserId }: NotificationPanelProps) {
  const [showUnreadOnly, setShowUnreadOnly] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  // Queries
  const notifications = useQuery(api.collaboration.notifications.getUserNotifications, {
    orgId,
    userId: currentUserId,
    isRead: showUnreadOnly ? false : undefined,
    type: typeFilter.length > 0 ? typeFilter : undefined,
    limit: 50,
  });

  const unreadCount = useQuery(api.collaboration.notifications.getUnreadCount, {
    orgId,
    userId: currentUserId,
  });

  // Mutations
  const markAsRead = useMutation(api.collaboration.notifications.markAsRead);
  const markAllAsRead = useMutation(api.collaboration.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.collaboration.notifications.deleteNotification);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead({
        notificationId: notificationId as Id<"collaboration_notifications">,
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({
        orgId,
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification({
        notificationId: notificationId as Id<"collaboration_notifications">,
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const notificationTypes = [
    { value: "mention", label: "Mentions", icon: "@" },
    { value: "assignment", label: "Assignments", icon: "📋" },
    { value: "note_reply", label: "Replies", icon: "💬" },
    { value: "status_change", label: "Status", icon: "🔄" },
    { value: "due_date", label: "Due Dates", icon: "⏰" },
    { value: "escalation", label: "Escalations", icon: "⚠️" },
    { value: "approval_request", label: "Approvals", icon: "✓" },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Notifications</h2>
            {unreadCount && (
              <p className="text-sm text-gray-600">
                {unreadCount.total} unread notification{unreadCount.total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {unreadCount && unreadCount.total > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Type Filter Badges */}
        {unreadCount && unreadCount.byType && Object.keys(unreadCount.byType).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {notificationTypes.map((type) => {
              const count = unreadCount.byType[type.value] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={type.value}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                >
                  {type.icon} {type.label} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border-b p-4">
        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`px-3 py-1 rounded-full text-sm ${
              showUnreadOnly
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Unread Only
          </button>

          <div className="h-4 w-px bg-gray-300" />

          {notificationTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => {
                if (typeFilter.includes(type.value)) {
                  setTypeFilter(typeFilter.filter(t => t !== type.value));
                } else {
                  setTypeFilter([...typeFilter, type.value]);
                }
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                typeFilter.includes(type.value)
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {!notifications || notifications.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">🔔</div>
              <p>No notifications</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={() => handleMarkAsRead(notification._id)}
                onDelete={() => handleDelete(notification._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Notification Item Component
interface NotificationItemProps {
  notification: any;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const typeIcons: Record<string, string> = {
    mention: "@",
    assignment: "📋",
    note_reply: "💬",
    status_change: "🔄",
    due_date: "⏰",
    escalation: "⚠️",
    approval_request: "✓",
  };

  const typeColors: Record<string, string> = {
    mention: "bg-blue-50 border-blue-200",
    assignment: "bg-purple-50 border-purple-200",
    note_reply: "bg-green-50 border-green-200",
    status_change: "bg-yellow-50 border-yellow-200",
    due_date: "bg-orange-50 border-orange-200",
    escalation: "bg-red-50 border-red-200",
    approval_request: "bg-indigo-50 border-indigo-200",
  };

  const bgClass = notification.isRead
    ? "bg-white"
    : typeColors[notification.type] || "bg-blue-50 border-blue-200";

  return (
    <div className={`p-4 border-l-4 hover:bg-gray-50 transition-colors ${bgClass}`}>
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center text-lg">
            {typeIcons[notification.type] || "🔔"}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`font-semibold text-sm ${!notification.isRead ? "text-gray-900" : "text-gray-700"}`}>
              {notification.title}
            </h3>
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
            )}
          </div>

          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>

          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            <span>{new Date(notification.createdAt).toLocaleString()}</span>
            {notification.actorName && (
              <>
                <span>•</span>
                <span>by {notification.actorName}</span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {notification.actionUrl && (
              <a
                href={notification.actionUrl}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                onClick={onMarkAsRead}
              >
                {notification.actionText || "View"}
              </a>
            )}
            {!notification.isRead && (
              <button
                onClick={onMarkAsRead}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Mark as read
              </button>
            )}
            <button
              onClick={onDelete}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
