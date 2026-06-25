// @ts-nocheck
"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface Trigger {
  triggerType: string;
  config: any;
}

interface Condition {
  conditionType: string;
  operator: string;
  value: any;
  logicOperator?: string;
}

interface Action {
  order: number;
  actionType: string;
  config: any;
  retryOnFailure: boolean;
  maxRetries: number;
}

interface WorkflowBuilderProps {
  orgId: string;
  workflowId?: Id<"automation_workflows">;
  onSave?: () => void;
  onCancel?: () => void;
}

export function WorkflowBuilder({
  orgId,
  workflowId,
  onSave,
  onCancel,
}: WorkflowBuilderProps) {
  const createWorkflow = useMutation(api.automation.workflows.createWorkflow);
  const updateWorkflow = useMutation(api.automation.workflows.updateWorkflow);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState(5);
  const [retryOnFailure, setRetryOnFailure] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);

  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([]);

  const [saving, setSaving] = useState(false);

  // Add trigger
  const addTrigger = () => {
    setTriggers([
      ...triggers,
      {
        triggerType: "message_received",
        config: {},
      },
    ]);
  };

  // Add condition
  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        conditionType: "priority",
        operator: "equals",
        value: "high",
        logicOperator: "AND",
      },
    ]);
  };

  // Add action
  const addAction = () => {
    setActions([
      ...actions,
      {
        order: actions.length + 1,
        actionType: "assign_agent",
        config: {},
        retryOnFailure: false,
        maxRetries: 0,
      },
    ]);
  };

  // Save workflow
  const handleSave = async () => {
    if (!name.trim()) {
      alert("Workflow name is required");
      return;
    }

    if (triggers.length === 0) {
      alert("At least one trigger is required");
      return;
    }

    if (actions.length === 0) {
      alert("At least one action is required");
      return;
    }

    setSaving(true);

    try {
      if (workflowId) {
        await updateWorkflow({
          workflowId,
          name,
          description,
          isActive,
          priority,
          retryOnFailure,
          maxRetries,
        });
      } else {
        await createWorkflow({
          orgId,
          name,
          description,
          isActive,
          priority,
          retryOnFailure,
          maxRetries,
          createdBy: "user_123", // Replace with actual user ID
          triggers,
          conditions,
          actions,
        });
      }

      onSave?.();
    } catch (error) {
      console.error("Failed to save workflow:", error);
      alert("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">
          {workflowId ? "Edit Workflow" : "Create Workflow"}
        </h2>
        <p className="text-gray-600 mt-1">
          Build automated workflows to handle repetitive tasks
        </p>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="e.g., Route VIP customers to senior agents"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
            placeholder="Describe what this workflow does..."
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Active</span>
          </label>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Priority:</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-20 px-3 py-1 border rounded"
              min={1}
              max={10}
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={retryOnFailure}
              onChange={(e) => setRetryOnFailure(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Retry on failure</span>
          </label>

          {retryOnFailure && (
            <div className="flex items-center gap-2">
              <label className="text-sm">Max retries:</label>
              <input
                type="number"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                className="w-20 px-3 py-1 border rounded"
                min={1}
                max={5}
              />
            </div>
          )}
        </div>
      </div>

      {/* Triggers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Triggers</h3>
          <button
            onClick={addTrigger}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Trigger
          </button>
        </div>

        <div className="space-y-3">
          {triggers.map((trigger, index) => (
            <div key={index} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-start gap-3">
                <select
                  value={trigger.triggerType}
                  onChange={(e) => {
                    const newTriggers = [...triggers];
                    newTriggers[index].triggerType = e.target.value;
                    setTriggers(newTriggers);
                  }}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  <option value="message_received">Message Received</option>
                  <option value="sentiment_negative">Negative Sentiment</option>
                  <option value="new_customer">New Customer</option>
                  <option value="vip_customer">VIP Customer</option>
                  <option value="conversation_idle">Conversation Idle</option>
                  <option value="keyword_detected">Keyword Detected</option>
                </select>

                <button
                  onClick={() => setTriggers(triggers.filter((_, i) => i !== index))}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {triggers.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No triggers added. Click "Add Trigger" to get started.
            </p>
          )}
        </div>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Conditions (Optional)</h3>
          <button
            onClick={addCondition}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Condition
          </button>
        </div>

        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div key={index} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <select
                  value={condition.conditionType}
                  onChange={(e) => {
                    const newConditions = [...conditions];
                    newConditions[index].conditionType = e.target.value;
                    setConditions(newConditions);
                  }}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  <option value="priority">Priority</option>
                  <option value="tags">Tags</option>
                  <option value="customer_tier">Customer Tier</option>
                  <option value="channel_type">Channel Type</option>
                  <option value="assigned_to">Assigned To</option>
                </select>

                <select
                  value={condition.operator}
                  onChange={(e) => {
                    const newConditions = [...conditions];
                    newConditions[index].operator = e.target.value;
                    setConditions(newConditions);
                  }}
                  className="px-3 py-2 border rounded"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="contains">Contains</option>
                  <option value="in">In</option>
                </select>

                <input
                  type="text"
                  value={condition.value}
                  onChange={(e) => {
                    const newConditions = [...conditions];
                    newConditions[index].value = e.target.value;
                    setConditions(newConditions);
                  }}
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="Value"
                />

                <button
                  onClick={() => setConditions(conditions.filter((_, i) => i !== index))}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Actions *</h3>
          <button
            onClick={addAction}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Action
          </button>
        </div>

        <div className="space-y-3">
          {actions.map((action, index) => (
            <div key={index} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-gray-500">{action.order}.</span>

                <select
                  value={action.actionType}
                  onChange={(e) => {
                    const newActions = [...actions];
                    newActions[index].actionType = e.target.value;
                    setActions(newActions);
                  }}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  <option value="assign_agent">Assign Agent</option>
                  <option value="send_message">Send Message</option>
                  <option value="send_email">Send Email</option>
                  <option value="handoff_to_human">Handoff to Human</option>
                  <option value="close_conversation">Close Conversation</option>
                  <option value="add_tag">Add Tag</option>
                  <option value="set_priority">Set Priority</option>
                  <option value="create_note">Create Note</option>
                </select>

                <button
                  onClick={() => setActions(actions.filter((_, i) => i !== index))}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {actions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No actions added. Click "Add Action" to get started.
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : workflowId ? "Update Workflow" : "Create Workflow"}
        </button>

        <button
          onClick={onCancel}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
