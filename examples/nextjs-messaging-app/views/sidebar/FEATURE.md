# Sidebar

The column between the rail and the conversation has a default width and can be
dragged between a minimum and maximum (`SIDEBAR_PANEL` in `lib/panel-width.ts`)
via the handle on its right edge (width is remembered). What it shows depends on
the active rail tab: the channel and compact DM lists (Home), the detailed DM
list (DMs), or the Activity panel (Activity). See `views/rail/FEATURE.md` for
the tabs.

## Files

- `views/sidebar/sidebar.tsx`
- `primitives/column-header.tsx`
- `primitives/resize-handle.tsx`
- `lib/panel-width.ts`
- Tests: `tests/`
