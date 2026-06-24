"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface WebhookDashboardProps {
  orgId: string;
  userId: string;
}

const AVAILABLE_EVENTS = [
  "conversation.created",
  "conversation.updated",
  "conversation.closed",
  "message.received",
  "message.sent",
  "ticket.created",
  "ticket.closed",
  "handoff.started",
  "handoff.completed",
  "payment.success",
  "payment.failed",
  "subscription.created",
  "subscription.updated",
  "subscription.cancelled",
  "*",
];

export function WebhookDashboard({ orgId, userId }: WebhookDashboardProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Id<"webhooks"> | null>(null);

  const webhooks = useQuery(api.webhooks.endpoints.getWebhooks, {
    orgId,
    activeOnly: false,
  });

  if (!webhooks) {
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
          <h2 className="text-2xl font-bold">Webhooks</h2>
          <p className="text-gray-600 mt-1">
            Send real-time events to external services
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create Webhook
        </button>
      </div>

      {/* Webhooks List */}
      <div className="grid gap-4">
        {webhooks.map((webhook) => (
          <WebhookCard
            key={webhook._id}
            webhook={webhook}
            onSelect={() => setSelectedWebhook(webhook._id)}
          />
        ))}

        {webhooks.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-4xl mb-4">🪝</div>
            <h3 className="text-lg font-semibold mb-2">No webhooks yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first webhook to start receiving events
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Webhook
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateWebhookModal
          orgId={orgId}
          userId={userId}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Details Modal */}
      {selectedWebhook && (
        <WebhookDetailsModal
          webhookId={selectedWebhook}
          onClose={() => setSelectedWebhook(null)}
        />
      )}
    </div>
  );
}

