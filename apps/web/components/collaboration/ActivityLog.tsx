// @ts-nocheck
"use client";

/**
 * Activity Log Component
 * Chronological activity feed with filtering and export
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

interface ActivityLogProps {
  orgId: string;
  conversationId?: Id<"unified_conversations">;
  limit?: number;
}

export function ActivityLog({ orgId, conversationId, limit = 50 }: ActivityLogProps) {
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("week");

  // Query activities
  const activities = useQuery(api.collaboration.activity.getActivities, {
    orgId,
    conversationId,
    activityTypes: typeFilter.length > 0 ? typeFilter : undefined,
    actorId: userFilter,
    limit,
  });

  const activityTypes = [
    { value: "note_created", label: "Note Created", icon: "📝" },
    { value: "note_updated", label: "Note Updated", icon: "✏️" },
    { value: "note_deleted", label: "Note Deleted", icon: "🗑️" },
    { value: "note_pinned", label: "Note Pinned", icon: "📌" },
    { value: "note_unpinned", label: "Note Unpinned", icon: "📌" },
    { value: "assignment_created", label: "Assignment Created", icon: "➕" },
    { value: "assignment_accepted", label: "Assignment Accepted", icon: "✅" },
    { value: "assignment_declined", label: "Assignment Declined", icon: "❌" },
    { value: "assignment_completed", label: "Assignment Completed", icon: "🎉" },
    { value: "mention_created", label: "Mention", icon: "@" },
    { value: "tag_added", label: "Tag Added", icon: "🏷️" },
    { value: "tag_removed", label: "Tag Removed", icon: "🏷️" },
  ];

  const handleExport = () => {
    if (!activities) return;

    const csv = [
      ["Timestamp", "Type", "Actor", "Description"].join(","),
      ...activities.map(a =>
        [
          new Date(a.timestamp).toISOString(),
          a.activityType,
          a.actorName,
          `"${a.description}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter by date range
  const filteredActivities = activities?.filter((activity) => {
    if (dateRange === "all") return true;
    const now = Date.now();
    const activityDate = activity.timestamp;
    
    switch (dateRange) {
      case "today":
        return activityDate > now - 24 * 60 * 60 * 1000;
      case "week":
        return activityDate > now - 7 * 24 * 60 * 60 * 1000;
      case "month":
        return activityDate > now - 30 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  });

  // Group by date
  const groupedActivities = filteredActivities?.reduce((groups, activity) => {
    const date = new Date(activity.timestamp).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Activity Log</h2>
        <button
          onClick={handleExport}
          disabled={!activities || activities.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium mb-2">Time Period</label>
          <div className="flex gap-2">
            {[
              { value: "today", label: "Today" },
              { value: "week", label: "Last 7 Days" },
              { value: "month", label: "Last 30 Days" },
              { value: "all", label: "All Time" },
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value as any)}
                className={`px-3 py-1 rounded-full text-sm ${
                  dateRange === range.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Type Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Activity Types</label>
          <div className="flex gap-2 flex-wrap">
            {activityTypes.map((type) => (
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
      </div>

      {/* Activity Timeline */}
      <div className="space-y-6">
        {!groupedActivities || Object.keys(groupedActivities).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No activities found
          </div>
        ) : (
          Object.entries(groupedActivities)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, activities]) => (
              <div key={date}>
                <div className="text-sm font-semibold text-gray-600 mb-3">{date}</div>
                <div className="space-y-2">
                  {activities.map((activity) => (
                    <ActivityItem key={activity._id} activity={activity} />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: any }) {
  const activityIcons: Record<string, string> = {
    note_created: "📝",
    note_updated: "✏️",
    note_deleted: "🗑️",
    note_pinned: "📌",
    note_unpinned: "📌",
    assignment_created: "➕",
    assignment_accepted: "✅",
    assignment_declined: "❌",
    assignment_completed: "🎉",
    mention_created: "@",
    tag_added: "🏷️",
    tag_removed: "🏷️",
  };

  const activityColors: Record<string, string> = {
    note_created: "bg-blue-100 text-blue-800 border-blue-200",
    note_updated: "bg-yellow-100 text-yellow-800 border-yellow-200",
    note_deleted: "bg-red-100 text-red-800 border-red-200",
    note_pinned: "bg-purple-100 text-purple-800 border-purple-200",
    note_unpinned: "bg-gray-100 text-gray-800 border-gray-200",
    assignment_created: "bg-green-100 text-green-800 border-green-200",
    assignment_accepted: "bg-green-100 text-green-800 border-green-200",
    assignment_declined: "bg-red-100 text-red-800 border-red-200",
    assignment_completed: "bg-blue-100 text-blue-800 border-blue-200",
    mention_created: "bg-indigo-100 text-indigo-800 border-indigo-200",
    tag_added: "bg-teal-100 text-teal-800 border-teal-200",
    tag_removed: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg ${activityColors[activity.activityType] || "bg-gray-100 border-gray-200"}`}>
            {activityIcons[activity.activityType] || "📋"}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900 mb-1">
                {activity.actorName}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {activity.description}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </div>
            </div>

            {/* Type Badge */}
            <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${activityColors[activity.activityType] || "bg-gray-100 text-gray-800"}`}>
              {activity.activityType.replace(/_/g, " ")}
            </span>
          </div>

          {/* Metadata */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <pre className="text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(activity.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
