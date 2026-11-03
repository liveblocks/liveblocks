# Activity and notifications

Every user has a personal activity feed per workspace. Items are references to a
real message somewhere else, stamped with a `readAt` timestamp once seen. Unread
items drive every badge in the app; read items stay as history.

## What creates an activity item

| Event                                                            | Recipient(s)                                                      | Item type      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- |
| Someone sends you a DM                                           | you                                                               | `dm`           |
| Someone @mentions you in a channel message                       | you                                                               | `mention`      |
| Someone @mentions you in a thread reply                          | you                                                               | `mention`      |
| Someone replies in a thread you have posted in or been tagged in | every other participant (not those newly mentioned in that reply) | `thread_reply` |
| The AI replies in a thread                                       | every human participant                                           | `thread_reply` |

You are never notified about your own messages, and the AI never receives
activity.

## Activity panel

- **Where:** Activity tab in the rail.
- **What:** newest-first rows, each with the sender's avatar, a title such as
  "<name> mentioned you in #<channel>", "… mentioned you in a thread
  in #<channel>", "… replied in a thread in your conversation", or "… sent you a
  direct message", the time, and a clamped preview of the referenced message.
  Unread rows are bold on a tinted background with a dot indicator; read rows
  are muted. If the channel has since been deleted the location reads "a deleted
  channel". When there is nothing yet, the panel explains what will show up
  here.
- **Load older activity:** a button at the bottom pages further back through the
  feed.
- Previews are loaded live from the referenced message's feed. If the message is
  further back than a few pages, the row says "Message is further back in the
  history"; if it has been deleted, the item is removed.

## Jump to a message

- **How:** click an activity row.
- **What happens:** the app switches to the conversation the item belongs to,
  opens the thread if the message is a thread reply, scrolls the message into
  the centre of the view, and highlights it with a yellow background. The
  clicked row is marked active. If the message is not loaded yet, the list pages
  back through history (up to four extra pages) to find it.

## Marking items read

- **Automatically:** opening a conversation marks all top-level items for that
  conversation read. Items for a thread are marked read once that thread panel
  is open.
- **One item:** hover an unread row and click the check icon ("Mark as read").
- **All items:** click the double-check icon in the Activity header ("Mark all
  as read"). The button only appears when something is unread.
- Marking read clears badges but keeps the item in the list as history.

## Where unread counts appear

| Surface                    | Counts                                                 | Colour |
| -------------------------- | ------------------------------------------------------ | ------ |
| Rail → Home                | unread mentions rooted in channels                     | red    |
| Rail → DMs                 | all unread items rooted in a DM                        | red    |
| Rail → Activity            | all unread items                                       | red    |
| Channel row (Home)         | unread mentions in that channel, including its threads | red    |
| DM row (Home, compact)     | all unread items in that DM, including its threads     | red    |
| DM row (DMs tab, detailed) | same as above                                          | brand  |
| Activity row               | dot while unread                                       | brand  |

Plain thread replies in a channel never badge the channel row or the Home tab;
they only show in Activity.

## Files

- `features/activity/activity.ts`
- `features/activity/use-activity.ts`
- `features/activity/activity-panel.tsx`
- `primitives/preview-row.tsx`
- Tests: `tests/`
