# Internal Collaboration System - Quick Start Guide

Get started with the Internal Collaboration System in 5 minutes.

## Installation

No additional packages needed! The system uses existing dependencies:
- Convex (backend)
- React (frontend)
- TypeScript (type safety)

## Basic Usage

### 1. Display Notes in a Conversation

```typescript
import { CollaborationNotes } from "@/components/collaboration";

function ConversationPage({ conversationId, orgId, userId, userName }) {
  return (
    <div>
      <h1>Conversation</h1>
      <CollaborationNotes
        orgId={orgId}
        conversationId={conversationId}
        currentUserId={userId}
        currentUserName={userName}
      />
    </div>
  );
}
```

### 2. Show User's Assignments

```typescript
import { AssignmentsDashboard } from "@/components/collaboration";

function MyAssignmentsPage({ orgId, userId, userName }) {
  return (
    <AssignmentsDashboard
      orgId={orgId}
      currentUserId={userId}
      currentUserName={userName}
    />
  );
}
```

### 3. Add Notification Panel

```typescript
import { NotificationPanel } from "@/components/collaboration";

function Sidebar({ orgId, userId }) {
  return (
    <div className="w-80 h-full">
      <NotificationPanel
        orgId={orgId}
        currentUserId={userId}
      />
    </div>
  );
}
```

### 4. Show Activity Log

```typescript
import { ActivityLog } from "@/components/collaboration";

function ActivityPage({ orgId, conversationId }) {
  return (
    <ActivityLog
      orgId={orgId}
      conversationId={conversationId}
      limit={100}
    />
  );
}
```

### 5. Display Audit Trail

```typescript
import { AuditTrail } from "@/components/collaboration";

function AuditPage({ orgId }) {
  return (
    <AuditTrail
      orgId={orgId}
      limit={500}
    />
  );
}
```

## Using React Hooks

### Create a Note Programmatically

```typescript
import { useCreateNote } from "@/lib/collaboration/CollaborationService";

function QuickNoteButton({ orgId, conversationId, userId, userName }) {
  const createNote = useCreateNote();

  const handleQuickNote = async () => {
    await createNote({
      orgId,
      conversationId,
      content: "Quick follow-up needed",
      contentFormat: "plain",
      plainText: "Quick follow-up needed",
      authorId: userId,
      authorName: userName,
      visibility: "team",
      tags: ["follow-up"],
    });
  };

  return (
    <button onClick={handleQuickNote}>
      Quick Note
    </button>
  );
}
```

### Create an Assignment

```typescript
import { useCreateAssignment } from "@/lib/collaboration/CollaborationService";

function AssignButton({ orgId, conversationId, assignToUserId, currentUserId }) {
  const createAssignment = useCreateAssignment();

  const handleAssign = async () => {
    await createAssignment({
      orgId,
      conversationId,
      assignedTo: assignToUserId,
      assignedBy: currentUserId,
      assignmentType: "owner",
      note: "Please handle this customer request",
      priority: "high",
      dueDate: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
  };

  return (
    <button onClick={handleAssign}>
      Assign Conversation
    </button>
  );
}
```

### Display Unread Notification Count

```typescript
import { useUnreadCount } from "@/lib/collaboration/CollaborationService";

function NotificationBadge({ orgId, userId }) {
  const unreadCount = useUnreadCount({ orgId, userId });

  if (!unreadCount || unreadCount.total === 0) {
    return null;
  }

  return (
    <div className="relative">
      <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
        {unreadCount.total}
      </span>
    </div>
  );
}
```

### Get User's Assignments

```typescript
import { useUserAssignments } from "@/lib/collaboration/CollaborationService";

function MyAssignmentsList({ orgId, userId }) {
  const assignments = useUserAssignments({
    orgId,
    userId,
    status: ["pending", "accepted"],
  });

  if (!assignments || assignments.length === 0) {
    return <div>No active assignments</div>;
  }

  return (
    <ul>
      {assignments.map(assignment => (
        <li key={assignment._id}>
          {assignment.assignmentType} - {assignment.status}
        </li>
      ))}
    </ul>
  );
}
```

