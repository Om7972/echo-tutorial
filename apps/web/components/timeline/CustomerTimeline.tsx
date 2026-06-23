"use client";

/**
 * Customer Activity Timeline
 * Displays chronological activity feed with filtering, search, and export
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

interface CustomerTimelineProps {
  orgId: string;
  customerId: Id<"unified_customers">;
}

export function CustomerTimeline({ orgId, customerId }: CustomerTimelineProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ start?: number; end?: number }>({});
  const [limit] = useState(50);
  const [paginationId, setPaginationId] = useState<Id<"activity_events"> | undefined>();

  // Queries
  const timeline = useQuery(api.timeline.events.getCustomerTimeline, {
    orgId,
    customerId,
    eventTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    limit,
    paginationId,
  });

  const stats = useQuery(api.timeline.events.getTimelineStats, {
    orgId,
    customerId,
    days: 30,
  });

  const searchResults = searchTerm.length > 2
    ? useQuery(api.timeline.events.searchTimeline, {
        orgId,
        customerId,
        searchTerm,
        limit: 100,
      })
    : null;

  // Export mutation
  const exportMutation = useMutation(api.timeline.events.exportTimeline);

  // Event type options
  const eventTypes = [
    { value: "message_sent", label: "Message Sent", icon: "📤" },
    { value: "message_received", label: "Message Received", icon: "📥" },
    { value: "conversation_started", label: "Conversation Started", icon: "💬" },
    { value: "conversation_resolved", label: "Conversation Resolved", icon: "✅" },
    { value: "note_added", label: "Note Added", icon: "📝" },
    { value: "tag_added", label: "Tag Added", icon: "🏷️" },
    { value: "tag_removed", label: "Tag Removed", icon: "❌" },
    { value: "assigned", label: "Assigned", icon: "👤" },
    { value: "transferred", label: "Transferred", icon: "🔄" },
    { value: "status_changed", label: "Status Changed", icon: "📊" },
    { value: "priority_changed", label: "Priority Changed", icon: "⚡" },
    { value: "sentiment_detected", label: "Sentiment Detected", icon: "😊" },
    { value: "call_made", label: "Call Made", icon: "📞" },
    { value: "email_sent", label: "Email Sent", icon: "✉️" },
  ];

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleExport = async (format: "json" | "csv") => {
    try {
      const result = await exportMutation({
        orgId,
        customerId,
        format,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });

      // Create download
      if (format === "json") {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `timeline-${customerId}-${Date.now()}.json`;
        a.click();
      } else if (format === "csv") {
        const csv = result.data
          .map((row: any[]) => row.map(cell => `"${cell}"`).join(","))
          .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `timeline-${customerId}-${Date.now()}.csv`;
        a.click();
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const loadMore = () => {
    if (timeline?.nextCursor) {
      setPaginationId(timeline.nextCursor);
    }
  };

  const displayEvents = searchResults || timeline?.events || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Activity Timeline</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("json")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Events"
            value={stats.totalEvents}
            subtitle="Last 30 days"
          />
          <StatCard
            title="Most Active"
            value={Object.entries(stats.byType).sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A"}
            subtitle="Event type"
          />
          <StatCard
            title="First Activity"
            value={stats.firstEvent ? new Date(stats.firstEvent).toLocaleDateString() : "N/A"}
            subtitle="Date"
          />
          <StatCard
            title="Last Activity"
            value={stats.lastEvent ? new Date(stats.lastEvent).toLocaleDateString() : "N/A"}
            subtitle="Date"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search timeline..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        {/* Event Type Filters */}
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Event Types</div>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => toggleType(type.value)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTypes.includes(type.value)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
          {selectedTypes.length > 0 && (
            <button
              onClick={() => setSelectedTypes([])}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Start Date</label>
            <input
              type="date"
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  start: e.target.value ? new Date(e.target.value).getTime() : undefined,
                }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">End Date</label>
            <input
              type="date"
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  end: e.target.value ? new Date(e.target.value).getTime() : undefined,
                }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {displayEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No activity found
          </div>
        ) : (
          <>
            {displayEvents.map((event, index) => (
              <TimelineCard key={event._id} event={event} isFirst={index === 0} />
            ))}

            {/* Load More */}
            {timeline?.hasMore && !searchResults && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Event Type Distribution */}
      {stats && Object.keys(stats.byType).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Event Distribution</h2>
          <div className="space-y-2">
            {Object.entries(stats.byType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <EventBar
                  key={type}
                  eventType={type}
                  count={count}
                  total={stats.totalEvents}
                />
              ))}
          </div>
        </div>
      )}

      {/* Daily Activity Chart */}
      {stats && stats.byDay.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Daily Activity</h2>
          <div className="space-y-2">
            {stats.byDay
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 14)
              .map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="text-sm text-gray-600 w-28">{day.date}</div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-6">
                      <div
                        className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max((day.count / stats.totalEvents) * 100 * 5, 5)}%`,
                        }}
                      >
                        <span className="text-xs text-white font-medium">{day.count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components

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

interface TimelineCardProps {
  event: any;
  isFirst: boolean;
}

function TimelineCard({ event, isFirst }: TimelineCardProps) {
  const eventTypeConfig: Record<
    string,
    { icon: string; color: string; bgColor: string }
  > = {
    message_sent: { icon: "📤", color: "text-blue-600", bgColor: "bg-blue-50" },
    message_received: { icon: "📥", color: "text-green-600", bgColor: "bg-green-50" },
    conversation_started: { icon: "💬", color: "text-purple-600", bgColor: "bg-purple-50" },
    conversation_resolved: { icon: "✅", color: "text-green-600", bgColor: "bg-green-50" },
    note_added: { icon: "📝", color: "text-yellow-600", bgColor: "bg-yellow-50" },
    tag_added: { icon: "🏷️", color: "text-indigo-600", bgColor: "bg-indigo-50" },
    tag_removed: { icon: "❌", color: "text-red-600", bgColor: "bg-red-50" },
    assigned: { icon: "👤", color: "text-blue-600", bgColor: "bg-blue-50" },
    transferred: { icon: "🔄", color: "text-orange-600", bgColor: "bg-orange-50" },
    status_changed: { icon: "📊", color: "text-purple-600", bgColor: "bg-purple-50" },
    priority_changed: { icon: "⚡", color: "text-red-600", bgColor: "bg-red-50" },
    sentiment_detected: { icon: "😊", color: "text-pink-600", bgColor: "bg-pink-50" },
    call_made: { icon: "📞", color: "text-teal-600", bgColor: "bg-teal-50" },
    email_sent: { icon: "✉️", color: "text-blue-600", bgColor: "bg-blue-50" },
  };

  const config = eventTypeConfig[event.eventType] || {
    icon: "📋",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`relative ${!isFirst ? "pl-8" : ""}`}>
      {/* Timeline line */}
      {!isFirst && (
        <div className="absolute left-3 top-0 w-0.5 h-full bg-gray-200 -translate-y-4" />
      )}

      <div className="bg-white rounded-lg shadow p-6 relative">
        {/* Icon */}
        <div
          className={`absolute -left-8 top-6 w-6 h-6 ${config.bgColor} rounded-full flex items-center justify-center text-sm`}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold ${config.color}`}>{event.title}</h3>
              <span className="text-xs text-gray-500">{formatDate(event.timestamp)}</span>
            </div>
            {event.description && (
              <p className="text-sm text-gray-700 mb-2">{event.description}</p>
            )}
            {event.performedBy && (
              <div className="text-xs text-gray-500">
                By {event.performedBy} ({event.performedByType || "system"})
              </div>
            )}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                <details>
                  <summary className="cursor-pointer hover:text-gray-700">
                    View details
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-400">
            {new Date(event.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventBar({ eventType, count, total }: { eventType: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  const formatType = (type: string) => {
    return type
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{formatType(eventType)}</span>
        <span className="font-medium">{count} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-600 h-3 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