function WebhookCard({
  webhook,
  onSelect,
}: {
  webhook: any;
  onSelect: () => void;
}) {
  const stats = useQuery(api.webhooks.endpoints.getWebhookStats, {
    webhookId: webhook._id,
    days: 7,
  });

  const toggleStatus = useMutation(api.webhooks.endpoints.toggleWebhookStatus);
  const testWebhook = useMutation(api.webhooks.endpoints.testWebhook);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleStatus({
      webhookId: webhook._id,
      isActive: !webhook.isActive,
    });
  };

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await testWebhook({ webhookId: webhook._id });
    alert("Test webhook sent!");
  };

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{webhook.name}</h3>
            <span
              className={`px-2 py-1 text-xs rounded ${
                webhook.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {webhook.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="text-sm text-gray-600 mb-3">{webhook.url}</div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-600">Events:</span>{" "}
              <span className="font-medium">{webhook.events.length}</span>
            </div>
            {stats && (
              <>
                <div>
                  <span className="text-gray-600">Success Rate:</span>{" "}
                  <span className="font-medium text-green-600">
                    {stats.successRate.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Last 7d:</span>{" "}
                  <span className="font-medium">{stats.total} deliveries</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTest}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Test
          </button>
          <button
            onClick={handleToggle}
            className={`px-3 py-1 text-sm rounded ${
              webhook.isActive
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            {webhook.isActive ? "Disable" : "Enable"}
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="mt-4 flex flex-wrap gap-2">
        {webhook.events.slice(0, 5).map((event: string) => (
          <span
            key={event}
            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
          >
            {event}
          </span>
        ))}
        {webhook.events.length > 5 && (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
            +{webhook.events.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}

function CreateWebhookModal({
  orgId,
  userId,
  onClose,
}: {
  orgId: string;
  userId: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["*"]);
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([]);

  const createWebhook = useMutation(api.webhooks.endpoints.createWebhook);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createWebhook({
      orgId,
      name,
      url,
      events: selectedEvents,
      isActive: true,
      headers: customHeaders.length > 0 ? customHeaders : undefined,
      createdBy: userId,
    });

    onClose();
  };

  const toggleEvent = (event: string) => {
    if (event === "*") {
      setSelectedEvents(["*"]);
    } else {
      setSelectedEvents((prev) => {
        const filtered = prev.filter((e) => e !== "*");
        if (filtered.includes(event)) {
          return filtered.filter((e) => e !== event);
        }
        return [...filtered, event];
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">Create Webhook</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="My Webhook"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endpoint URL *
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://api.example.com/webhooks"
                className="w-full px-4 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be a valid HTTPS URL
              </p>
            </div>

            {/* Events */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Events to Subscribe *
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                {AVAILABLE_EVENTS.map((event) => (
                  <label key={event} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="rounded"
                    />
                    <span className="text-sm">{event}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Headers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Headers (Optional)
              </label>
              <button
                type="button"
                onClick={() =>
                  setCustomHeaders([...customHeaders, { key: "", value: "" }])
                }
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Header
              </button>
              {customHeaders.map((header, index) => (
                <div key={index} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => {
                      const updated = [...customHeaders];
                      updated[index].key = e.target.value;
                      setCustomHeaders(updated);
                    }}
                    placeholder="Header name"
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) => {
                      const updated = [...customHeaders];
                      updated[index].value = e.target.value;
                      setCustomHeaders(updated);
                    }}
                    placeholder="Header value"
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCustomHeaders(customHeaders.filter((_, i) => i !== index))
                    }
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Webhook
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WebhookDetailsModal({
  webhookId,
  onClose,
}: {
  webhookId: Id<"webhooks">;
  onClose: () => void;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"details" | "deliveries" | "logs">(
    "details"
  );

  const webhook = useQuery(api.webhooks.endpoints.getWebhook, { webhookId });
  const stats = useQuery(api.webhooks.endpoints.getWebhookStats, {
    webhookId,
    days: 30,
  });
  const deliveries = useQuery(api.webhooks.delivery.getWebhookDeliveries, {
    webhookId,
    limit: 50,
  });

  const deleteWebhook = useMutation(api.webhooks.endpoints.deleteWebhook);
  const rotateSecret = useMutation(api.webhooks.endpoints.rotateWebhookSecret);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this webhook?")) {
      await deleteWebhook({ webhookId });
      onClose();
    }
  };

  const handleRotateSecret = async () => {
    if (confirm("Rotate webhook secret? You'll need to update your endpoint.")) {
      await rotateSecret({ webhookId });
      alert("Secret rotated successfully!");
    }
  };

  if (!webhook || !stats) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{webhook.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{webhook.url}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Deliveries</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Success</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.success}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Avg Response</div>
              <div className="text-2xl font-bold">
                {stats.avgResponseTime.toFixed(0)}ms
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setSelectedTab("details")}
              className={`px-6 py-3 font-medium ${
                selectedTab === "details"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setSelectedTab("deliveries")}
              className={`px-6 py-3 font-medium ${
                selectedTab === "deliveries"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600"
              }`}
            >
              Deliveries
            </button>
            <button
              onClick={() => setSelectedTab("logs")}
              className={`px-6 py-3 font-medium ${
                selectedTab === "logs"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600"
              }`}
            >
              Logs
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {selectedTab === "details" && (
            <div className="space-y-6">
              {/* Signing Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signing Secret
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={webhook.secret}
                    readOnly
                    className="flex-1 px-4 py-2 border rounded-lg bg-gray-50"
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    {showSecret ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={handleRotateSecret}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Rotate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use this to verify webhook signatures
                </p>
              </div>

              {/* Events */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscribed Events
                </label>
                <div className="flex flex-wrap gap-2">
                  {webhook.events.map((event: string) => (
                    <span
                      key={event}
                      className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>

              {/* Retry Policy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retry Policy
                </label>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Max Retries</div>
                      <div className="font-medium">
                        {webhook.retryPolicy.maxRetries}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Retry Delay</div>
                      <div className="font-medium">
                        {webhook.retryPolicy.retryDelay}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Exponential Backoff</div>
                      <div className="font-medium">
                        {webhook.retryPolicy.exponentialBackoff ? "Yes" : "No"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-medium text-red-600 mb-3">
                  Danger Zone
                </h4>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Webhook
                </button>
              </div>
            </div>
          )}

          {selectedTab === "deliveries" && deliveries && (
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <DeliveryCard key={delivery._id} delivery={delivery} />
              ))}
              {deliveries.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No deliveries yet
                </div>
              )}
            </div>
          )}

          {selectedTab === "logs" && (
            <div className="text-center py-12 text-gray-500">
              Logs view coming soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveryCard({ delivery }: { delivery: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "sending":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-medium">{delivery.event}</span>
            <span className={`px-2 py-1 text-xs rounded ${getStatusColor(delivery.status)}`}>
              {delivery.status}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(delivery.triggeredAt).toLocaleString()}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Attempt {delivery.attempts}/{delivery.maxAttempts}
        </div>
      </div>

      {delivery.response && (
        <div className="mt-2 text-xs">
          <span className="text-gray-600">Response:</span>{" "}
          <span className="font-medium">{delivery.response.statusCode}</span>
          {" • "}
          <span className="text-gray-600">{delivery.response.duration}ms</span>
        </div>
      )}

      {delivery.error && (
        <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded">
          {delivery.error}
        </div>
      )}
    </div>
  );
}
