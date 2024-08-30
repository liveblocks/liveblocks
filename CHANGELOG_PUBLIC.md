<!--

PUBLIC CHANGELOG
https://liveblocks.io/changelog

- Paste changes into the current week.
- Put package versions first, with the newest at the top.
- Add each contributor's GitHub username.

TEAM MEMBERS
adigau, ctnicholas, flowflorent, guillaumesalles, jrowny, marcbouchenoire,
nimeshnayaju, nvie, ofoucherot, pierrelevaillant, stevenfabre, sugardarius

-->

# Week 36 (2024-09-06)

## Contributors

# Week 35 (2024-08-30)

## v2.6.0

### `@liveblocks/node`

- Add `getInboxNotifications` method which supports an `unread` query parameter.

## Dashboard

- Room detail page enhancements:
    - Renamed "Document" tab to "Realtime APIs" (Storage + Yjs) to reflect new product offerings.
    - Reordered tabs: Comments, Text Editor, Realtime APIs, Metadata, Permissions.
    - Introduced a new Text Editor tab with enhanced features:
        - Preview Lexical documents directly from the dashboard, including mentions, comment annotations, and custom nodes.
        - Access comment threads from text annotations and browse their comments and metadata.
    - Broadcast custom events to people connected in the room using a typed editor.
- New inline view for comment threads:
    - Offers a more visual and intuitive way to browse comments.
    - Added ability to sort threads by latest activity, most replies, or creation date.
    - Introduced an option to delete all threads in a room at once.

## Documentation

- Improved search dialog box:
  - Returns more accurate results, and is generally much more useful.
  - Returns more results than before, allowing you to accessibly scroll through the list.