## Common Patterns

### Pattern 1: Create Note with Mentions

```typescript
import { useCreateNote } from "@/lib/collaboration/CollaborationService";
import { CollaborationUtils } from "@/lib/collaboration/CollaborationService";

function CreateNoteWithMentions() {
  const createNote = useCreateNote();
  const [content, setContent] = useState("");

  const handleSubmit = async () => {
    // Extract mentions from content
    const mentions = CollaborationUtils.extractMentions(content);
    // Convert @usernames to user IDs (you need a lookup function)
    const mentionIds = await lookupUserIds(mentions);

    await createNote({
      orgId: "org_123",
      conversationId: conversationId,
      content,
      contentFormat: "markdown",
      plainText: content,
      authorId: currentUserId,
      authorName: currentUserName,
      visibility: "mentioned",
      mentions: mentionIds,
      tags: ["important"],
    });
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your note... Use @username to mention"
      />
      <button onClick={handleSubmit}>Create</button>
    </div>
  );
}
```

### Pattern 2: Activity Feed with Real-time Updates

```typescript
import { useActivities } from "@/lib/collaboration/CollaborationService";

function RealtimeActivityFeed({ orgId, conversationId }) {
  // Convex provides real-time updates automatically
  const activities = useActivities({
    orgId,
    conversationId,
    limit: 20,
  });

  return (
    <div>
      {activities?.map(activity => (
        <div key={activity._id}>
          <strong>{activity.actorName}</strong> {activity.description}
          <br />
          <small>
            {CollaborationUtils.formatRelativeTime(activity.timestamp)}
          </small>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: Export Activity Log

```typescript
import { useActivities } from "@/lib/collaboration/CollaborationService";
import { CollaborationUtils } from "@/lib/collaboration/CollaborationService";

function ExportableActivityLog({ orgId }) {
  const activities = useActivities({ orgId, limit: 1000 });

  const handleExport = () => {
    if (!activities) return;

    const data = activities.map(a => ({
      timestamp: new Date(a.timestamp).toISOString(),
      type: a.activityType,
      actor: a.actorName,
      description: a.description,
    }));

    CollaborationUtils.exportToCSV(data, "activity-log.csv");
  };

  return (
    <button onClick={handleExport}>
      Export Activity Log
    </button>
  );
}
```

### Pattern 4: Check Permission Before Action

```typescript
import { useCheckPermission } from "@/lib/collaboration/CollaborationService";

function ProtectedDeleteButton({ noteId, userId }) {
  const checkPermission = useCheckPermission();
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    checkPermission({
      targetType: "note",
      targetId: noteId,
      userId,
      requiredPermission: "delete",
    }).then(result => setCanDelete(result.hasPermission));
  }, [noteId, userId]);

  if (!canDelete) {
    return null; // Hide button if no permission
  }

  return <button>Delete Note</button>;
}
```

## Utility Functions

### Extract Mentions from Text

```typescript
import { CollaborationUtils } from "@/lib/collaboration/CollaborationService";

const text = "Hey @john, can you help @jane with this?";
const mentions = CollaborationUtils.extractMentions(text);
// Result: ["john", "jane"]
```

### Format Relative Time

```typescript
import { CollaborationUtils } from "@/lib/collaboration/CollaborationService";

const timestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
const formatted = CollaborationUtils.formatRelativeTime(timestamp);
// Result: "2 hours ago"
```

### Check if Assignment is Overdue

```typescript
import { CollaborationUtils } from "@/lib/collaboration/CollaborationService";

const dueDate = Date.now() - 1000; // 1 second ago
const isOverdue = CollaborationUtils.isAssignmentOverdue(dueDate);
// Result: true
```

### Get Priority Color Class

```typescript
import { CollaborationUtils } from "@/lib/collaboration/CollaborationService";

const colorClass = CollaborationUtils.getPriorityColor("high");
// Result: "bg-orange-100 text-orange-700"
```

### Generate Tag Color

```typescript
import { CollaborationUtils } from "@/lib/collaboration/CollaborationService";

