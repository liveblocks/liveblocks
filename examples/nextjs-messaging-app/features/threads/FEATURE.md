# Threads

Threads are available in channels and human DMs. The AI DM has no threads; the
AI replies inline there.

## Open a thread

- **Where:** "Reply in thread" in a message's hover toolbar, or the reply pill
  under a message that already has replies. Threads also open automatically when
  you @mention the AI in a channel or when you jump to a thread item from
  Activity.
- **What:** the thread panel slides in on the right with a "Thread" header and a
  close (×) button. It shows the parent message, a "N replies" divider (or "No
  replies yet. Start the thread below."), the replies, and a `Reply…` composer.

## Reply in a thread

- **How:** use the composer at the bottom of the panel. Everything from the main
  composer (rich text, mentions, typing indicator) works here.
- **Details:** replies are stored in a separate feed attached to the parent
  message. The thread's reply count and participant list are kept in the feed
  metadata. Replying notifies the other participants (everyone who has posted in
  or been mentioned in the thread) with a "replied in a thread" item; anyone you
  newly @mention gets a "mentioned you in a thread" item instead.

## Reply pill

- **Where:** under a channel/DM message that has at least one reply.
- **What:** up to five participant avatars, "N replies", and "Last reply at
  <time>". Click it to open the thread.

## Close a thread

- **How:** click × in the panel header, or select a different conversation. The
  panel also closes itself if the parent message is deleted.

## Threads and the AI

- If the parent message @mentions the AI, every reply in that thread gets an AI
  reply. In other threads, the AI only replies when a reply @mentions it.

## Files

- `features/threads/thread-panel.tsx`
- `lib/threads.ts`
- Tests: `tests/`