- New guide on [setting initial/default state in BlockNote](https://liveblocks.io/docs/guides/setting-an-initial-or-default-value-in-blocknote).

## Website

- New [book a demo](http://liveblocks.io/contact/sales) page, allowing you to easily set up a meeting with our sales team.

## Contributors

ctnicholas, sugardarius, pierrelevaillant, stevenfabre

# Week 34 (2024-08-23)

## Examples

- Add new features and polish to the [Next.js Overlay Comments](https://liveblocks.io/examples/overlay-comments/nextjs-comments-overlay) and [Next.js Canvas Comments](https://liveblocks.io/examples/canvas-comments/nextjs-comments-canvas) examples.
- Comments now flip when previously they would go offscreen, and other small bugs were fixed.

## Contributors

ctnicholas

# Week 33 (2024-08-16)

## v2.5.1

### `@liveblocks/yjs`

- Fix `LiveblocksProvider` `update`/`change` event not returning `removed` users.

## v2.5.0

### `@liveblocks/react`

- Add
  [`useIsInsideRoom`](https://liveblocks.io/docs/api-reference/liveblocks-react#useIsInsideRoom)
  hook, useful for rendering different components inside and outside of
  [`RoomProvider`](https://liveblocks.io/docs/api-reference/liveblocks-react#RoomProvider).

### `@liveblocks/react-lexical`

- Fix a bug in [`useEditorStatus`](https://liveblocks.io/docs/api-reference/liveblocks-react-lexical#useEditorStatus) which prevented it from returning a correct status when `LexicalPlugin` was rendered conditionally.
- Fix remote cursors not displaying user names.

### `@liveblocks/react-ui`

- Improve event propagation in [`Composer`](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Composer).

## `@liveblocks/codemod`

- Prevent modifying files that weren’t changed by the codemods. 

## Contributors

ctnicholas, nimeshnayaju, marcbouchenoire

# Week 32 (2024-08-09)

## Website

- New blog post: [What’s new in Liveblocks: July edition](https://liveblocks.io/blog/whats-new-in-liveblocks-july-edition-2024).

## Dashboard

- Add the ability to see the response body of webhook attempts in the webhook event details dialog (found in the "more" dropdown).

## Documentation

- Add API reference for [`liveblocks.markThreadAsResolved`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-mark-as-resolved) and [`liveblocks.markThreadAsUnresolved`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-mark-as-unresolved).

## Contributors

ctnicholas

# Week 31 (2024-08-02)

## Dashboard

- Add the Room API docs to the dashboard. Copy pre-filled code snippets from the API reference directly from the Room detail page.
- Optimize the width of rooms, schemas, and webhooks lists when a detail view is opened for more comfort on medium-sized screens.

## Documentation

- Updated [How to modify Storage from the server](https://liveblocks.io/docs/guides/how-to-modify-liveblocks-storage-from-the-server) for Liveblocks 2.0.
- Fixed various typos.
- Show public/secret keys within the Bash code snippets for connected users.

## Contributors

pierrelevaillant, sugardarius, teddarific, assaadhalabi

# Week 30 (2024-07-26)

## v2.4.0

### `@liveblocks/client`

- Add vanilla [Comments](https://liveblocks.io/docs/api-reference/liveblocks-client#Comments) and [Notifications](https://liveblocks.io/docs/api-reference/liveblocks-client#Notifications) APIs to `Client` and `Room`, enabling these products outside of React.

## Documentation

- Add info on new [Comments](https://liveblocks.io/docs/api-reference/liveblocks-client#Comments) and [Notifications](https://liveblocks.io/docs/api-reference/liveblocks-client#Notifications) methods in `@liveblocks/client` API reference.
- Add info on [typing thread metadata](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Typed-metadata) to React UI API reference.
- Various small fixes.

## Dashboard

- Add room search functionality in the Rooms tab of a project.
- Include creation dates in the rooms table list.
- Fix number formatting issues for document sizes.
- Implement sorting options by room ID, last connection date, comments count, documents size, and creation date.
- Improve date formatting across the dashboard. Now using more human-readable relative dates, with absolute dates displayed on hover.
- Display the number of currently online users on the room details page.
- Add room deletion option in the detail page menu.
- Improve rooms table list responsiveness on mobile.

## Contributors

guillaumesalles, ctnicholas, sugardarius, pierrelevaillant, nimeshnayaju

# Week 29 (2024-07-19)

## v2.3.0

### `@liveblocks/react-lexical`

- New default components: `AnchoredThreads` and `FloatingThreads` to display
  threads that are tied to a specific part of the document, similar to Notion,
  Linear, etc:
  - [`FloatingThreads`](https://liveblocks.io/docs/api-reference/liveblocks-react-lexical#FloatingThreads)
    displays floating `Thread` components below text highlights in the editor.
  - [`AnchoredThreads`](https://liveblocks.io/docs/api-reference/liveblocks-react-lexical#AnchoredThreads)
    displays a list of `Thread` components vertically alongside the editor.
  - These components can be used in the same application to create a UI that
    works on both mobile and desktop.

### `@liveblocks/react`

- Add `useDeleteInboxNotification` and `useDeleteAllInboxNotifications` hooks.
- Fix `resolved` query not being applied when filtering threads with
  `useThreads`.
- Various refactorings to Suspense internals.

### `@liveblocks/react-ui`

- Add "Delete notification" action to `InboxNotification`.
- Hide "Mark as read" action in `InboxNotification` when already read.
- Improve keyboard navigation within emoji pickers.

### `@liveblocks/node`

- Add `deleteInboxNotification` and `deleteAllInboxNotifications` methods.

## Examples

- Added delete all notifications button to notifications examples.

## Documentation

- Open the config file by default in the interactive [broadcasting events tutorial](https://liveblocks.io/docs/tutorial/react/getting-started/broadcasting-events).

## Website

- Fix changelog images on mobile.

## Contributors

nimeshnayaju, ofoucherot, nvie, marcbouchenoire, dant2021, ctnicholas

# Week 28 (2024-07-12)

## v2.2.2

### `@liveblocks/react-ui`

- Fix missing avatar in `textMention` inbox notifications.
- Fix `textMention` usage (and its props type) when customizing rendering via `kinds` on `InboxNotification`.
- Fix broken CSS selector in default styles.

## v2.2.1

### `@liveblocks/yjs`

- Don’t attempt to write Yjs changes if the current user has no write access

## Contributors

jrowny, nvie, marcbouchenoire

# Week 27 (2024-07-05)

## v2.2.0

We are making `resolved` a first-class citizen property on
[threads](https://liveblocks.io/docs/products/comments/concepts#Threads), for
more information about this change please read our
[Upgrade Guide for 2.2](https://liveblocks.io/docs/platform/upgrading/2.2).

### `@liveblocks/react`

- Add `useMarkThreadAsResolved` and `useMarkThreadAsUnresolved` hooks.
- Support `query.resolved` when filtering threads.
- The
  [`useStorageStatus`](https://liveblocks.io/docs/api-reference/liveblocks-react#useStorageStatus)
  hook now also has a `{ smooth: true }` setting to make building calm UIs with
  it a bit easier.
- The `useClient()` hook is now also available for users of
  `createRoomContext()` and/or `createLiveblocksContext()`.
- Fix: avoid unnecessary re-renders if inbox notifications haven't changed.

### `@liveblocks/react-ui`

- Use first-class citizen `resolved` property in `Thread` component.
- Preserve rich text when pasting into the composer.
- Add support for custom links to the composer. (either by pasting URLs with
  plain text selected or by pasting existing links)
- Preserve whitespace and empty lines in comments.
- Mark threads as read when visible (like before), but only if the window is
  focused.
- Fix improper `useTransition` fallback which would break on React versions
  lower than 18.

### `@liveblocks/node`

- Add `markThreadAsResolved` and `markThreadAsUnresolved` methods.
- Add `ThreadMarkedAsResolvedEvent` and `ThreadMarkedAsUnresolvedEvent` webhook
  events.
- Support `query.resolved` when querying threads.

### `@liveblocks/react-lexical`

- Upgrade `lexical` peer dependency to version `^0.16.1` that fixes
  compatibility issues with Next.js versions 14.2.0 and above.

### `@liveblocks/node-lexical`

- Upgrade `lexical` peer dependency to version `0.16.1`.

## Documentation

- Add [`useStorageStatus`](https://liveblocks.io/docs/api-reference/liveblocks-react#useStorageStatus) information.
- Fix code snippet in [Nested data types page](https://liveblocks.io/docs/tutorial/react/getting-started/nesting-data-types) of interactive tutorial.

## Website

- New blog post: [How Hashnode added collaboration to their text editor to sell to larger organizations](https://liveblocks.io/blog/how-hashnode-added-collaboration-to-their-text-editor-to-sell-to-larger-organizations).

## Contributors

flowflorent, ofoucherot, nvie, marcbouchenoire, nimeshnayaju, ctnicholas, Teddarific, stevenfabre

# Week 26 (2024-06-28)

## v2.1.0

### `@liveblocks/client`

- Various internal refactorings

### `@liveblocks/react`

- Add new hook
  [`useStorageStatus`](https://liveblocks.io/docs/api-reference/liveblocks-react#useStorageStatus),
  which returns the current storage status of the room, and will re-render your
  component whenever it changes. This can used to build "Saving..." UIs.
- Add
  [`useDeleteThread`](https://liveblocks.io/docs/api-reference/liveblocks-react#useDeleteThread)
  hook to delete a thread and its associated comments.
- Fix: add missing JSDoc comments
- Fix: improve some error messages and stack traces to contain more info
- Refactorings to Suspense internals

### `@liveblocks/react-ui`

- Fix improper `useSyncExternalStore` import which would break on React versions
  lower than 18.

## v2.0.5

### `@liveblocks/react`

- Improved DX: `useDeleteThread` will now throw a client-side error if someone
  else than the thread owner tries to delete the thread. This will help you
  catch and handle this case more easily.

## Documentation

- Updated the
  [interactive tutorial](https://liveblocks.io/docs/tutorial/react/getting-started/welcome)
  for Liveblocks 2.0.

## Website

- New blog post:
  [Introducing Liveblocks collaboration kit for Figma](https://liveblocks.io/blog/introducing-liveblocks-collaboration-kit-for-figma).
- Updated [contact page](https://liveblocks.io/contact) with two separate forms
  for sales and support.

## Processes

- Versioning and publishing of public packages is now decoupled from
  versioning/publishing of our CLI tools.

## Contributors

flowflorent, ctnicholas, nvie, stevenfabre, pierrelevaillant, marcbouchenoire

# Week 25 (2024-06-21)

## v2.0.4

- Improve TS error messages and error locations if custom `UserMeta` or
  `ActivitiesData` types do not match their requirements.

### `@liveblocks/client`

- Add missing type export for `CommentReaction`
- Don’t attempt to write missing initialStorage keys if the current user has no
  write access to storage. This will no longer throw, but issue a warning
  message in the console.

### `@liveblocks/react`

- Add
  [`useDeleteThread`](https://liveblocks.io/docs/api-reference/liveblocks-react#useDeleteThread)
  hook to delete a thread and its associated comments.

## v2.0.3

### `@liveblocks/client`

- In `client.enterRoom()`, the options `initialPresence` and `initialStorage`
  are now only mandatory if your custom type requires them to be.

### `@liveblocks/react`

- In `<RoomProvider>`, the props `initialPresence` and `initialStorage` are now
  only mandatory if your custom type requires them to be.
- Nesting `<LiveblocksProvider>`s will now throw to prevent incorrect usage

### `@liveblocks/react-ui`

- Prevent the composer from splitting text being composed.
- Handle parentheses around and within auto links.
- Count whitespace as empty to prevent posting empty comments.
- Prevent clearing the composer if it's not handled. (via `onComposerSubmit`)

### `@liveblocks/yjs`

- Add missing type exports

## v2.0.2

### `@liveblocks/node`

- Add `deleteThread` method to the client to delete a room's thread.
- Add the `threadDeleted` webhook event to notify when a thread is deleted.
- Fix type signatures of `client.identifyUser()` and `client.prepareSession()`
  to require `userInfo` if it's mandatory according to your global `UserMeta`
  type definition.

## Examples

- New
  [custom notifications example](https://liveblocks.io/examples/notifications-custom/nextjs-notifications-custom).
- Updated
  [BlockNote example](https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-yjs-blocknote-advanced)
  and guide to v0.14.1.

## Documentation

- Create new guide on
  [how to add users to Liveblocks text editor](https://liveblocks.io/docs/guides/how-to-add-users-to-liveblocks-text-editor).
- Updated
  [Lexical product page](https://liveblocks.io/docs/products/text-editor/lexical)
  with new information.
- Improved Lexical get started guides.
- Improved
  [`Liveblocks.initializeStorageDocument`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-storage)
  section.
- Fixed typo with token syntax passed to `authEndpoint`.

## Website

- New blog post:
  [How Zapier added collaborative features to their Canvas product in just a couple of weeks](https://liveblocks.io/blog/how-zapier-added-collaborative-features-to-their-canvas-product-in-just-a-couple-of-weeks).

## Contributors

ctnicholas, stevenfabre, matthewlipski, flowflorent, nvie

# Week 24 (2024-06-14)

## v2.0.0

This major release marks the maturity of Liveblocks. It contains new products
(`@liveblocks/react-lexical`) and clarifications (e.g.
`@liveblocks/react-comments` is now called `@liveblocks/react-ui`). t Also, we
bring major DX improvements by allowing you to specify your types globally now.
These types will be typed once and shared across all Liveblocks APIs, which
includes your Node backend.

```ts file="liveblocks.config.ts"
// ❌ Before
export const {
  suspense: {
    RoomProvider,
    useRoom,
    // etc
  },
} = createRoomContext<Presence, Storage>(client);

// ✅ After
declare global {
  interface Liveblocks {
    Presence: Presence;
    Storage: Storage;
  }
}
```

In `@liveblocks/react`, you can now import hooks directly:

```ts file="MyComponent.tsx"
// ❌ Before: get hooks exported from your Liveblocks config
import { RoomProvider, useRoom, ... } from "./liveblocks.config";

// ✅ After: import hooks directly
import { RoomProvider, useRoom, ... } from "@liveblocks/react";
import { RoomProvider, useRoom, ... } from "@liveblocks/react/suspense";
```

```ts
// ❌ Before
const client = createClient(/* options */);

// ✅ After
<LiveblocksProvider /* options */>
  <App />
</LiveblocksProvider>
```

For full upgrade instructions and codemods, see the
[2.0 upgrade guide](https://liveblocks.io/docs/platform/upgrading/2.0).

### `create-liveblocks-app`

- Update config generation for Liveblocks 2.0.
- Add `--upgrade` flag to automatically update all Liveblocks package to their
  latest version.

### `@liveblocks/client`

- DX improvements: type once, globally, benefit everywhere

### `@liveblocks/react`

- DX improvement: import hooks directly
- DX improvement: `<ClientSideSuspense>` no longer needs a function as its
  `children`
- New provider: `LiveblocksProvider` (replaces the need for `createClient`)
- New hook: `useClient`
- Tweak `useMutation` error message to be less confusing.
- Allow thread and activity metadata types to contain `undefined` values.

### `@liveblocks/react-ui`

- Rename from `@liveblocks/react-comments`.
- Rename `<CommentsConfig />` to `<LiveblocksUIConfig />`.
- Improve `InboxNotification` props types.

### `@liveblocks/react-lexical`

- Initial release.

### `@liveblocks/node-lexical`

- Initial release.

### `@liveblocks/yjs`

- `LiveblocksProvider` is no longer a default export, it’s now
  `import { LiveblocksYjsProvider } from "@liveblocks/yjs"`.

### `@liveblocks/node`

- DX improvements: all Node client methods will pick up the same global types
  you’re using in your frontend
- Rename `RoomInfo` to `RoomData`.
- The webhook event `NotificationEvent`’s type can represent multiple kinds of
  notifications. (`"thread"`, `"textMention"`, and custom ones (e.g.
  `"$myNotification"`))

### `@liveblocks/codemod`

- Initial release.

## Documentation

- New API reference page for
  [`@liveblocks/react-lexical`](https://liveblocks.io/docs/api-reference/liveblocks-react-lexical).
- Added lots of new information to
  [`@liveblocks/react`](https://liveblocks.io/docs/api-reference/liveblocks-react)
  API reference page.
- Information includes details
  [Suspense](https://liveblocks.io/docs/api-reference/liveblocks-react#Suspense)
  section, new
  [`LiveblocksProvider`](https://liveblocks.io/docs/api-reference/liveblocks-react#Liveblocks)
  props, details on typing, and more.
- Added a set of product pages for
  [Notifications](https://liveblocks.io/docs/products/notifications), with info
  on concepts, components, hooks, styling, and email notifications.
- Added product page for
  [Lexical](https://liveblocks.io/docs/products/text-editor/lexical) summarising
  all its features.
- Restructured and updated existing product pages for our new products.
- More information on the
  [`NotificationEvent`](https://liveblocks.io/docs/platform/webhooks#NotificationEvent)
  webhook, including the new
  [`textMention`](https://liveblocks.io/docs/platform/webhooks#TextMention-notification)
  kind.
- Created new guide on
  [adding users to Liveblocks Notifications](https://liveblocks.io/docs/guides/how-to-add-users-to-liveblocks-notifications).
- Created new guide on
  [adding users to Liveblocks Text Editor](https://liveblocks.io/docs/guides/how-to-add-users-to-liveblocks-text-editor).
- Created new get started guides for our new Lexical packages.
- Added product badges to get started guides.
- Updated all get started guides for new type improvements.
- Updated API references for new type improvements.
- Updated various guides for new type improvements.
- Updated images and text on
  [How Liveblocks works](https://liveblocks.io/docs/concepts/how-liveblocks-works)
  page.

## Website

- We redesigned our website to represent the Liveblocks product offering more
  accurately. Here are some of the key changes:
  - New homepage with interactive 3D game in the hero.
  - New page product page for
    [Liveblocks Text Editor](https://liveblocks.io/text-editor)
  - New page product page for
    [Liveblocks Notifications](https://liveblocks.io/notifications)
  - New page product page for
    [Liveblocks Realtime APIs](https://liveblocks.io/realtime-apis)
  - Improved [pricing page](https://liveblocks.io)
  - New navigation
- New blog post:
  [Introducing Liveblocks 2.0](https://liveblocks.io/blog/introducing-liveblocks-2-0).

## Examples

- Added new example: `nextjs-lexical`
- Upgraded and adjusted all examples to 2.0

## Infrastructure

- [Webhooks](https://liveblocks.io/docs/platform/webhooks) are now available to
  everyone.

## Dashboard

- Show Lexical information in rooms that use the new Lexical plugin.

## Contributors

adigau, ctnicholas, flowflorent, guillaumesalles, jrowny, marcbouchenoire,
nimeshnayaju, nvie, ofoucherot, pierrelevaillant, stevenfabre

# Week 21 (2024-05-24)

![banner](/assets/changelog/week-21.png)

## Dashboard

- Added a brand new project analytics page with graphs that gives you better
  insights into active users, active rooms, comments, notifications, and data
  stored.
- Improved the billing and usage view.
- Moved Webhooks notification throttle interval setting to the project settings
  page
- Fixed a number formatting issue by enforcing US number formatting for all
  locations

## Misc

- Ongoing internal refactorings to enable simpler setup for `@liveblocks/react`
  in the future.

## Contributors

ofoucherot, flowflorent, stevenfabre, guillaumesalles, nvie

# Week 20 (2024-05-17)

## Dashboard

- Liveblocks events are now visible in the dashboard.
  - New "Events" tab within a project.
  - Filter room events by type (e.g. `userEntered`, `userLeft`), exact `roomId`,
    and exact `userId`.
  - Select a date range (with available presets).
  - Click on an event to open the event details modal.
  - Navigate between events using the previous/next buttons without leaving the
    modal.
- On the room's detail page, click "View room events" at the top right to access
  the room events.
- Added a new date picker to the "Overview" and "Events" pages.
- Improved onboarding.
  - Making sure the default team name isn't too long and can be submitted.
  - Improved form submission performance by only calling the required API
    endpoints.

## Misc

- Fixed broken link in one onboarding email.
- Internal refactorings to enable simpler setup for `@liveblocks/react` in the
  future.

## Contributors

pierrelevaillant, ofoucherot, stevenfabre, nvie

# Week 19 (2024-05-10)

## Website

- New [changelog section](https://liveblocks.io/changelog).

## Documentation

- Completely rewritten API reference for
  [`@liveblocks/client`](https://liveblocks.io/docs/api-reference/liveblocks-client).
- New components for showing arguments, returns, properties.
- Refreshed banner components.
- Add webhooks
  [source IP addresses](https://liveblocks.io/docs/platform/webhooks#source-ips)
  for receiving endpoints behind NAT or firewalls.
- Fixed a typo in query language rooms
  [guide](https://liveblocks.io/docs/guides/how-to-filter-rooms-using-query-language).

## Dashboard

- The project quickstart connection status can now be dismissed.
- Improved copy to clarify the difference between production and development
  projects.
- Improved project overview banner copy for when Liveblocks hasn't yet been set
  up.

## Infrastructure

- Made batch processing of webhook and other events more efficient at scale.

## Contributors

ctnicholas, stevenfabre, pierrelevaillant, ofoucherot, flowflorent

# v1.12.0

## `@liveblocks/react`

- Add support for custom notification kinds.
- Add new `useInboxNotificationThread` hook to `createLiveblocksContext`, which
  can be used to retrieve threads within thread notifications for more
  flexibility.
- Add support for `startsWith` operator to `useThreads` when filtering based on
  metadata.

## `@liveblocks/react-comments`

- Add support for custom notification kinds to the `InboxNotification` component
  via the `kinds` prop and the `InboxNotification.Custom` component.
- Add destructive color tokens. (`--lb-destructive`,
  `--lb-destructive-foreground`, and `--lb-destructive-contrast`)

## `@liveblocks/node`

- Add `triggerInboxNotification` method that lets you trigger custom
  notification kinds.
- Enable filtering rooms by room ID in the `getRooms` method. This works via
  `query.roomId`, `metadata` is deprecated and is now `query.metadata`.
- Add support for our query language when filtering with the `getRooms` and
  `getThreads` methods.
- Add support for an alternative object-based query notation to the `getRooms`
  and `getThreads` methods, which supports exact matches and the `startsWith`
  operator.

# v1.11.3

## `@liveblocks/client`

- Fixes a potential `RangeError: Maximum call stack size exceeded` in
  applications that produce many operations

## `@liveblocks/node`

- Add missing `updatedAt` property to `YDocUpdatedEvent` type.
  ([@alexlande](https://github.com/alexlande))

# v1.11.2

## `create-liveblocks-app`

- Add support for the updated Starter Kit.

# v1.11.1

## `@liveblocks/react-comments`

- Fix the composer’s placeholder to appear instantly instead of being initially
  invisible.
- Fix the default composer’s actions not being disabled when the composer is.

## `@liveblocks/node`

- Fix "`process` is undefined" issue in Vite builds. This issue was already
  fixed for `@liveblocks/core`, but not for `@liveblocks/node` yet.

## DevTools

- Improve tree view to visualize Y.js documents and inspect Y.js awareness.

# v1.11.0

## `@liveblocks/node`

- Add `updateRoomId` method that lets you update the room ID of the specified
  room.
- Add an optional `guid` parameter to `sendYjsBinaryUpdate` and
  `getYjsDocumentAsBinaryUpdate` to point to a Yjs subdocument with the
  specified guid.

## `@liveblocks/react`

- Add `scrollOnLoad` option to `useThreads`: enabled by default, this option
  controls whether to scroll to a comment on load based on the URL hash.
- `useUser` and `useRoomInfo` no longer support returning nothing. Returning
  `undefined` will now be treated as an error.
- Fix bug where `useUser` and `useRoomInfo` returned an extra `data` superfluous
  property.
- Fix bug where customizing types on `createLiveblocksContext` would conflict
  with the provided `Client`.

## `@liveblocks/react-comments`

- Add actions to `InboxNotification` with a single action for now: marking as
  read.
- Improve actions hover behavior in `Comment`/`Thread`.
- Change `Comment` background color when it’s linked to or being edited.

# v1.10.4

- Fix bundling issue in Vite projects, where `process is not defined` could
  happen

# v1.10.3

## `@liveblocks/react-comments`

- Add support for Emoji v15.1 in emoji picker, along two additional locales:
  Bengali (`bn`) and Hindi (`hi`).
- Fix bug where the `showRoomName` prop on `InboxNotification.Thread` wasn’t
  applied to notifications about mentions.

## `@liveblocks/react`

- Fix bug where removing metadata via `useEditThreadMetadata` would result in a
  brief flash of the old metadata after the metadata was removed optimistically.

# v1.10.2

## `@liveblocks/client`

- Fix bug where calling `.clone()` immediately after creating a new `LiveObject`
  could throw an error

# v1.10.1

## `@liveblocks/client`

- Fix bug where the client’s backoff delay would not be respected correctly in a
  small edge case.

## `@liveblocks/react-comments`

- Fix date localization in `InboxNotification`.
- Add vendor prefixes to more CSS properties within the default styles.

## `@liveblocks/react`

- Added error retrying to `useThreads`, `useRoomNotificationSettings`, and
  `useInboxNotifications` during initial fetching.

# v1.10.0

This release introduces Notifications (and unread indicators) for Comments.

## `create-liveblocks-app`

- Add `createLiveblocksContext` and Notifications to `--init`.
- Move resolver options from `createRoomContext` to `createClient` and add
  `resolveRoomsInfo` to the list of resolvers.

## `@liveblocks/client`

- Add options to `createClient`: `resolveUsers`, `resolveMentionSuggestions`
  (both were previously defined on `createRoomContext` from
  `@liveblocks/react`), and the new `resolveRoomsInfo`.

## `@liveblocks/react`

- Add new `LiveblocksContext` accessible with `createLiveblocksContext`,
  similarly to `createRoomContext`. This context is meant to live at the root
  since it handles things outside of rooms, like notifications. It contains
  `LiveblocksProvider`, `useUser`, `useRoomInfo`, `useInboxNotifications`,
  `useUnreadInboxNotificationsCount`, `useMarkInboxNotificationAsRead`, and
  `useMarkAllInboxNotificationsAsRead`.
- Add new hooks to `createRoomContext`: `useMarkThreadAsRead`,
  `useThreadSubscription`, `useRoomInfo`, `useRoomNotificationSettings`, and
  `useUpdateRoomNotificationSettings`.
- Make some hooks usable interchangeably between `createLiveblocksContext` and
  `createRoomContext`: `useUser`, and `useRoomInfo`.

## `@liveblocks/react-comments`

- Add new default components: `InboxNotification` and `InboxNotificationList`.
- Add unread indicators to the default `Thread` component.
- Support "@" in mentions. (e.g. `@user@email.com` is now a valid mention and
  will trigger `resolveMentionSuggestions` with `"user@email.com"`)

## `@liveblocks/node`

- Add the Notifications REST APIs as fully typed methods. (includes
  `getInboxNotification`, `getRoomNotificationSettings`,
  `updateRoomNotificationSettings`, and `deleteRoomNotificationSettings`
  methods)
- Add notification webhook event: `NotificationEvent`.

# v1.9.8

## `@liveblocks/client`

- Fix race condition in client that could leave zombie WebSocket connections
  open indefinitely in a small edge case. (thanks for reporting,
  [@dev-badace](https://github.com/dev-badace))

## `@liveblocks/react`

- Fix type definitions of `useOthersListener` hook.
- Fix type definitions of `useErrorListener` hook.

## `@liveblocks/yjs`

- Emit update events from awareness.
- Fix several awareness bugs.

# v1.9.7

## `@liveblocks/node`

- Expose new `nextCursor` field in
  [Get Rooms](https://liveblocks.io/docs/api-reference/liveblocks-node#get-rooms)
  API responses, to make pagination easier to work with
- Update TypeScript types for some responses

## `create-liveblocks-app`

- Adds a fallback for passing data from Safari to the console.

# v1.9.6

## `@liveblocks/react`

- Fix certain Next.js sites not building correctly due to improper
  `useSyncExternalStore` import

# v1.9.5

## `@liveblocks/react-comments`

- Fix mention suggestions not appearing.

# v1.9.4

## `@liveblocks/react`

- Fix polling on `useThreads` hook.

# v1.9.3

## `@liveblocks/react`

- Fix a bug that prevented comments from being used across multiple rooms.

## `@liveblocks/node`

- Fix `getRooms()` not throwing `LiveblocksError` when invalid response was
  received.

# v1.9.2

## `@liveblocks/react-comments`

- Add `portalContainer` prop to `CommentsConfig` to customize where floating
  elements (e.g. tooltips, dropdowns, etc) are portaled into.

# v1.9.1

## `@liveblocks/node`

- Fixes the signature and behavior of the `Liveblocks.sendYjsBinaryUpdate()`
  API. It now takes a Yjs encoded update (`Uint8Array`) directly.

# v1.9.0

## `@liveblocks/node`

- Add the Comments write REST APIs as fully typed methods. (includes
  `createThread`, `editThreadMetadata`, `createComment`, `editComment`,
  `deleteComment`, `addCommentReaction`, and `removeCommentReaction` methods)
- Fix the return type of `getActiveUsers` to match the data returned from the
  endpoint.

## `@liveblocks/react`

- Add `query` option to `useThreads` to filter threads based on their metadata.

## `@liveblocks/react-comments`

- Add support for exit animations to `ComposerSuggestions`.

# v1.8.2

## `@liveblocks/react`

- Improve Comments revalidation when losing network or staying in the
  background.
- Improve error handling of Comments mutations. (e.g. thread creation, comment
  creation, etc.)

## `@liveblocks/client`

- Export the `CommentBody` utilities added to `@liveblocks/node` in v1.8.0.
- Harmonize exports with `@liveblocks/node`. (added `IUserInfo` and
  `PlainLsonObject`)

## `@liveblocks/node`

- Harmonize exports with `@liveblocks/client`. (added `CommentBody`,
  `CommentBodyBlockElement`, `CommentBodyElement`, `CommentBodyInlineElement`,
  `CommentBodyLink`, `CommentBodyMention`, `CommentBodyParagraph`,
  `CommentBodyText`, `JsonArray`, `JsonScalar`, `Lson`, `LsonObject`, and
  `User`)

# v1.8.1

- Fix a bug in `toPlainLson` helper
- Fix a bug where pausing history more than once could lead to history loss

# v1.8.0

This release adds all the REST APIs as fully typed methods, and utilities to
transform comments, to `@liveblocks/node`.

## `@liveblocks/node`

- Add all the REST APIs as fully typed methods to `Liveblocks` client. See
  [docs](https://liveblocks.io/docs/api-reference/liveblocks-node#Liveblocks-client).
- Add utilities to work with the `CommentBody` format from Comments:
  - `getMentionedIdsFromCommentBody(body)` - Get a list of all mentioned IDs
    from a `CommentBody`. See
    [docs](https://liveblocks.io/docs/api-reference/liveblocks-node#get-mentioned-ids-from-comment-body).
  - `stringifyCommentBody(body, options)` - Convert a `CommentBody` to a string,
    either as plain text, HTML, or Markdown. It supports resolving mention IDs
    similarly to `@liveblocks/react` and overriding each element to control the
    formatting. See
    [docs](https://liveblocks.io/docs/api-reference/liveblocks-node#stringify-comment-body).

# v1.7.1

## `@liveblocks/react-comments`

- Fix `Composer` focus issues.
- Improve relative date formatting for some locales. (e.g. the `"fr"`` locale
  formatted “1h ago” as “-1 h” instead of “il y a 1 h”)
- Improve default monospace font for inline code blocks.

# v1.7.0

[Liveblocks Comments](https://liveblocks.io/comments) is now available for
everyone as a public beta, learn more about this
[in the announcement](https://liveblocks.io/blog/liveblocks-comments-is-available-for-everyone).

## `@liveblocks/client`

- Improve some internal logging.

## `@liveblocks/react`

- Improve Comments-specific error logging.

## `@liveblocks/react-comments`

- Improve default relative date formatting. (e.g. “2 hours ago” → “2h ago”)

## `create-liveblocks-app`

- Add `ThreadMetadata` type to `--init` command.

# v1.6.0

## `@liveblocks/yjs`

- Add support for subdocs.

# v1.5.2

## `@liveblocks/react`

- Fix return type of `resolveUsers`.

# v1.5.1

- Fixes a bug in the bounds check of the `backgroundKeepAliveTimeout` option.

# v1.5.0

Support multiple RoomProviders, or mixing and matching our React package in the
same app with a Redux and/or Zustand instance.

At the client level, there is a new API for entering/leaving rooms, which we’re
now recommending over the old APIs. (The old APIs remain working exactly how
they are today, however.)

```ts
// Old APIs we'll no longer be recommending (but that will remain working)
const room = client.enter("my-room", options);
client.getRoom("my-room");
client.leave("my-room");
```

```ts
// New API we'll be recommending instead
const { room, leave } = client.enterRoom("my-room", options);
leave();
```

## `@liveblocks/client`

- New client config option: `backgroundKeepAliveTimeout` (a numeric value in
  milliseconds). See
  [docs](https://liveblocks.io/docs/api-reference/liveblocks-client#createClientBackgroundKeepAliveTimeout).
- New APIs:
  - `Client.enterRoom(roomId, options)` – enters the room and return both the
    room and an "unsubscribe function" to leave that room again. This newer API
    supports entering/leaving the same room multiple times, making it possible
    to connect to the same room from different parts of your application. See
    [docs](https://liveblocks.io/docs/api-reference/liveblocks-client#Client.enterRoom).
  - `Client.logout()` – Call this on the Liveblocks client when you log out a
    user in your application. It will purge all auth tokens and force-leave any
    rooms, if any are still connected. See
    [docs](https://liveblocks.io/docs/api-reference/liveblocks-client#Client.logout).
  - `LiveList.clone()` – see
    [docs](https://liveblocks.io/docs/api-reference/liveblocks-client#LiveList.clone).
  - `LiveMap.clone()` – see
    [docs](https://liveblocks.io/docs/api-reference/liveblocks-client#LiveMap.clone).
  - `LiveObject.clone()` – see
    [docs](https://liveblocks.io/docs/api-reference/liveblocks-client#LiveObject.clone).
- Deprecated APIs:
  - `client.enter(roomId, options)`
  - `client.leave(roomId)`
- Renamed enter option: `shouldInitiallyConnect` → `autoConnect`. Its meaning or
  working did not change.
- Fixes a potential `Cannot set parent: node already has a parent` error when
  initializing storage with Live datastructures that are already tied to a
  Storage tree.

## `@liveblocks/react`

- Support using multiple `RoomProvider` components in your component tree for
  the same room ID.
- Renamed `RoomProvider` prop: `shouldInitiallyConnect` → `autoConnect`. Its
  meaning or working did not change.
- New hook:
  - `useOthersListener({ type, user, others })`, see
    [docs](https://liveblocks.io/docs/api-reference/liveblocks-react#useOthersListener)

## `@liveblocks/redux`

- **Breaking:** The `leaveRoom()` function no longer accepts a `roomId`. It will
  always leave the currently joined room.

## `@liveblocks/zustand`

- The `enterRoom()` function will now return a leave callback function.
- **Breaking:** The `leaveRoom()` function no longer accepts a `roomId`. It will
  always leave the currently joined room.

# v1.4.8

## `create-liveblocks-app`

- Add Comments hooks and options to `--init` command.

## `@liveblocks/client`

- Export all `CommentBody`-related types.

## `@liveblocks/react-comments`

- Improve default styles:
  - Cap CSS selector specificity to improve overridability.
  - Set tokens on `.lb-root` instead of `:root` to improve cascading tokens
    (overriding `--lb-accent` on `body` for example, didn't create the expected
    results), and to work within shadow DOMs.
- Fix reactions and links styles on Safari.

# v1.4.7

## `@liveblocks/react`

- Fix `userIds` type in `ResolveUsersArgs`.

# v1.4.6

## `@liveblocks/react`

- Fix a race condition that could cause a Liveblocks client to hang during
  loading when using Suspense.
- Fix `useStatus` return value on SSR responses.
- **Breaking (beta):** The `resolveUser` option in `createRoomContext` is now
  called `resolveUsers` and it receives a list of user IDs (via the `userIds`
  property, replacing `userId`) instead of a single one. Instead of returning
  user info of a single user ID, this function will now expect a list of users'
  info matching the provided list of user IDs.
- **Breaking (beta):** The `ResolveUserOptions` and
  `ResolveMentionSuggestionsOptions` types were renamed to `ResolveUsersArgs`
  and `ResolveMentionSuggestionsArgs` respectively.
- `resolveUsers` and `resolveMentionSuggestions` now accept synchronous
  functions.
- `resolveUsers` now also provides the current room ID.
- `editThreadMetadata` now correctly allows `null` to be set on a property.
  Doing so deletes existing metadata properties.

## `@liveblocks/react-comments`

- Export `ComposerSubmitComment` type from root too, in addition to
  `/primitives`.
- Add `onThreadDelete` to `Thread`.
- Add `metadata` to `Composer` to attach custom metadata to new threads.
- Add support for specifying a custom `ThreadMetadata` type on `Thread` and
  `Composer`.
- **Breaking (beta):** `Comment`’s `onEdit` and `onDelete` were renamed to
  `onEditComment` and `onDeleteComment` respectively.

# v1.4.5

## `@liveblocks/react`

- Fix `createThread` not creating valid comment.

## `@liveblocks/node`

- Fix URL encoding bug

# v1.4.4

## `@liveblocks/react`

- Fix `removeReaction` not removing reactions which led to reactions displaying
  a count of 0.

## `@liveblocks/react-comments`

- Fix reactions list (and its add button) showing on all comments.
- Improve emoji rendering on Windows.
- Hide country flag emojis when unsupported. (e.g. on Windows)

# v1.4.3

## `@liveblocks/react`

- Add new Comments hooks to add/remove reactions.
- Fix a bug in `useOthers()` that could lead to the warning "The result of
  getServerSnapshot should be cached to avoid an infinite loop"

## `@liveblocks/react-comments`

- Add support for reactions. (👍)
- Add keyboard navigation to emoji picker.

# v1.4.2

## `@liveblocks/client`

- Fix a bug where calculating the insertion position between two existing
  elements could happen incorrectly in a small edge case

# v1.4.1

## `@liveblocks/*`

- [#1177](https://github.com/liveblocks/liveblocks/pull/1177) Fix an issue with
  internal LiveList serialization that could lead to a "ghosting" bug with
  `@liveblocks/zustand` / `@liveblocks/redux` when using tuples.

## `@liveblocks/node`

- Add comment reaction webhook events `CommentReactionAdded` and
  `CommentReactionRemoved`

# v1.4.0

## DevTools

- New Yjs tab: visualize Yjs documents as a diagram, a tree, or as a list of
  operations, and inspect Awareness at the same time as Presence.
- New Events tab: inspect all custom Events a client receives in an event
  timeline, for easy testing/debugging.

## `@liveblocks/yjs`

- Add support for the Liveblocks [DevTools](https://liveblocks.io/devtools).

## `@liveblocks/client`

- Broadcast event messages now include a `user` property to indicate the user
  that sent the event:
  ```tsx
  room.subscribe("event", ({ event, user }) => {
    //                              ^^^^ New!
  });
  ```

## `@liveblocks/react`

- Broadcast event messages now include a `user` property to indicate the user
  that sent the event:
  ```tsx
  useEventListener(({ event, user }) => {
    //                       ^^^^ New!
  });
  ```
- **Breaking (beta):** Comments' hook `useThreads` now returns an object in its
  Suspense version. (`const threads = useThreads()` becomes
  `const { threads } = useThreads()`)

## `@liveblocks/react-comments`

- **Breaking (beta):** `Comment`’s `indentBody` and `Thread`’s
  `indentCommentBody` were renamed to `indentContent` and `indentCommentContent`
  respectively. `Thread`’s `onResolveChange` was renamed to `onResolvedChange`.
- Add emoji button in `Composer`.

## `@liveblocks/node`

- Support using `@liveblocks/node` in
  [Edge runtimes](https://vercel.com/docs/functions/edge-functions/edge-runtime).

# v1.3.6

## `@liveblocks/client`

- Support `unstable_fallbackToHTTP` client option when using any auth token type
  (previously it only worked when using single-room tokens, which we no longer
  recommend since 1.2)

# v1.3.5

## `@liveblocks/react`

- Officially mark `useList()`, `useMap()`, and `useObject()` as deprecated in
  JSDoc comments (we stopped recommending them since the release of 0.18)
- Deduplicate Comments requests and improve how race conditions are handled
  during mutations.
- Fix non-Suspense Comments hooks not working properly in some situations.

## `@liveblocks/react-comments`

- **Breaking (beta):** Replace the render prop API (e.g. `renderMention`,
  `renderLink`, etc) by a single `components` prop. (e.g.
  `components={{ Mention, Link }}`)
- Fix overflowing `Composer.Suggestions`.
- Reduce the impact of icons on bundle size.

# v1.3.4

## `@liveblocks/react`

- Fix confusing `Error: "undefined" is not a valid event name` error when using
  the (deprecated) `useMap()`, `useObject()`, or `useList()` hooks on
  uninitialized storage values.

# v1.3.3

## `@liveblocks/*`

- Fix unescaped room IDs when using Comments.

## `@liveblocks/react-comments`

- Add support for auto links. (e.g. `"www.liveblocks.io"`)

# v1.3.2

## `@liveblocks/client`

- The client will disconnect with an error if your `/api/liveblocks-auth`
  backend returns reused/cached tokens. It’s important that auth tokens are
  always freshly generated, and never get cached or reused. (The client itself
  will cache and reuse tokens already, so implementing additional caching in
  your backend isn’t needed, and could even cause reconnection issues.)

# v1.3.1

## `@liveblocks/client`

- Actually include the new Clear History API.

## `@liveblocks/react`

- Fix missing dependency declaration.

# v1.3.0

This release marks the initial release of
[Liveblocks Comments](https://liveblocks.io/comments) (private beta).

## `@liveblocks/client`

- New history API: `room.history.clear()` allows you to explicitly clear the
  history, which resets the ability to undo beyond the current state.
- Removed long deprecated methods:
  - `others.count` → Use `others.length` instead
  - `others.toArray()` → Use `others` instead (it’s already an array)
- Deprecated the `Others<P, U>` type → Use `readonly User<P, U>[]` instead.

## `@liveblocks/react`

- Add support for Comments.
- `UserMeta["info"]` can no longer be a scalar value.

## `@liveblocks/react-comments`

- Initial release.

## `@liveblocks/node`

- Add Comments helpers to Client.
- Add Comments webhook events.

# v1.2.4

## `@liveblocks/node`

- Fixes a bug where sending an empty (or non-string) user ID with
  `.identifyUser` would confusingly get reported as an HTTP 503.

# v1.2.3

## `@liveblocks/client`

- Improve configuration error messages to be more user friendly.
- Fix bug where entering a new room could potentially initialize the undo stack
  incorrectly.

## `create-liveblocks-app`

- Fix Suspense option when specifying a framework.
- Add helpful comments by default.

# v1.2.2

## `@liveblocks/node`

- Add Yjs document change event (`YDocUpdatedEvent`) to `WebhookHandler`.
- Allow `Header` object to be passed to `headers` in
  `WebhookHandler.verifyRequest()`

# v1.2.1

## `@liveblocks/node`

- Fix session.allow to support path up to 128 characters to meet room id length
  requirement.

# v1.2.0

## `@liveblocks/*`

- Support the new and improved Liveblocks authorization.
- Change client logic to stop retrying if room is full. Instead, the client will
  now disconnect. To retry, call `room.reconnect()` explicitly.

## `@liveblocks/node`

- Add new APIs for authorization. See our migration guide for tips on how to
  adopt the new style of authorizing your Liveblocks clients.

# v1.1.8

- Fix a small TypeScript issue introduced in 1.1.7.

# v1.1.7

## `@liveblocks/client`

- When initializing the client with a
  [custom auth callback](https://liveblocks.io/docs/api-reference/liveblocks-client#createClientCallback),
  you can now return `{ error: "forbidden", reason: ... }` as the response,
  which the client will treat as a sign to stop retrying. The client will then
  disconnect from the room, instead of remaining in `"connecting"` status
  indefinitely.

## `@liveblocks/react`

- Fix a bug with `useSelf()` where it would not correctly re-render after
  entering an empty room. It’s now consistent again with `useMyPresence()`.

## DevTools

- Fix a bug in the Liveblocks [DevTools](https://liveblocks.io/devtools) panel
  where the "me" view would incorrectly stay empty after entering an empty room.

# v1.1.6

## `@liveblocks/*`

- Loosen duplicate import detection so it won't throw when used in test runners
  that deliberately run multiple instances of a module (like Jest or Playwright
  can do).

# v1.1.5

## `@liveblocks/*`

- Ship all of our packages as both ESM and CJS modules again (restore the
  changes that 1.1.3 originally introduced).
- Auto-detect if multiple copies of Liveblocks are included in your production
  bundle. If so, a help page is presented that will help you resolve this issue.
- Fix a bug where the room internals could become non-functional when used in
  combination with Immer due to Immer’s excessive auto-freezing, which would
  break the room’s internals. (This became an issue since Liveblocks 1.1 was
  released.)

# v1.1.4

- Undo the changes made in 1.1.3. We’ve got some bug reports where Liveblocks
  could still be doubly-included in production bundles (in some bundler setups
  only), with storage data corruptions as a possible result. We’re
  investigating.

# v1.1.3

Ship all of our packages as both ESM and CJS modules. By upgrading, your
project’s bundler can now perform (better) tree-shaking on the Liveblocks code.

You can expect (at least) the following bundle size reductions:

- `@liveblocks/client` from 80kB → 70kB
- `@liveblocks/react` from 129kB → 80kB
- `@liveblocks/redux` from 84kB → 38kB
- `@liveblocks/zustand` from 83kB → 37kB
- `@liveblocks/yjs` from 129kB → 74kB

# v1.1.2

## `@liveblocks/yjs`

Added Yjs support to **open beta** through the new `@liveblocks/yjs` package
(not stable yet).

### Fixes

- Fixes a missing internal export.

# v1.1.1

- Fixes a bug where under certain circumstances the Liveblocks client could
  incorrectly throw a `Not started yet` error message.

# v1.1.0

This release improves the client’s internals to ensure a more reliable
connection with Liveblocks servers.

## `@liveblocks/client`

- New APIs:
  - `room.getStatus()`: returns the current status of the WebSocket connection:
    `"initial"`, `"connecting"`, `"connected"`, `"reconnecting"`, or
    `"disconnected"`
  - `room.subscribe("status")`: subscribe to changes of the connection status.
  - `room.subscribe("lost-connection")`: high-level API to get informed when
    Liveblocks’ automatic reconnection process is taking longer than usual, so
    you can show a toast message on screen. (See this
    [example](https://liveblocks.io/examples/connection-status) for an
    illustration.)
- New behavior:
  - The client will stop retrying to establish a connection in cases where
    retrying would not help. For example an explicit 403 forbidden response from
    your backend, or a configuration error.
  - The client will more quickly reconnect even after long periods of sleep.

## `@liveblocks/react`

- New APIs:
  - `useStatus()` - React hook version of `room.getStatus()`
  - `useLostConnectionListener()` - React hook version of
    `room.subscribe("lost-connection")` (See this
    [example](https://liveblocks.io/examples/connection-status) for an
    illustration.)

### Bugs fixed

- Reconnection would sometimes not work after long periods of sleep. Waking up
  is now instant.
- React clients using Suspense could sometimes incorrectly bounce back to the
  Suspense boundary after a successful load. No longer!
- Client could sometimes not load storage after reconnecting. Not anymore!
- Others array will no longer flash during an internal reconnect.
- DevTools now keeps working even when the client goes offline.

### Deprecated APIs

These APIs still work, but are replaced by newer APIs. The old APIs will be
removed in a future release of Liveblocks.

Old connection status codes are replaced by the new ones:

| ❌ Old statuses | ✅ New statuses |
| --------------- | --------------- |
| closed          | initial         |
| authenticating  | connecting      |
| connecting      | connecting      |
| open            | connected       |
| unavailable     | reconnecting    |
| failed          | disconnected    |

Recommended steps to upgrade:

- ❌ `room.getConnectionState()` → ✅ `room.getStatus()`
- ❌ `room.subscribe('connection')` → ✅ `room.subscribe('status')`
- Old client options:
  - ❌ `clientOptions.fetchPolyfill`
  - ❌ `clientOptions.WebSocketPolyfill` → ✅
    `clientOptions.polyfills: { fetch, WebSocket }`

# v1.0.12

## `create-liveblocks-app`

- Added `export type TypedRoom = Room<...>` to init command for non-React apps.

# v1.0.11

## `@liveblocks/client`

- Fix a bug where undo/redo on `LiveObject` creates exponentially larger deltas.

# v1.0.10

## `@liveblocks/client`

- Fix a bug related to proactive token expiration detection.
- Internal refactorings.
- Add unstable_fallbackToHTTP option to the core client to support messages over
  1MB.

## `@liveblocks/node`

- Fix incorrect status code when Liveblocks server cannot be reached
  temporarily.

# v1.0.9

## `@liveblocks/client`

- Export `LiveListUpdate`, `LiveMapUpdate`, and `LiveObjectUpdate` types used by
  the storage update callback.
- Export new utility, `toPlainLson`, to assist in calling the initialize storage
  API.
- Internal refactorings.

# v1.0.8

## `@liveblocks/client`

- Internal refactorings.

## `create-liveblocks-app`

- Added
  [flags](https://github.com/liveblocks/liveblocks/tree/main/tools/create-liveblocks-app#flags-optional)
  for creating config files with `--init`. (e.g. `--framework react`)
- Added an error if an incorrect flag is used.
- Slightly changed the format of the default config file.

## `@liveblocks/client`

- Internal refactorings.

# v1.0.7

- Private API changes only.

# v1.0.6

## Internal changes

- Release `create-liveblocks-app` along with other Liveblocks packages, using
  the same versioning scheme.
- Internal refactorings.

# v1.0.5

Non-existent.

# v1.0.4

Non-existent.

# v1.0.3

Non-existent.

# v1.0.2

- Fix bug where passing down `shouldInitiallyConnect` connection option would
  not always work.

# v1.0.1

- Log stack traces of function calls that resulted in rejected storage mutations
  to the console in non-production builds to ease debugging.

## `@liveblocks/client`

- Fixes bug where the state of `others` in a room was wrong when:
  - Client A disconnects improperly (ex: computer goes to sleep)
  - Then Client B disconnects (ex: computer goes to sleep)
  - Then Client A reconnects: client B still shows in the `others` state

# v1.0.0

This major release marks the maturity of Liveblocks. For upgrade instructions,
see the [1.0 upgrade guide](https://liveblocks.io/docs/platform/upgrading/1.0).

## `@liveblocks/node`

`authorize` option `userId` is now mandatory.

Our new [pricing](https://liveblocks.io/pricing) is based on Monthly Active
Users instead of connections. We're using `userId` to track MAU associated to a
Liveblocks account.

# v0.19.11

## `@liveblocks/node`

- `WebhookHandler` now handles `RoomCreatedEvent` and `RoomDeletedEvent`

# v0.19.10

## `@liveblocks/client`

- Allow
  [`createClient`](https://liveblocks.io/docs/api-reference/liveblocks-client#createClientThrottle)
  `throttle` option to go as low as 16ms.

# v0.19.9

## `@liveblocks/client`

- Adds a `WebhookHandler` class
  - `new WebhookHandler(secret).verifyRequest({ rawBody, headers })` can be used
    to verify event requests from Liveblock's webhook functionality. It also
    provides fully typed `WebhookEvents`.
  - Check out our [Webhooks guide](https://liveblocks.io/docs/guides/webhooks)
    for more details

# v0.19.8

- Fixes a bug where history didn't reliably undo `LiveObject` key set changes if
  any pending local changes existed on that key.
- Fixes a bug where changes performed inside `room.batch` were incorrectly
  ordered inside the history resulting in unexpected undo behavior in some
  cases.
- Fixes a bug where under some circumstances the Liveblocks client could get
  stuck in a "synchronizing" state indefinitely
- Expose `JsonArray` and `JsonScalar` types publicly

# v0.19.7

Fix nested storage event handling issue.

# v0.19.6

Support authentication with cookies.

# v0.19.5

Export the `StorageStatus` type (introduced with 0.19.3).

# v0.19.4

Fix CORS issue.

# v0.19.3

In **@liveblocks/client**:

## Room.getStorageStatus

Get the storage status.

- `not-loaded`: Initial state when entering the room.
- `loading`: Once the storage has been requested via room.getStorage().
- `synchronizing`: When some local updates have not been acknowledged by
  Liveblocks servers.
- `synchronized`: Storage is in sync with Liveblocks servers.

## Room.subscribe("storage-status", status => { })

Subscribe to storage status changes.

Returns an unsubscribe function.

```typescript
room.subscribe("storage-status", (status) => {
  switch (status) {
    case "not-loaded":
      break;
    case "loading":
      break;
    case "synchronizing":
      break;
    case "synchronized":
      break;
    default:
      break;
  }
});
```

## Room.reconnect

Close the room connection and try to reconnect.

## Internal changes

- Add support for the upcoming Liveblocks browser extension

# v0.19.2

Fixes some internal type definitions.

# v0.19.1

Fixes an issue where `import`s from Liveblocks packages could not be resolved
correctly in certain build environments.

# v0.19.0

This release brings Zustand v4 support. This is a breaking change **only if
you’re using @liveblocks/zustand**.

In **@liveblocks/zustand**:

- Support Zustand v4 (actually v4.1.3 or higher)
- Drop support for Zustand v3 (also v4.1.2 or lower are not supported)
- Fix bug where some usage pattern could cause the Zustand store to stop
  synching (#491)

To migrate, make the following code changes:

- `npm install zustand@latest`
- `npm install @liveblocks/zustand@latest`
- Change these imports, if applicable:
  ```diff
  -import { middleware } from "@liveblocks/zustand";
  +import { liveblocks } from "@liveblocks/zustand";
  ```
  and
  ```diff
  -import type { LiveblocksState } from "@liveblocks/zustand";
  +import type { WithLiveblocks } from "@liveblocks/zustand";
  ```
  and rename accordingly.
- Change the pattern:
  ```ts
  create(liveblocks<MyState, ...>(...))
  ```
  to the Zustand v4 recommended pattern:
  ```ts
  create<WithLiveblocks<MyState, ...>>()(liveblocks(...))
  ```
  To be clear:
  1.  First, move the type annotation away from the `liveblocks` middleware
      call, and onto the `create` call.
  2.  Next, wrap your `MyState` type in a `WithLiveblocks<...>` wrapper. This
      will make sure the injected `liveblocks` property on your Zustand state
      will be correctly typed.
  3.  Finally, make sure to add the extra call `()` wrapper, needed by Zustand
      v4 now:
      ```ts
      create<WithLiveblocks<MyState, ...>>()(liveblocks(...))
      //                                  ^^ Not a typo
      ```
- Remove the second argument to `state.liveblocks.enterRoom()`: it no longer
  takes an explicit initial state. Instead, it's automatically be populated from
  your Zustand state.

In **@liveblocks/redux**:

- The main export has been renamed:
  ```diff
  -import { enhancer } from "@liveblocks/redux";
  +import { liveblocksEnhancer } from "@liveblocks/redux";
  ```
- The second argument to `state.liveblocks.enterRoom()` to send in an explicit
  initial state is no longer supported. It will use the state in your Redux
  store, for consistency and ease of use.

# v0.18.5

Bug fix:

- Fixes a small bug in a type definition, `scopes` was removed from
  `BaseUserMeta`.

Internal updates:

- Switch the monorepo over to Turborepo.

# v0.18.4

All packages now provide an `isReadOnly` flag on user instances. It is available
when getting self or others. `isReadOnly` is true when storage is read-only, see
the
[room management guide](https://liveblocks.io/docs/guides/managing-rooms-users-permissions#permissions)
for more information.

```ts
const me = room.getSelf();

me.isReadOnly; // boolean

const others = room.getOthers();
for (const other of others) {
  other.isReadOnly; // boolean
}
```

In **@liveblocks/client**:

- Add a new option `shouldInitiallyConnect` to `client.enter` that let you
  control whether or not the room connects to Liveblocks servers. Default is
  `true`.

  Usually set to false when the client is used from the server to not call the
  authentication endpoint or connect via WebSocket.

In **@liveblocks/react**:

- Add a new property `shouldInitiallyConnect` to `RoomProvider` that let you
  control whether or not the room connects to Liveblocks servers. Default is
  `true`.

  By default equals to `typeof window !== "undefined"`, meaning the RoomProvider
  tries to connect to Liveblocks servers only on the client side.

- Internal package restructurings to increase code sharing. You may notice a new
  dependency show up in your dependency tree: `@liveblocks/core`. It contains
  private APIs that aren't intended for direct consumption.

# v0.18.3

- In **@liveblocks/react**:

  Fixes the "zombie-child" problem that can occur with React 17 or lower. **If
  you’re on React 18: great, you can ignore this!** If you’re using React 17 or
  lower with Liveblocks, we’ll now start to enforce that you pass the
  `unstable_batchedUpdates` prop to RoomProvider, so this problem can be
  circumvented. This small addition may save you hours of debugging time!

  ```tsx
  // ⚠️  Only if you’re using React 17 or lower
  import { unstable_batchedUpdates } from "react-dom";  // 👈

  <RoomProvider
    id="my-room"
    initialPresence={...}
    initialStorage={...}
    unstable_batchedUpdates={unstable_batchedUpdates}  // 👈
  >
    <App />
  </RoomProvider>
  ```

  To read more, see
  https://liveblocks.io/docs/guides/troubleshooting#stale-props-zombie-child

- In **@liveblocks/zustand**:

  - Fix a confusing error message

# v0.18.2

- In **@liveblocks/react**:

  - Make sure that `useOther` will not rerender if tracked users already left
    the room, so that child components won't get rerendered before the parent
    got the chance to unmount them.
  - Disallow `useOther` without selector

# v0.18.1

- In **@liveblocks/react**:

  - Fix a bug that could cause an error when patching presence during local
    development. Not an issue in production builds. (#505)

# v0.18.0

For information, please read our
[Upgrade Guide for 0.18](https://liveblocks.io/docs/platform/upgrading/0.18).

## New React hooks ✨

- In **@liveblocks/react**:

  - [`useStorage`](https://liveblocks.io/docs/api-reference/liveblocks-react#useStorage)
  - [`useMutation`](https://liveblocks.io/docs/api-reference/liveblocks-react#useMutation)
  - [`useSelf`](https://liveblocks.io/docs/api-reference/liveblocks-react#useSelf)
  - [`useOthers`](https://liveblocks.io/docs/api-reference/liveblocks-react#useOthers)
  - [`useOthersMapped`](https://liveblocks.io/docs/api-reference/liveblocks-react#useOthersMapped)
  - [`useOthersConnectionIds`](https://liveblocks.io/docs/api-reference/liveblocks-react#useOthersConnectionIds)
  - [`useOther`](https://liveblocks.io/docs/api-reference/liveblocks-react#useOther)
    (singular)

- In **@liveblocks/client**:

  - New
    [`.toImmutable()`](https://liveblocks.io/docs/api-reference/liveblocks-client#LiveObject.toImmutable)
    method on `LiveObject`, `LiveList`, and `LiveMap` lets you work with an
    immutable representation of the storage objects
  - Improved core performance
  - Reduced bundle size
  - Others only become visible in the `others` array if their presence is known

## Breaking changes

- Remove support for directly importing hooks from **@liveblocks/client** (e.g.
  `import { useMyPresence } from '@liveblocks/react'`). If you’re still using
  these imports, see the
  [Upgrade Guide for 0.17](https://liveblocks.io/docs/platform/upgrading/0.17) for
  instructions.
- Remove `ClientProvider` and `useClient` hook
- Remove `defaultPresence` and `defaultStorageRoot` arguments. (Just use
  `initialPresence` and `initialStorage` arguments now.)
- Remove second argument to `useMap()`, `useList()`, and `useObject()`.
- Remove `new LiveMap(null)` support. (Just use `new LiveMap()` or
  `new LiveMap([])`.)

# v0.17.11

General:

- Fix a packaging bug

In **@liveblocks/react**:

- Deprecate an undocumented API

# v0.17.9

- Fix bug that could cause duplicate copies of @liveblocks/client to end up in
  final bundle, for certain bundler configurations.
- Fix bug where in some conditions the initial presence for a new connection
  would not come through to all existing clients in the room
- Various internal changes

# v0.17.8

## New history APIs ↩️ ↪️

- In **@liveblocks/client**:

  - Add `canUndo()` and `canRedo()` utilities to `room.history`
  - Add `"history"` event type to `room.subscribe()` to subscribe to the current
    user's history changes

- In **@liveblocks/react**:

  - Add `useCanUndo()` and `useCanRedo()` hooks

# v0.17.7

- In **@liveblocks/zustand**:

  - Simplify zustand middleware integration with Typescript. `TPresence`,
    `TStorage`, `TUserMeta`, and `TRoomEvent` are now optional.

Note that `@liveblocks/zustand` does not work with zustand > v4 because v3 and
v4 have completely different type definitions. As soon as zustand v4 is out of
the RC phase, we will consider updating our middleware to work with the latest
version.

### Example

Let's take a look at our
[To-do list](https://github.com/liveblocks/liveblocks/tree/main/examples/zustand-todo-list)
example. Without our middleware, the store would look like this:

```ts
import create from "zustand";

type State = {
  draft: string;
  isTyping: boolean;
  todos: Todo[];
  setDraft: (draft: string) => void;
  addTodo: () => void;
  deleteTodo: (index: number) => void;
};

create<State>(/* ... */);
```

With our middleware, you simply need to move the `State` param at the middleware
level:

```ts
import create from "zustand";
import { createClient } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

const client = createClient({ /*...*/ });

type State = {
  draft: string;
  isTyping: boolean;
  todos: Todo[];
  setDraft: (draft: string) => void;
  addTodo: () => void;
  deleteTodo: (index: number) => void;
};

create(
  middleware<State>(/* ... */, {
    client,
    presenceMapping: { isTyping: true },
    storageMapping: { todos: true }
  })
);
```

If you want to type `others` presence, you can use the `TPresence` generic
argument on the middleware.

```ts

type Presence = {
  isTyping: true;
}

const useStore = create(
  middleware<State, Presence>(/* ... */, {
    client,
    presenceMapping: { isTyping: true },
    storageMapping: { todos: true }
  })
);

// In your component
useStore(state => state.liveblocks.others[0].presence?.isTyping)
```

# v0.17.6

- In **@liveblocks/react**:

  - Expose `RoomContext` in the return value of `createRoomContext()`

# v0.17.5

- In **@liveblocks/react**:

  - Fix bug where changing the `key` argument of `useMap()`, `useList()`,
    `useObject()` did not resubscribe to updates correctly
  - Ignore changes to the `RoomProvider`'s initial presence/storage props on
    subsequent renders. This makes it behave closer to `useState(initialState)`

# v0.17.4

Fix missing documentation for hooks created via `createRoomContext()`.

# v0.17.1

Fix `@liveblocks/nodes` packaging.

# v0.17.0

For information, please read our
[Upgrade Guide](https://liveblocks.io/docs/platform/upgrading/0.17).

## TypeScript improvements ✨

This release contains major TypeScript improvements. The recommended setup now
is that you define your own Presence and Storage types at the highest level
(i.e. where you set up the room). After that initial one-time setup, you will no
longer need to provide any extra type annotations anywhere for your Liveblocks
code! 🙌

To learn how to set that up, follow the instructions in our
[Upgrade Guide](https://liveblocks.io/docs/platform/upgrading/0.17).

- No more `any` types used (in `@liveblocks/client` and `@liveblocks/react`)
- All APIs that work with Presence data will now require it to be
  JSON-serializable
- All APIs that work with Storage data will now require it to be LSON (= JSON +
  Live structures)
- All Live structures now take mandatory type params for their payloads, just
  like the built-in array, object, and map types do:
  - `LiveMap<K, V>` (like `Map<K, V>`)
  - `LiveObject<{ a: number, b: string }>` (like, for example,
    `{ a: number, b: string }`)
  - `LiveList<T>` (like `Array<T>`)

## React Native support ✨

We now support React Native! To learn how to use Liveblocks in your React Native
projects, see our
[API reference](https://liveblocks.io/docs/api-reference/liveblocks-client#createClientReactNative).
It's surprisingly simple!

## New APIs ✨

- In **@liveblocks/react**:

  - [`createRoomContext()`](https://liveblocks.io/docs/api-reference/liveblocks-react#createRoomContext)
    is now the preferred way to initialize hooks.

- In the API:

  - New endpoint to
    [Get Users in a Room](https://liveblocks.io/docs/api-reference/rest-api-endpoints#GetRoomUsers)
  - New endpoint to
    [Get a list of all Rooms](https://liveblocks.io/docs/api-reference/rest-api-endpoints#GetRooms)

## Bug fixes 🐛

- Improved conflict resolution on LiveList
- Various minor internal bug fixes

## Breaking changes

- In **@liveblocks/client**:

  - Removed old `Room.unsubscribe()` API

## New deprecations

- In **@liveblocks/client**:

  - The `defaultPresence` option to `client.enter()` will get renamed to
    `initialPresence`
  - The `defaultStorageRoot` option to `client.enter()` will get renamed to
    `initialStorage`
  - Calling `new LiveMap(null)` will stop working. Please use `new LiveMap()`,
    or `new LiveMap([])`

- In **@liveblocks/react**:

  - Importing the React hooks directly is deprecated, instead use the new
    `createRoomContext()` helper. For help, read the
    [Recommended Upgrade Steps section](https://liveblocks.io/docs/platform/upgrading/0.17#recommended-upgrade-steps)
    within our [Upgrade Guide](https://liveblocks.io/docs/platform/upgrading/0.17)
  - The second argument to `useList()`, `useObject()`, and `useMap()` is
    deprecated
  - The RoomProvider's `defaultPresence` is renamed to `initialPresence`
  - The RoomProvider's `defaultStorageRoot` is renamed to `initialStorage`

# v0.16.17

Fix bug in internal code where some legal authentication tokens would be
considered invalid.

# v0.16.16

Internals only.

# v0.16.15

Internals only.

# v0.16.14

Fix an issue where the current user's info would not properly display accented
characters.

# v0.16.13

(Unpublished.)

# v0.16.12

Internals only.

# v0.16.11

Expose helper type to help users adopt to using Live structures with interfaces
they don't own.

# v0.16.10

Restructures a few more internals.

# v0.16.9

Restructures a few internals.

# v0.16.8

Fix bug in private/internal code.

# v0.16.7

Fix bug in private/internal code.

# v0.16.6

Fix bug in example code suggested in deprecation warning.

# v0.16.5

## All packages

- Various internal refactorings

## Bug fixes

- In **@liveblocks/client**:

  - If you're using `@liveblocks/client` in a ES2015 context, you no longer have
    to polyfill `Object.fromEntries()`.

# v0.16.4

## All packages

- Improve our generated bundles. They are now even more tree-shakable, and
  smaller!
- Some APIs are being deprecation and will show warnings in the dev console when
  used

# v0.16.3

## Bug fixes

- In **@liveblocks/client**:

  - Fix bug where internal presence state could not get restored correctly after
    undo/redo in certain circumstances.

- In **@liveblocks/zustand** and **@liveblocks/redux**:

  - Fixes an issue when initializing an array with items would result in having
    duplicated items in other clients. Example:

    - Client A updates state : `{ list: [0] }`
    - Client B states is updated to : `{ list: [0, 0] }`

# v0.16.2

## Bug fixes

- In **@liveblocks/client**:

  - Fix small bug related to new `JsonObject` type, which would reject some
    values that were legal JSON objects.

# v0.16.1

## Bug fixes

- In **@liveblocks/react**:

  - Fix issue with React 18 and StrictMode.

# v0.16.0

## New APIs

### `LiveList.set`

Set one element at a specified index.

```typescript
const list = new LiveList(["🦁", "🦊", "🐵"]);
list.set(0, "🐺");
list.toArray(); // equals ["🐺", "🦊", "🐵"]
```

https://github.com/liveblocks/liveblocks/pull/147 for more information

⚠️ **_Before using `LiveList.set`, you need to make sure that all connected
clients are using `0.16.0`. If a client is connected to a room with version
`< 0.16`, `LiveList.set` might lead to slightly unexpected behavior._**

## TypeScript improvements

@nvie improved our typescript definitions! They are more precise and restrictive
(for your own good :)). If typescript errors appears after upgrading to `0.16.0`
and they are not clear, please create a Github issue and we'll help you.

More information here: https://github.com/liveblocks/liveblocks/pull/150