const color = CollaborationUtils.generateTagColor("important");
// Result: "#EF4444" (consistent color for the same tag)
```

## Visibility Levels Explained

### Private
Only the author can see the note. Use for personal reminders.

```typescript
visibility: "private"
```

### Team
All team members can see. Use for general collaboration.

```typescript
visibility: "team"
```

### Mentioned
Author and mentioned users can see. Use when @mentioning specific people.

```typescript
visibility: "mentioned",
mentions: ["user_123", "user_456"]
```

### Assigned
Author and assigned users can see. Use for task-related notes.

```typescript
visibility: "assigned"
```

## Assignment Types Explained

### Owner 👑
Primary responsible person. Use for main assignee.

```typescript
assignmentType: "owner"
```

### Collaborator 🤝
Active participant. Use for team members working together.

```typescript
assignmentType: "collaborator"
```

### Watcher 👁️
Observer/stakeholder. Use for people who need to stay informed.

```typescript
assignmentType: "watcher"
```

### Reviewer ✅
Quality assurance role. Use for people who need to approve/review.

```typescript
assignmentType: "reviewer"
```

## Notification Types

1. **mention** - User was mentioned in a note
2. **assignment** - User received a new assignment
3. **note_reply** - Someone replied to their note
4. **status_change** - Assignment status changed
5. **due_date** - Assignment due date approaching
6. **escalation** - Conversation escalated
7. **approval_request** - Approval requested

## Best Practices

### 1. Use Appropriate Visibility

```typescript
// ❌ Bad: Using "team" for sensitive info
visibility: "team"

// ✅ Good: Using "private" for sensitive info
visibility: "private"
```

### 2. Always Set Priority for Assignments

```typescript
// ❌ Bad: No priority
{ assignmentType: "owner" }

// ✅ Good: Clear priority
{ assignmentType: "owner", priority: "high" }
```

### 3. Provide Context in Assignments

```typescript
// ❌ Bad: No context
{ assignmentType: "owner" }

// ✅ Good: Clear context
{
  assignmentType: "owner",
  note: "Customer reported login issue. Need to investigate auth flow.",
  dueDate: Date.now() + 24 * 60 * 60 * 1000
}
```

### 4. Tag Consistently

```typescript
// ❌ Bad: Inconsistent tags
tags: ["bug", "Bug", "BUG"]

// ✅ Good: Consistent lowercase tags
tags: ["bug", "urgent", "customer-facing"]
```

### 5. Clean Up Notifications

```typescript
// Implement auto-mark-as-read on view
useEffect(() => {
  if (notification && !notification.isRead) {
    markAsRead({ notificationId: notification._id, userId });
  }
}, [notification]);
```

## Troubleshooting

### Notes Not Showing

**Problem**: Created note but can't see it

**Solution**: Check visibility permissions
```typescript
// Make sure visibility allows user to see
visibility: "team" // or appropriate level
```

### Mentions Not Working

**Problem**: @mentions not creating notifications

**Solution**: Ensure mentions array is populated
```typescript
// Extract mentions from content
const mentions = CollaborationUtils.extractMentions(content);
// Convert to user IDs
const mentionIds = await convertMentionsToIds(mentions);
// Pass to createNote
mentions: mentionIds
```

### Real-time Updates Not Working

**Problem**: Changes not appearing immediately

**Solution**: Convex handles real-time automatically. Ensure:
1. Using `useQuery` hooks (not `fetch`)
2. Component is mounted
3. Convex connection is active

### Search Not Finding Results

**Problem**: Search returns no results

**Solution**: Ensure search term is 2+ characters
```typescript
useSearchNotes({
  orgId,
  userId,
  searchTerm: query.length >= 2 ? query : "",
});
```

## Next Steps

1. Read [full documentation](./COLLABORATION.md)
2. Explore [implementation details](./IMPLEMENTATION_STATUS.md)
3. Check [backend functions](../packages/backend/convex/collaboration/)
4. Review [components](../apps/web/components/collaboration/)
5. Test with sample data

## Support

For issues or questions:
- Check this guide first
- Review full documentation
- Inspect component source code
- Test in isolation
- Check browser console for errors

## License

Copyright © 2026. All rights reserved.
