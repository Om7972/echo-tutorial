"use client";

/**
 * Assignments Dashboard Component
 * Displays and manages user assignments with filtering and actions
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Id } from "@workspace/backend/convex/_generated/dataModel";

interface AssignmentsDashboardProps {
  orgId: string;
  currentUserId: string;
  currentUserName: string;
}

export function AssignmentsDashboard({
  orgId,
  currentUserId,
  currentUserName,
}: AssignmentsDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Queries
  const assignments = useQuery(api.collaboration.assignments.getUserAssignments, {
    orgId,
    userId: currentUserId,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    assignmentType: typeFilter.length > 0 ? typeFilter : undefined,
    includeCompleted: showCompleted,
  });

  const stats = useQuery(api.collaboration.assignments.getAssignmentStats, {
    orgId,
    userId: currentUserId,
  });

  // Mutations
  const acceptAssignment = useMutation(api.collaboration.assignments.acceptAssignment);
  const declineAssignment = useMutation(api.collaboration.assignments.declineAssignment);
  const completeAssignment = useMutation(api.collaboration.assignments.completeAssignment);
  const updateAssignment = useMutation(api.collaboration.assignments.updateAssignment);

  const handleAccept = async (assignmentId: string) => {
    try {
      await acceptAssignment({
        assignmentId: assignmentId as Id<"collaboration_assignments">,
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Failed to accept assignment:", error);
    }
  };

  const handleDecline = async (assignmentId: string) => {
    const reason = prompt("Please provide a reason for declining (optional):");
    try {
      await declineAssignment({
        assignmentId: assignmentId as Id<"collaboration_assignments">,
        userId: currentUserId,
        reason: reason || undefined,
      });
    } catch (error) {
      console.error("Failed to decline assignment:", error);
    }
  };

  const handleComplete = async (assignmentId: string) => {
    try {
      await completeAssignment({
        assignmentId: assignmentId as Id<"collaboration_assignments">,
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Failed to complete assignment:", error);
    }
  };

  const isOverdue = (dueDate?: number) => {
    if (!dueDate) return false;
    return dueDate < Date.now();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Assignments</h2>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Total"
            value={stats.total}
            color="bg-blue-50 text-blue-700"
          />
          <StatCard
            title="Active"
            value={stats.active}
            color="bg-green-50 text-green-700"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            color="bg-yellow-50 text-yellow-700"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            color="bg-gray-50 text-gray-700"
          />
          <StatCard
            title="Overdue"
            value={stats.overdue}
            color="bg-red-50 text-red-700"
          />
        </div>
      )}

      {/* Assignment Type Breakdown */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">By Type (Active)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TypeBadge label="Owner" count={stats.byType.owner} icon="👑" />
            <TypeBadge label="Collaborator" count={stats.byType.collaborator} icon="🤝" />
            <TypeBadge label="Watcher" count={stats.byType.watcher} icon="👁️" />
            <TypeBadge label="Reviewer" count={stats.byType.reviewer} icon="✅" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            {["pending", "accepted", "declined"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  if (statusFilter.includes(status)) {
                    setStatusFilter(statusFilter.filter(s => s !== status));
                  } else {
                    setStatusFilter([...statusFilter, status]);
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm capitalize ${
                  statusFilter.includes(status)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Type:</span>
            {["owner", "collaborator", "watcher", "reviewer"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  if (typeFilter.includes(type)) {
                    setTypeFilter(typeFilter.filter(t => t !== type));
                  } else {
                    setTypeFilter([...typeFilter, type]);
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm capitalize ${
                  typeFilter.includes(type)
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3 py-1 rounded-full text-sm ${
              showCompleted ? "bg-gray-600 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {showCompleted ? "Hide" : "Show"} Completed
          </button>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {!assignments || assignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No assignments found
          </div>
        ) : (
          assignments.map((assignment) => (
            <AssignmentCard
              key={assignment._id}
              assignment={assignment}
              onAccept={() => handleAccept(assignment._id)}
              onDecline={() => handleDecline(assignment._id)}
              onComplete={() => handleComplete(assignment._id)}
              isOverdue={isOverdue(assignment.dueDate)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

// Type Badge Component
function TypeBadge({ label, count, icon }: { label: string; count: number; icon: string }) {
  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-xl font-bold">{count}</div>
      </div>
    </div>
  );
}

// Assignment Card Component
interface AssignmentCardProps {
  assignment: any;
  onAccept: () => void;
  onDecline: () => void;
  onComplete: () => void;
  isOverdue: boolean;
}

function AssignmentCard({
  assignment,
  onAccept,
  onDecline,
  onComplete,
  isOverdue,
}: AssignmentCardProps) {
  const priorityColors = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    completed: "bg-gray-100 text-gray-800",
  };

  const typeIcons = {
    owner: "👑",
    collaborator: "🤝",
    watcher: "👁️",
    reviewer: "✅",
  };

  return (
    <div
      className={`bg-white rounded-lg shadow p-6 ${
        isOverdue ? "border-l-4 border-red-500" : ""
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">
            {typeIcons[assignment.assignmentType as keyof typeof typeIcons]}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold capitalize">{assignment.assignmentType}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[assignment.status as keyof typeof statusColors]}`}>
                {assignment.status}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[assignment.priority as keyof typeof priorityColors]}`}>
                {assignment.priority}
              </span>
            </div>

            {assignment.conversation && (
              <div className="text-sm text-gray-600 mb-2">
                Conversation: {assignment.conversation.channelType} • {assignment.conversation.status}
              </div>
            )}

            {assignment.note && (
              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded mb-2">
                {assignment.note}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Created {new Date(assignment.createdAt).toLocaleString()}</span>
              {assignment.dueDate && (
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  Due {new Date(assignment.dueDate).toLocaleString()}
                  {isOverdue && " ⚠️"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {assignment.status === "pending" && (
            <>
              <button
                onClick={onAccept}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                Accept
              </button>
              <button
                onClick={onDecline}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                Decline
              </button>
            </>
          )}

          {assignment.status === "accepted" && (
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Complete
            </button>
          )}
        </div>
      </div>

      {/* Timestamps */}
      {assignment.acceptedAt && (
        <div className="text-xs text-gray-500 mt-2">
          Accepted {new Date(assignment.acceptedAt).toLocaleString()}
        </div>
      )}
      {assignment.completedAt && (
        <div className="text-xs text-gray-500 mt-2">
          Completed {new Date(assignment.completedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
