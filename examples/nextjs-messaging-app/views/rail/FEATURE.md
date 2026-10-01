# Rail

## Rail tabs: Home, DMs, Activity

- **Where:** the three icon buttons below the workspace switcher.
- **How:** click a tab to change what the sidebar shows. The active tab is
  highlighted and marked `aria-current="page"`.
  - **Home** — the workspace name as a header, then a **Channels** section and a
    compact **Direct messages** section.
  - **DMs** — a "Direct messages" header and the detailed DM list with latest
    message previews.
  - **Activity** — the Activity panel (notifications).
- **Unread badges:** each tab carries a red count badge (capped at "99+"):
  - Home counts unread **@mentions in channels** (including mentions inside
    channel threads).
  - DMs counts **everything unread in a DM** (new DMs, thread replies and
    mentions inside DM threads).
  - Activity counts **all** unread items.

## Files

- `views/rail/rail.tsx`
- `primitives/unread-badge.tsx`
- Tests: `tests/`
