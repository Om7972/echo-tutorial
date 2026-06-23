# Collaboration Components

Enterprise-grade internal collaboration components for team communication and task management.

## Components

### 1. CollaborationNotes

Rich text notes with mentions, tags, and visibility control.

**Usage:**
```typescript
import { CollaborationNotes } from "@/components/collaboration";

<CollaborationNotes
  orgId="org_123"
  conversationId={conversationId}
  currentUserId="user_123"
  currentUserName="John Doe"
/>
```

**Features:**
- Create/edit/delete notes
- Four visibility levels (private, team, mentioned, assigned)
- @mentions with autocomplete
- Tag management
- Pin/unpin notes
- Full-text search
- Filter by visibility and tags

### 2. AssignmentsDashboard

Task assignment management with workflow.

**Usage:**
```typescript
import { AssignmentsDashboard } from "@/components/collaboration";

<AssignmentsDashboard
  orgId="org_123"
  currentUserId="user_123"
  currentUserName="John Doe"
/>
```

**Features:**
- Assignment list with statistics
- Accept/decline/complete actions
- Filter by status and type
- Priority indicators
- Overdue warnings
- Due date tracking

### 3. NotificationPanel

Real-time notification feed.

**Usage:**
```typescript
import { NotificationPanel } from "@/components/collaboration";

<NotificationPanel
  orgId="org_123"
  currentUserId="user_123"
/>
```

**Features:**
- Real-time notification feed
- Unread count badges
- Filter by type
- Mark as read
- Mark all as read
- Action buttons

### 4. ActivityLog

Chronological activity feed with export.

**Usage:**
```typescript
import { ActivityLog } from "@/components/collaboration";

<ActivityLog
  orgId="org_123"
  conversationId={conversationId}
  limit={50}
/>
```

**Features:**
- Activity timeline
- Group by date
- Filter by type and user
- Date range filtering
- Export to CSV

### 5. AuditTrail

Comprehensive audit log viewer.

**Usage:**
```typescript
import { AuditTrail } from "@/components/collaboration";

<AuditTrail
  orgId="org_123"
  limit={100}
/>
```

**Features:**
- Audit log table
- Search functionality
- Filter by action and target
- Export to CSV/JSON
- IP and user agent tracking

## Quick Import

Import all components at once:

```typescript
import {
  CollaborationNotes,
  AssignmentsDashboard,
  NotificationPanel,
  ActivityLog,
  AuditTrail
} from "@/components/collaboration";
```

## Styling

Components use Tailwind CSS classes. Customize by:

1. Wrapping in a container with your styles
2. Using Tailwind's theme configuration
3. Overriding specific classes

Example:
```typescript
<div className="custom-container">
  <CollaborationNotes {...props} />
</div>
```

## Real-time Updates

All components support real-time updates via Convex reactive queries. Changes appear instantly without polling.

## Performance

- Optimized queries with indexes
- Pagination support
- Efficient filtering
- Lazy loading

## Accessibility

- Keyboard navigation
- ARIA labels
- Semantic HTML
- Focus management

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 18+
- Convex
- TypeScript
- Tailwind CSS

## Documentation

- [Quick Start Guide](../../../../docs/COLLABORATION_QUICKSTART.md)
- [Full Documentation](../../../../docs/COLLABORATION.md)
- [Implementation Status](../../../../docs/IMPLEMENTATION_STATUS.md)

## Support

For issues or questions, check the documentation or review component source code.

## License

Copyright © 2026. All rights reserved.
