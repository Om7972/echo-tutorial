# Internal Collaboration System

Complete internal collaboration system for team communication, task management, and activity tracking.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Backend Functions](#backend-functions)
6. [React Components](#react-components)
7. [React Hooks](#react-hooks)
8. [Usage Examples](#usage-examples)
9. [Security & Permissions](#security--permissions)
10. [Best Practices](#best-practices)

## Overview

The Internal Collaboration System provides a comprehensive solution for team collaboration within conversations. It includes private notes, mentions, assignments, notifications, activity logs, and audit trails.

### Key Capabilities

- **Private Notes**: Rich text notes with markdown support
- **Mentions**: @mention team members to notify them
- **Assignments**: Task assignments with roles (owner, collaborator, watcher, reviewer)
- **Tags**: Organize notes with colored tags
- **Notifications**: Real-time notifications for all collaboration events
- **Activity Logs**: Chronological activity feed
- **Permissions**: Fine-grained access control
- **Audit Trail**: Comprehensive security and compliance logging

## Features

### 1. Collaboration Notes

**Features:**
- Rich text editing with markdown support
- Four visibility levels: private, team, mentioned, assigned
- @mentions for team collaboration
- Tags and categories for organization
- Pin/unpin important notes
- Edit history tracking
- Full-text search

**Visibility Levels:**
- **Private**: Only visible to the author
- **Team**: Visible to all team members
- **Mentioned**: Visible to author and mentioned users
- **Assigned**: Visible to author and assigned users

### 2. Assignments

**Features:**
- Four assignment types: owner, collaborator, watcher, reviewer
- Status tracking: pending, accepted, declined, completed
- Priority levels: low, medium, high, urgent
- Due dates with overdue warnings
- Accept/decline workflow
- Assignment statistics dashboard

**Assignment Types:**
- **Owner** 👑: Primary responsible person
- **Collaborator** 🤝: Active participant
- **Watcher** 👁️: Observer/stakeholder
- **Reviewer** ✅: Quality assurance role

### 3. Mentions

**Features:**
- @mention syntax in notes
- Automatic mention detection
- Mention notifications
- Read/unread status
- Resolve mentions
- Context snippets

### 4. Notifications

**Features:**
- Real-time notification feed
- Seven notification types
- Read/unread tracking
- Action buttons for quick responses
- Filter by type
- Mark all as read
- Expiration support

**Notification Types:**
- Mention
- Assignment
- Note Reply
- Status Change
- Due Date
- Escalation
- Approval Request

### 5. Activity Logs

**Features:**
- Chronological activity feed
- Filter by type, user, and date
- Grouped by date
- Export to CSV
- Activity statistics
- Conversation-specific logs

**Activity Types:**
- Note created/updated/deleted/pinned/unpinned
- Assignment created/accepted/declined/completed
- Mention created
- Tag added/removed

### 6. Tags

**Features:**
- Colored tags for organization
- Tag categories
- Usage tracking
- Popular tags
- Auto-suggestions

### 7. Permissions

**Features:**
- Fine-grained access control
- Permission levels: read, write, delete, admin
- Grant/revoke permissions
- Permission checking
- Audit logging

### 8. Audit Trail

**Features:**
- Comprehensive security logging
- IP address and user agent tracking
- Before/after change tracking
- Search and filter
- Export to CSV/JSON
- Compliance-ready

**Audit Actions:**
- note_create, note_update, note_delete, note_view
- assignment_create, assignment_update, assignment_delete
- permission_change
- access_granted, access_denied

## Architecture

### Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Convex (serverless)
- **Real-time**: Convex reactive queries
- **State Management**: Convex React hooks

### Data Flow

```
User Action → React Component → Convex Mutation → Database Update
                                      ↓
                            Trigger Notifications
                                      ↓
                              Log Activity
                                      ↓
                              Create Audit Log
                                      ↓
                         Real-time Updates via Queries
```

## Database Schema

### 1. collaboration_notes

```typescript
{
  orgId: string
  conversationId?: Id<"unified_conversations">
  customerId?: Id<"unified_customers">
  content: string  // Markdown/HTML/Plain text
  contentFormat: "markdown" | "html" | "plain"
  plainText: string  // For search
  authorId: string
  authorName: string
  visibility: "private" | "team" | "mentioned" | "assigned"
  isPinned: boolean
  tags: string[]
  category?: string
  mentions: string[]  // User IDs
  editHistory?: Array<{
    editedAt: number
    editedBy: string
    previousContent: string
  }>
  createdAt: number
  updatedAt: number
  deletedAt?: number
}
```

**Indexes:**
- `by_org_id`
- `by_org_conversation`
- `by_org_author`
- `by_org_pinned`
- `search_content` (full-text search)

### 2. collaboration_assignments

```typescript
{
  orgId: string
  conversationId: Id<"unified_conversations">
  assignedTo: string
  assignedBy: string
  assignmentType: "owner" | "collaborator" | "watcher" | "reviewer"
  status: "pending" | "accepted" | "declined" | "completed"
  note?: string
  dueDate?: number
  priority: "low" | "medium" | "high" | "urgent"
  createdAt: number
  updatedAt: number
  acceptedAt?: number
  completedAt?: number
}
```

**Indexes:**
- `by_org_id`
- `by_conversation_id`
- `by_org_assigned_to`
- `by_org_assigned_by`
- `by_org_status`

### 3. collaboration_mentions

```typescript
{
  orgId: string
  noteId: Id<"collaboration_notes">
  conversationId?: Id<"unified_conversations">
  mentionedUserId: string
  mentionedBy: string
  mentionContext: string  // Text snippet
  isRead: boolean
  isResolved: boolean
  createdAt: number
  readAt?: number
  resolvedAt?: number
}
```

**Indexes:**
- `by_org_id`
- `by_note_id`
- `by_org_mentioned_user`
- `by_org_mentioned_by`

### 4. collaboration_notifications

```typescript
{
  orgId: string
  userId: string
  type: "mention" | "assignment" | "note_reply" | "status_change" | 
        "due_date" | "escalation" | "approval_request"
  title: string
  message: string
  conversationId?: Id<"unified_conversations">
  noteId?: Id<"collaboration_notes">
  assignmentId?: Id<"collaboration_assignments">
  mentionId?: Id<"collaboration_mentions">
  actorId?: string
  actorName?: string
  isRead: boolean
  actionUrl?: string
  actionText?: string
  createdAt: number
  readAt?: number
  expiresAt?: number
}
```

**Indexes:**
- `by_org_id`
- `by_org_user`
- `by_user_read`
- `by_type`

### 5. collaboration_activity

```typescript
{
  orgId: string
  conversationId?: Id<"unified_conversations">
  activityType: string
  actorId: string
  actorName: string
  targetType: "note" | "assignment" | "mention" | "tag" | "permission"
  targetId: string
  description: string
  metadata?: object
  timestamp: number
}
```

**Indexes:**
- `by_org_id`
- `by_conversation_id`
- `by_org_timestamp`
- `by_actor_id`
- `by_activity_type`

### 6. collaboration_permissions

```typescript
{
  orgId: string
  targetType: "note" | "assignment" | "conversation"
  targetId: string
  userId: string
  permissionLevel: "read" | "write" | "delete" | "admin"
  grantedBy: string
  grantedAt: number
  expiresAt?: number
}
```

**Indexes:**
- `by_org_target`
- `by_org_user`
- `by_target_user`

### 7. collaboration_tags

```typescript
{
  orgId: string
  name: string
  color: string
  category?: string
  description?: string
  usageCount: number
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_org_id`
- `by_org_name`
- `by_org_category`

### 8. collaboration_audit

```typescript
{
  orgId: string
  conversationId?: Id<"unified_conversations">
  action: string
  actorId: string
  actorName: string
  targetType: string
  targetId: string
  description?: string
  changes?: object  // Before/after
  metadata?: object
  ipAddress?: string
  userAgent?: string
  timestamp: number
}
```

**Indexes:**
- `by_org_id`
- `by_conversation_id`
- `by_org_timestamp`
- `by_actor_id`
- `by_action`
- `by_target`

## Backend Functions

### Notes Functions

**`collaboration/notes.ts`**

- `createNote` - Create a new note
- `getNotes` - Get notes with filters
- `getNote` - Get single note by ID
- `updateNote` - Update note content
- `deleteNote` - Soft delete note
- `togglePin` - Pin/unpin note
- `searchNotes` - Full-text search
- `getPinnedNotes` - Get pinned notes

### Assignments Functions

**`collaboration/assignments.ts`**

- `createAssignment` - Create assignment
- `getUserAssignments` - Get user's assignments
- `getConversationAssignments` - Get conversation assignments
- `acceptAssignment` - Accept assignment
- `declineAssignment` - Decline assignment
- `completeAssignment` - Complete assignment
- `updateAssignment` - Update assignment
- `deleteAssignment` - Delete assignment
- `getAssignmentStats` - Get statistics

### Notifications Functions

**`collaboration/notifications.ts`**

- `getUserNotifications` - Get user notifications
- `getUnreadCount` - Get unread count
- `markAsRead` - Mark notification as read
- `markAllAsRead` - Mark all as read
- `deleteNotification` - Delete notification
- `getUserMentions` - Get user mentions
- `markMentionAsRead` - Mark mention as read
- `resolveMention` - Resolve mention
- `createNotification` (internal) - Create notification
- `createMentionNotifications` (internal) - Create mention notifications
- `createAssignmentNotification` (internal) - Create assignment notification

### Activity Functions

**`collaboration/activity.ts`**

- `getActivities` - Get activities
- `getActivityStats` - Get statistics
- `logActivity` (internal) - Log activity

### Tags Functions

**`collaboration/tags.ts`**

- `getTags` - Get all tags
- `getPopularTags` - Get popular tags
- `createTag` - Create tag
- `updateTag` - Update tag
- `deleteTag` - Delete tag
- `incrementTagUsage` (internal) - Increment usage

### Permissions Functions

**`collaboration/permissions.ts`**

- `checkPermission` - Check permission
- `getPermissions` - Get permissions
- `grantPermission` - Grant permission
- `revokePermission` - Revoke permission

### Audit Functions

**`collaboration/audit.ts`**

- `getAuditLogs` - Get audit logs
- `getAuditLogsByTarget` - Get logs by target
- `createAuditLog` (internal) - Create audit log

## React Components

### 1. CollaborationNotes

**Location**: `apps/web/components/collaboration/CollaborationNotes.tsx`

Comprehensive notes UI with rich text editing, mentions, tags, and filtering.

**Props:**
```typescript
{
  orgId: string
  conversationId?: Id<"unified_conversations">
  customerId?: Id<"unified_customers">
  currentUserId: string
  currentUserName: string
}
```

**Features:**
- Create/edit/delete notes
- Visibility control
- @mentions
- Tags
- Pin/unpin
- Search
- Filter by visibility and tags

### 2. AssignmentsDashboard

**Location**: `apps/web/components/collaboration/AssignmentsDashboard.tsx`

Assignment management dashboard with statistics and filtering.

**Props:**
```typescript
{
  orgId: string
  currentUserId: string
  currentUserName: string
}
```

**Features:**
- Assignment list
- Statistics cards
- Accept/decline/complete actions
- Filter by status and type
- Overdue warnings
- Due date tracking

### 3. NotificationPanel

**Location**: `apps/web/components/collaboration/NotificationPanel.tsx`

Real-time notification feed with actions.

**Props:**
```typescript
{
  orgId: string
  currentUserId: string
}
```

**Features:**
- Notification list
- Unread count badges
- Mark as read
- Mark all as read
- Filter by type
- Action buttons
- Delete notifications

### 4. ActivityLog

**Location**: `apps/web/components/collaboration/ActivityLog.tsx`

Chronological activity feed with export.

**Props:**
```typescript
{
  orgId: string
  conversationId?: Id<"unified_conversations">
  limit?: number
}
```

**Features:**
- Activity timeline
- Group by date
- Filter by type and user
- Date range filter
- Export to CSV

### 5. AuditTrail

**Location**: `apps/web/components/collaboration/AuditTrail.tsx`

Comprehensive audit log viewer.

**Props:**
```typescript
{
  orgId: string
  conversationId?: Id<"unified_conversations">
  targetId?: string
  limit?: number
}
```

**Features:**
- Audit log table
- Search
- Filter by action and target type
- Export to CSV/JSON
- Show/hide details
- IP address and user agent tracking

## React Hooks

### Service Location

`apps/web/lib/collaboration/CollaborationService.ts`

### Notes Hooks

```typescript
useCollaborationNotes(params) // Get notes
usePinnedNotes(params)        // Get pinned notes
useSearchNotes(params)        // Search notes
useNote(noteId, userId)       // Get single note
useCreateNote()               // Create note
useUpdateNote()               // Update note
useDeleteNote()               // Delete note
useTogglePin()                // Pin/unpin note
```

### Assignment Hooks

```typescript
useUserAssignments(params)       // Get user assignments
useConversationAssignments(params) // Get conversation assignments
useAssignmentStats(params)       // Get statistics
useCreateAssignment()            // Create assignment
useAcceptAssignment()            // Accept assignment
useDeclineAssignment()           // Decline assignment
useCompleteAssignment()          // Complete assignment
useUpdateAssignment()            // Update assignment
useDeleteAssignment()            // Delete assignment
```

### Notification Hooks

```typescript
useNotifications(params)              // Get notifications
useUnreadCount(params)                // Get unread count
useUserMentions(params)               // Get mentions
useMarkNotificationAsRead()           // Mark as read
useMarkAllNotificationsAsRead()       // Mark all as read
useDeleteNotification()               // Delete notification
useMarkMentionAsRead()                // Mark mention as read
useResolveMention()                   // Resolve mention
```

### Activity Hooks

```typescript
useActivities(params)      // Get activities
useActivityStats(params)   // Get statistics
```

### Tag Hooks

```typescript
useTags(params)         // Get tags
usePopularTags(params)  // Get popular tags
useCreateTag()          // Create tag
useUpdateTag()          // Update tag
useDeleteTag()          // Delete tag
```

### Permission Hooks

```typescript
useCheckPermission()     // Check permission
useGrantPermission()     // Grant permission
useRevokePermission()    // Revoke permission
useGetPermissions(params) // Get permissions
```

### Audit Hooks

```typescript
useAuditLogs(params)           // Get audit logs
useAuditLogsByTarget(params)   // Get logs by target
```

## Usage Examples

### Example 1: Create a Private Note

```typescript
"use client";

import { useCreateNote } from "@/lib/collaboration/CollaborationService";

function MyComponent() {
  const createNote = useCreateNote();

  const handleCreateNote = async () => {
    await createNote({
      orgId: "org_123",
      conversationId: conversationId,
      content: "This is a private note about the customer issue.",
      contentFormat: "markdown",
      plainText: "This is a private note about the customer issue.",
      authorId: "user_123",
      authorName: "John Doe",
      visibility: "private",
      tags: ["customer-issue", "follow-up"],
    });
  };

  return (
    <button onClick={handleCreateNote}>
      Create Note
    </button>
  );
}
```

### Example 2: Create Assignment

```typescript
import { useCreateAssignment } from "@/lib/collaboration/CollaborationService";

function AssignmentForm() {
  const createAssignment = useCreateAssignment();

  const handleAssign = async () => {
    await createAssignment({
      orgId: "org_123",
      conversationId: conversationId,
      assignedTo: "user_456",
      assignedBy: "user_123",
      assignmentType: "owner",
      note: "Please handle this urgent customer request",
      dueDate: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      priority: "high",
    });
  };

  return <button onClick={handleAssign}>Assign</button>;
}
```

### Example 3: Display Notifications

```typescript
import { NotificationPanel } from "@/components/collaboration/NotificationPanel";

function Sidebar() {
  return (
    <div className="w-80 h-full">
      <NotificationPanel
        orgId="org_123"
        currentUserId="user_123"
      />
    </div>
  );
}
```

### Example 4: Show Activity Log

```typescript
import { ActivityLog } from "@/components/collaboration/ActivityLog";

function ConversationPage({ conversationId }) {
  return (
    <div>
      <h2>Conversation Activity</h2>
      <ActivityLog
        orgId="org_123"
        conversationId={conversationId}
        limit={50}
      />
    </div>
  );
}
```

### Example 5: Use Collaboration Utilities

```typescript
import { CollaborationUtils } from "@/lib/collaboration/CollaborationService";

// Extract mentions from text
const text = "Hey @john and @jane, can you review this?";
const mentions = CollaborationUtils.extractMentions(text);
// Result: ["john", "jane"]

// Check if overdue
const isOverdue = CollaborationUtils.isAssignmentOverdue(assignment.dueDate);

// Format relative time
const timeAgo = CollaborationUtils.formatRelativeTime(note.createdAt);
// Result: "2 hours ago"

// Export to CSV
CollaborationUtils.exportToCSV(activities, "activities.csv");
```

## Security & Permissions

### Permission Levels

1. **Read**: View notes and assignments
2. **Write**: Create and edit notes
3. **Delete**: Delete notes and assignments
4. **Admin**: Full control including permissions

### Visibility Control

Notes support four visibility levels:

1. **Private**: Only author can see
2. **Team**: All team members can see
3. **Mentioned**: Author + mentioned users
4. **Assigned**: Author + assigned users

### Access Control

- Authors can always access their own content
- Permissions are checked on every query
- Soft deletes prevent data loss
- Audit logs track all access

### Data Protection

- Multi-tenant isolation via `orgId`
- Soft deletes for notes
- Edit history tracking
- IP address and user agent logging
- Before/after change tracking

## Best Practices

### 1. Use Appropriate Visibility

- Use **private** for sensitive information
- Use **team** for general collaboration
- Use **mentioned** when involving specific people
- Use **assigned** for task-related notes

### 2. Tag Consistently

- Create a consistent tagging system
- Use categories for organization
- Leverage popular tags
- Keep tags concise

### 3. Assignment Management

- Set realistic due dates
- Use appropriate priorities
- Accept assignments promptly
- Complete assignments when done
- Decline with reason if unable

### 4. Notifications

- Review notifications regularly
- Mark as read to stay organized
- Resolve mentions when addressed
- Use filters to focus

### 5. Activity Tracking

- Review activity logs for context
- Export logs for records
- Filter by relevant time periods
- Use for troubleshooting

### 6. Audit Compliance

- Regularly review audit logs
- Export for compliance
- Monitor access patterns
- Investigate suspicious activity

### 7. Performance

- Use filters to reduce data
- Set reasonable limits
- Cache frequently accessed data
- Paginate large result sets

### 8. Real-time Updates

- Leverage Convex reactive queries
- No polling needed
- Instant collaboration
- Automatic UI updates

## Troubleshooting

### Notes Not Showing

- Check visibility permissions
- Verify `orgId` matches
- Check for soft deletes
- Review filter settings

### Notifications Not Received

- Verify user ID is correct
- Check notification expiration
- Review notification type filters
- Ensure real-time connection

### Assignment Issues

- Verify conversation exists
- Check user permissions
- Review assignment status
- Validate due dates

### Search Not Working

- Ensure search term is 2+ characters
- Check full-text index
- Review `plainText` content
- Verify `orgId` isolation

## Future Enhancements

- [ ] Rich text editor integration (TipTap/Lexical)
- [ ] File attachments on notes
- [ ] Note templates
- [ ] Assignment workflows
- [ ] Email notifications
- [ ] Mobile push notifications
- [ ] Slack/Teams integration
- [ ] Advanced search with filters
- [ ] Bulk operations
- [ ] Note versioning
- [ ] Assignment dependencies
- [ ] SLA tracking
- [ ] Custom notification rules
- [ ] Role-based permissions

## Support

For questions or issues:
1. Check this documentation
2. Review code examples
3. Check backend function implementations
4. Review component source code
5. Test with small examples first

## License

Copyright © 2026. All rights reserved.
