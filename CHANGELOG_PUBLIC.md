<!--

PUBLIC CHANGELOG
https://liveblocks.io/changelog

- Paste changes into the current week.
- Put package versions first, with the newest at the top.
- Add each contributor's GitHub username.

TEAM MEMBERS
adigau, ctnicholas, flowflorent, jrowny, marcbouchenoire, nimeshnayaju,
nvie, ofoucherot, pierrelevaillant, stevenfabre, sugardarius

OTHER USERS
If outside users have made contributions, add them to the Contributors
list and feel free to give them credit at the end of a line, e.g.:
- ... Thank you [@username](https://github.com/username)!

-->

# Week 50 (2025-12-12)

## v3.11.1

### `@liveblocks/core`

- Log full error details when WebSocket connections to Liveblocks are getting
  blocked

### `@liveblocks/yjs`

- Fix an issue where a document incorrectly reported its sync state.

## Contributors

jrowny

# Week 49 (2025-12-05)

## Examples

- New example: [Comments search](https://liveblocks.io/examples/comments-search).
- Add custom “Copy link” comment dropdown item to the [Linear-like Issue Tracker](https://liveblocks.io/examples/linear-like-issue-tracker) example.

## Showcase

- New item: [Search through comments](https://liveblocks.io/showcase/search-through-comments).

## Contributors

ctnicholas

# Week 48 (2025-11-28)

## v3.11.0

### `@liveblocks/react`

- Introduce `useSearchComments` hook that allows searching comments by text and
  other filters.

### `@liveblocks/client`

- Fix regression: handle rejection messages from the server again.

### `@liveblocks/node`

- Update type definitions for provider models to support GPT-5.1 variants.

## Examples

- Updated Next.js Starter Kit to use Tiptap v3 and BlockNote 0.42.

## Documentation

- New guide: [Can I use my own database with Yjs?](https://liveblocks.io/docs/guides/can-i-use-my-own-database-with-yjs)
- New guide: [Why you can’t delete Yjs documents](https://liveblocks.io/docs/guides/why-you-cant-delete-yjs-documents).
- Add info on mass deleting rooms.
- Rename "Liveblocks" notification kinds as "Collaboration" kinds.

## Contributors

ctnicholas, nvie, nimeshnayaju, ofoucherot, marcbouchenoire

# Week 47 (2025-11-21)

### Documentation

- Changed name of Liveblocks-sent notifications (`thread`, `textMention`) from
  Liveblocks notifications to Collaboration notifications.

### Website

- New blog post:
  [Building an AI copilot inside your Tiptap text editor](https://liveblocks.io/blog/building-an-ai-copilot-inside-your-tiptap-text-editor).

## Contributors

ctnicholas, mmavko

# Week 46 (2025-11-14)

## v3.10.1

### `@liveblocks/lexical`

- Fix a bug where a fresh provider is required by Lexical in order to initialize
  properly by always requieting a new provider in the factory function

## Documentation

- New section on
  [group mentions](https://liveblocks.io/docs/ready-made-features/comments/users-and-mentions#Group-mentions).
- Updated other information on the
  [users and mentions](https://liveblocks.io/docs/ready-made-features/comments/users-and-mentions)
  page.
- Updated [Tenants](https://liveblocks.io/docs/authentication/tenants) page with
  new information.
- Add information on
  [AI web search](https://liveblocks.io/docs/ready-made-features/ai-copilots/knowledge#Web-search)
  in overview pages.

## Dashboard

- Standardized all date displays with a new unified component, including richer
  hover details, copyable timestamps, and improved list-view scannability.

## Website

- New blog post:
  [What's new in Liveblocks: October 2025](https://liveblocks.io/blog/whats-new-in-liveblocks-october-edition-2025).
- New streaming video player in blog posts.
  - Smoother, as quality is automatically adjusted to stream without pauses on
    poor connections.
  - More performant, as offscreen videos automatically pause.
  - More accessible, as videos are paused by default for those with
    `prefers-reduced-motion: reduce` enabled.

## Contributors

ctnicholas, pierrelevaillant, jrowny, nimeshnayaju

# Week 45 (2025-11-07)

## v3.10.0

### `@liveblocks/client`

- Tweak reconnection logic to not retry on specific 400 level error codes.

### `@liveblocks/node`

- Prevents certain 400 level errors from being reported as a 403.

### `@liveblocks/react-ui`

- Add `dropdownItems` prop to `Comment` (`commentDropdownItems` prop on
  `Thread`) to allow customizing comments’ dropdown items in the default
  components.
- Fix scroll issues in some scenarios where `AiChat` would be rendered but
  hidden.

### `@liveblocks/react-tiptap`

- Support for Tiptap v3.

## Documentation

- New guide:
  [Upgrading to 3.10](https://liveblocks.io/docs/platform/upgrading/3.10).
- New guide:
  [Migrating from Tiptap 2 to 3](https://liveblocks.io/docs/guides/migrating-from-tiptap-2-to-3).
- New guide:
  [Tiptap best practices and tips](https://liveblocks.io/docs/guides/tiptap-best-practices-and-tips).
- New guide:
  [Yjs best practices and tips](https://liveblocks.io/docs/guides/yjs-best-practices-and-tips).

## Contributors

jrowny, marcbouchenoire, nvie, ctnicholas

# Week 44 (2025-10-31)

## v3.9.1

### `@liveblocks/node`

- Update type definitions for provider models to support GPT-5 variants.

## Documentation

- New AI Copilots get started guides for
  [Next.js](https://liveblocks.io/docs/get-started/nextjs-ai-copilots) and
  [React](https://liveblocks.io/docs/get-started/react-ai-copilots).
- New AI Copilots overview pages:
  - [Copilots](https://liveblocks.io/docs/ready-made-features/ai-copilots/copilots).
  - [Default components](https://liveblocks.io/docs/ready-made-features/ai-copilots/default-components).
  - [Hooks](https://liveblocks.io/docs/ready-made-features/ai-copilots/hooks).
  - [Knowledge](https://liveblocks.io/docs/ready-made-features/ai-copilots/knowledge).
  - [Tools](https://liveblocks.io/docs/ready-made-features/ai-copilots/tools).
  - [Styling and customization](https://liveblocks.io/docs/ready-made-features/ai-copilots/styling-and-customization).
  - [Troubleshooting](https://liveblocks.io/docs/ready-made-features/ai-copilots/troubleshooting).
- New guide:
  [How to use fallback AI models in AI Copilots](https://liveblocks.io/docs/guides/how-to-use-fallback-ai-models-in-ai-copilots).

## Examples

- Added batched notifications to
  [Custom Notifications example](https://liveblocks.io/examples/notifications-custom).

## Website

- New diff code block styling.
- New icons for docs overview pages.
- Fixed example integrations when no environment variable is needed.
- Fixed code snippet background color.

## Contributors

ctnicholas, nimeshnayaju

# Week 42 (2025-10-17)

## v3.9.0

### `@liveblocks/react-ui`

- Add support for web search to `<AiChat />` component.
- Add `showSources`, `showRetrievals` and `showReasoning` props to `<AiChat />`
  component to determine how sources, retrievals and reasoning are displayed
  respectively.
- Disable AI chat composers when AI service is not available.

### `@liveblocks/react`

- Add query filter `subscribed` on the `useThreads` hook.
- Add `useUrlMetadata` hook to get metadata for a given URL.
- Expose `disconnected` status in `useAiChatStatus` to indicate when AI service
  is not available.

### `@liveblocks/client`

- Add query filter `subscribed` on the `room.getThreads` method.

### `@liveblocks/node`

- Update `createAiCopilot` and `updateAiCopilot` to include web search in
  provider options for OpenAI and Anthropic.
- Remove all schema validation related client methods that should no longer be
  used. Schema validation was sunsetted on May 1st, 2025.

## Dashboard

- Greatly improved “Notifications” flow, making it much clearer how they're
  linked to webhooks.
  - New “Kinds” tab, allowing you to define batching per kind.
  - See the status of your webhooks from here.
  - Warnings when no webhooks are set up, and shortcuts to get started.
- Improved “Webhooks” page.
  - Set a rate limit for your webhooks when creating them.
  - More detailed error messages when creating webhooks.
  - Better UX on the URL input.
- Improved UX when creating projects
  - New polished project cards displaying more info such as region restrictions.
  - More clarity in project creation dialog boxes.
- Improved team/project selectors with UI polish and better accessibility.
- Improved MAU usage cards showing your team’s personalized limits.
- More clarity in project settings regarding environment and regions not being
  editable.
- Fixed problem downloading examples with `create-liveblocks-app` integration.

## Documentation

- New sections on
  [notification batching](https://liveblocks.io/docs/ready-made-features/notifications/concepts#Notification-batching).
- Better clarity on Storage/Yjs limits.

## Contributors

nimeshnayaju, sugardarius, marcbouchenoire, nvie, ofoucherot, stevenfabre,
pierrelevaillant, ctnicholas

# Week 41 (2025-10-10)

## v3.8.1

### `@liveblocks/react`

- Add `chatId` prop to `RegisterAiKnowledge` to scope knowledge to a specific
  chat, similar to `RegisterAiTool`. This is the same as using the `knowledge`
  prop on `AiChat`.
- Fix issue where `useAiChat()` didn't re-render correctly when chat title gets
  updated.

### `@liveblocks/node`

- Fix issue where `tenantId` was not being passed to the request when using
  `Liveblocks.createRoom()`.
- Add `comments:write` to the list of possible room permissions.

## Examples

New example: [AI app builder](/examples/ai-app-builder). New example:
[AI calendar](/examples/ai-calendar).

## Contributors

ctnicholas, sugardarius, pierrelevaillant, marcbouchenoire, nvie, flowflorent

# Week 40 (2025-10-03)

## v3.8.0

### `@liveblocks/client`

- `LiveMap` and `LiveObject` deletions now report which item got deleted in the
  update notifications. `LiveLists` already did this.
- Support numerical operators `gt`, `lt`, `gte`, and `lte` in `room.getThreads`
  metadata query filters.

### `@liveblocks/react`

- Add new hook
  [`useAiChatStatus`](https://liveblocks.io/docs/api-reference/liveblocks-react#useAiChatStatus)
  that offers a convenient way to get the current generation status for an AI
  chat, indicating whether the chat is idle, currently generating contents, and,
  if so, what type of content is currently generating.
- Fixes an issue where `useUnreadInboxNotificationsCount` wasn't returning the
  proper count if there were more than a page of unread notifications.
- Support numerical operators `gt`, `lt`, `gte`, and `lte` in `useThreads`
  metadata query filters.

### `@liveblocks/react-ui`

- Add `responseTimeout` property to `AiChat` to allow customization of the
  default 30 seconds timeout.
- The `title` prop on `AiTool` now accepts `ReactNode`, not just strings.
- Fix a bug where `AiChat` would not always scroll in the same way when sending
  new messages.

### `@liveblocks/node`

- Add new method `Liveblocks.prewarmRoom(roomId, options)`. This method can
  prewarm a room from your backend, preparing it for connectivity and making the
  eventual connection from the frontend faster.

## Website

- Blog post:
  [Why we built our AI agents on WebSockets instead of HTTP](https://liveblocks.io/blog/why-we-built-our-ai-agents-on-websockets-instead-of-http).

## Contributors

ofoucherot, nvie, jrowny, marcbouchenoire, ctnicholas, nimeshnayaju

# Week 38 (2025-09-19)

## Website

- Blog post:
  [What's the best vector database for building AI products?](https://liveblocks.io/blog/whats-the-best-vector-database-for-building-ai-products).
- Blog post:
  [What's new in Liveblocks: August 2025](https://liveblocks.io/blog/whats-new-in-liveblocks-august-edition-2025).

## Contributors

jrowny, ctnicholas

# Week 37 (2025-09-12)

## v3.7.1

### `@liveblocks/react`

- Add query filters `roomId` and `kind` on the
  `useUnreadInboxNotificationsCount` hook.

## v3.7.0

This release introduces group mentions (e.g. `@engineering`) across all packages
and first-class support for tenants. Learn more about
[group mentions](https://liveblocks.io/docs/ready-made-features/comments/users-and-mentions)
and [tenants](http://liveblocks.io/docs/authentication/tenants) in the docs.

### `@liveblocks/client`

- Add new `resolveGroupsInfo` resolver to provide information about groups (e.g.
  `name`, `avatar`, etc) similar to `resolveUsers`.
- Support returning group mention suggestions in `resolveMentionSuggestions`.
- Support group mentions in `stringifyCommentBody`, it now accepts a
  `resolveGroupsInfo` option that passes the results to mentions as `group`.
- Add query filters `roomId` and `kind` on the `getInboxNotifications` method.

### `@liveblocks/react`

- Add `useGroupInfo` hook to use `resolveGroupsInfo` in React, same as `useUser`
  for `resolveUsers`.
- Add query filters `roomId` and `kind` on the `useInboxNotifications` hook.

### `@liveblocks/react-ui`

- Support group mentions in default components (mentions suggestions dropdowns,
  `Thread`, `Composer`, `InboxNotification`, etc).

### `@liveblocks/react-lexical`, `@liveblocks/react-tiptap`, and `@liveblocks/node-lexical`

- Support group mentions in text editors and comments-related components.

### `@liveblocks/node-lexical` and `@liveblocks/node-prosemirror`

- Support group mentions in text editors.

### `@liveblocks/node`

- Add methods to manage groups on Liveblocks (e.g. `createGroup`,
  `getUserGroups`).
- Add `tenantId` parameters to methods that need it when using tenants.
- Mark `getThreadParticipants` as deprecated, use thread subscriptions or
  `getMentionsFromCommentBody` instead.
- Support group mentions in `stringifyCommentBody`, it now accepts a
  `resolveGroupsInfo` option that passes the results to mentions as `group`.

### `@liveblocks/emails`

- Support group mentions in email notifications helpers. These functions now
  accept a `resolveGroupsInfo` option that passes the results to mentions as
  `group`.

## 3.6.2

### `@liveblocks/node`

- Rename `budgetToken` to `budgetTokens` in `AnthropicProviderOptions`.

## v3.6.1

### `@liveblocks/client`

- Fixes a bug where a specific combination of concurrent LiveList mutations
  could break eventual consistency (two clients disagreeing on the final
  document state).

### `@liveblocks/react-ui`

- Only show retrieval and reasoning durations in `AiChat` when they are 3
  seconds or longer.
- Make `AiTool` titles selectable.

## Website

- AI assistant has been added to the documentation and dashboard pages. It can
  answer questions on anything related to Liveblocks, such as code,
  recommendations, bugs, billing, usage, and project information. It's powered
  by
  [`AiChat`](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#AiChat).

## Contributors

ctnicholas, pierrelevaillant, nvie, marcbouchenoire, nimeshnayaju, ofoucherot,
flowflorent

# Week 36 (2025-09-05)

## v3.6.0

### `@liveblocks/client`

- Auto-abort this client's tool calls on page unload to prevent hanging chats.

### `@liveblocks/react-ui`

- Reasoning in `AiChat` now displays how long it took.
- `AiChat` nows shows when a copilot is searching its knowledge defined on the
  dashboard, as a "Searching 'What is RAG?'…" indicator. It also displays how
  long it took.
- Add `Duration` primitive to display formatted durations, similar to the
  existing `Timestamp` primitive.

### `@liveblocks/node`

- Better type safety for copilot creation and update options.
- Add missing type export for AI Copilot and knowledge sources.

## v3.5.4

### `@liveblocks/client`

- Throttle incoming AI delta updates to prevent excessive re-renders during fast
  streaming.
- Optimized partial JSON parser for improved tool invocation streaming
  performance.

### `@liveblocks/react-tiptap`

- Fixes a bug where the a comment could not be selected if it was within a
  previously deleted comment.

## Dashboard

- Add API reference modal to AI Copilot detail pages, with React, Node.js, and
  REST API snippets to get started quickly.

## Contributors

pierrelevaillant, nvie, jrowny, nimeshnayaju, marcbouchenoire

# Week 35 (2025-08-29)

## v3.5.1

### `@liveblocks/react-tiptap`

- Fixes a bug where deleting a thread/comment from Tiptap would also remove any
  comments contained within it.

## v3.5.0

### `@liveblocks/node`

- Add the following methods for managing AI copilots and knowledge sources:
  - `getAiCopilots`
  - `createAiCopilot`
  - `getAiCopilot`
  - `updateAiCopilot`
  - `deleteAiCopilot`
  - `createWebKnowledgeSource`
  - `createFileKnowledgeSource`
  - `deleteFileKnowledgeSource`
  - `deleteWebKnowledgeSource`
  - `getKnowledgeSources`
  - `getKnowledgeSource`
  - `getFileKnowledgeSourceMarkdown`
  - `getWebKnowledgeSourceLinks`

## v3.4.2

### `@liveblocks/react-ui`

- Fix improved Markdown streaming in `AiChat` only being enabled in reasoning
  blocks, it’s now enabled for all Markdown.

## v3.4.1

### `@liveblocks/core`

- Fix a bug where copilot id wasn't passed when setting tool call result if a
  tool call was defined with `execute` callback.

### `@liveblocks/react`

- Update `useSendAiMessage` to use the last used copilot id in a chat when no
  copilot id is passed to the hook or the method returned by the hook.

## Website

- New blog post:
  [Mock up AI agents in your product with the Liveblocks Collaboration Kit for Figma](https://liveblocks.io/blog/mock-up-ai-agents-in-your-propuct-with-the-liveblocks-collaboration-kit-for-figma).

## Contributors

jrowny, nimeshnayaju, marcbouchenoire, pierrelevaillant, ctnicholas

# Week 34 (2025-08-22)

## v3.4.0

### `@liveblocks/react`

Tool calls will now stream in while under construction. This means that tools
will render sooner and more often re-render, while `partialArgs` are streaming
in.

> New behavior (v3.4 and higher):
>
> - 1st render: `{ stage: "receiving", partialArgs: {} }`
> - 2nd render: `{ stage: "receiving", partialArgs: { cities: [] } }`
> - 3rd render: `{ stage: "receiving", partialArgs: { cities: [""] } }`
> - 4th render: `{ stage: "receiving", partialArgs: { cities: ["Pa"] } }`
> - 5th render: `{ stage: "receiving", partialArgs: { cities: ["Paris"] } }`
> - etc.
> - Then `{ stage: "executing", args: { cities: "Paris" } }` (same as before)
> - And `{ stage: "executed", args, result }` (same as before)
>
> Before (v3.3 and lower):
>
> - Stage "receiving" would never happen
> - 1st render would be with
>   `{ stage: "executing", args: { cities: ["Paris"] } }`
> - 2nd render would be with `{ stage: "executed", args, result }`

#### Other changes

- In `RoomProvider`, `initialPresence` and `initialStorage` now get re-evaluated
  whenever the room ID (the `id` prop) changes.

### `@liveblocks/react-ui`

- Add a minimal appearance to `AiTool` via a new `variant` prop.
- Improve Markdown rendering during streaming in `AiChat`: incomplete content is
  now handled gracefully so things like bold, links, or tables all render
  instantly without seeing partial Markdown syntax first.
- Render all messages in `AiChat` as Markdown, including ones from the user.
- Fix Markdown rendering of HTML tags in `AiChat`. (e.g. "Use the `<AiChat />`
  component" would render as "Use the `` component")
- Improve shimmer animation visible on elements like the
  "Thinking…"/"Reasoning…" placeholders in `AiChat`.

## Infrastructure

- Improved LiveList conflict resolution that will keep the conflicting element
  closer to its intended destination.

## Contributors

nvie, marcbouchenoire

# Week 33 (2025-08-15)

## v3.3.4

### `@liveblocks/client`

- Fix race condition where AI tools were not always executing. This could happen
  when using `useSendAiMessage` first and then immediately opening the
  `<AiChat />` afterwards.

### `@liveblocks/react-tiptap`

- Scroll thread annotations into view when a thread in `AnchoredThreads` is
  selected, similarly to `@liveblocks/react-lexical`.

## v3.3.1

### `@liveblocks/react-ui`

- Fix `Composer` uploading attachments on drop when `showAttachments` is set to
  `false`.

## All versions

- Fix attachment names showing URL-encoded characters. (e.g. `a%20file.txt`
  instead of `a file.txt`)

## Infrastructure

- Fixed a bug that caused unreliable storage updates under high concurrency.
- Fixed an issue that could cause LLM responses to appear to "hang" if the token
  limit got exceeded during the response generation. If this now happens, the
  response will indicate a clear error to the user.

## Dashboard

- New knowledge prompt option when configuring AI copilots, allowing you to
  customize when back-end knowledge is fetched.

## Documentation

- More info on styling AI chat components.
- Disambiguate semantics for `LiveList.delete()`.

## Contributors

marcbouchenoire, ctnicholas, nvie, jrowny, nimeshnayaju

# Week 32 (2025-08-08)

## v3.3.0

### `@liveblocks/react-ui`

- Add `maxVisibleComments` prop to `Thread` to control the maximum number of
  comments to show. When comments are hidden, a "Show more replies" button is
  shown to allow users to expand the thread.
- Add `onComposerSubmit` callback to `AiChat` triggered when a new message is
  sent. It can also be used to customize message submission by calling
  `useSendAiMessage` yourself.
- Overrides and CSS classes for `AiChat`'s composer have been renamed:
  - Overrides: `AI_CHAT_COMPOSER_SEND` → `AI_COMPOSER_PLACEHOLDER`
  - CSS classes: `.lb-ai-chat-composer-form` → `.lb-ai-composer-form`
- Fix: knowledge passed as a prop to `AiChat` no longer leaks that knowledge to
  other instances of `AiChat` that are currently mounted on screen.

### `@liveblocks/react`

- Add `query` option to `useAiChats` to filter the current user’s AI chats by
  metadata. Supports exact matches for string values, "contains all" for string
  arrays, and filtering by absence using `null` (e.g.
  `{ metadata: { archived: null } }`).
- `useSendAiMessage` now accepts passing the chat ID and/or options to the
  function rather than the hook. This can be useful in dynamic scenarios where
  the chat ID might not be known when calling the hook for example.
- `useCreateAiChat` now accepts a chat ID as a string instead of
  `{ id: "chat-id" }`.

### `@liveblocks/react-tiptap` and `@liveblocks/react-lexical`

- Allow using custom composers in `FloatingComposer` via the
  `components={{ Composer }}` prop.

### `@liveblocks/react-lexical`

- Add `ATTACH_THREAD_COMMAND` command to manually create a thread attached to
  the current selection.

## Dashboard

- Support SAML Single Sign-On for enterprise customers.
- Allow editing first and last name in personal settings.

## Contributors

ofoucherot, sugardarius, pierrelevaillant, marcbouchenoire, nimeshnayaju, nvie

# Week 31 (2025-08-01)

## v3.2.1

### `@liveblocks/react-ui`

- Improve Markdown lists in `AiChat`: better spacing and support for arbitrary
  starting numbers in ordered lists. (e.g. `3.` instead of `1.`)

### `@liveblocks/react`

- Fix `useSyncStatus` returning incorrect synchronization status for Yjs
  provider. We now compare the hash of local and remote snapshot to check for
  synchronization differences between local and remote Yjs document.

### `@liveblocks/yjs`

- Fix `LiveblocksYjsProvider.getStatus()` returning incorrect synchronization
  status for Yjs provider.

## Dashboard

- Add MAU breakdown to the historical usage table on the “Billing & usage” page
  (MAU used / Non-billed MAU).
- Support OpenAI compatible AI models in AI Copilots.
- Support Gemini 2.5 Pro and Gemini 2.5 Flash Thinking models in AI Copilots and
  remove support for the corresponding preview models.

## Doocumentation

- Improved [Limits](https://liveblocks.io/docs/platform/limits) page.
- Improved [Plans](https://liveblocks.io/docs/platform/plans) page.

## Contributors

pierrelevaillant, nimeshnayaju, marcbouchenoire, sugardarius, ctnicholas,
stevenfabre

# Week 30 (2025-07-25)

## v3.2.0

### `@liveblocks/react-ui`

- Improve `AiChat`'s scroll behavior when sending new messages: the chat will
  now scroll new messages to the top and leave enough space for responses.
- Expose Markdown components in `AiChat`’s `components` prop to customize the
  rendering of Markdown content.
- Add `blurOnSubmit` prop to `Composer` (also available on the `Composer.Form`
  primitive and as `blurComposerOnSubmit` on `Thread`) to control whether a
  composer should lose focus after being submitted.

### `@liveblocks/react`

- `useErrorListener` now receives `"LARGE_MESSAGE_ERROR"` errors when the
  `largeMessageStrategy` option isn’t configured and a message couldn’t be sent
  because it was too large for WebSocket.

### `@liveblocks/node`

- Add `tenantId` to `identifyUser` method as an optional parameter.

## Dashboard

- Fix issue with custom nodes causing an error in Tiptap/BlockNote documents
  views.

## Contributors

marcbouchenoire, jrowny, flowflorent, ctnicholas

# Week 29 (2025-07-18)

## v3.1.4

### `@liveblocks/react-ui`

- Fix copilot id not being passed to 'set-tool-call-result' command that is
  dispatched when a tool call is responded to. Previously, we were using the
  default copilot to generate messages from the tool call result.

## v3.1.3

### `@liveblocks/react-ui`

- Fix `AiChat` component not scrolling instantly to the bottom on render when
  messages are already loaded.

## Dashboard

- Added the ability to use website crawls and sitemaps as knowledge sources for
  your AI copilot.

## Website

- New blog post:
  [What’s new in Liveblocks: June 2025](https://liveblocks.io/blog/whats-new-in-liveblocks-june-edition-2025).

## Contributors

nimeshnayaju, ctnicholas

# Week 28 (2025-07-11)

## v3.1.2

### `@liveblocks/react-ui` and `@liveblocks/emails`

- Improve URL sanitization in comments.

## v3.1.1

### `@liveblocks/client`

- Adds experimental setting `LiveObject.detectLargeObjects`, which can be
  enabled globally using `LiveObject.detectLargeObjects = true` (default is
  false). With this setting enabled, calls to `LiveObject.set()` or
  `LiveObject.update()` will throw as soon as you add a value that would make
  the total size of the LiveObject exceed the platform limit of 128 kB. The
  benefit is that you get an early error instead of a silent failure, but the
  downside is that this adds significant runtime overhead if your application
  makes many LiveObject mutations.
- Fix: also display errors in production builds when they happen in `render`
  methods defined with `defineAiTool()`. Previously, these errors would only be
  shown during development.
- Fix an issue with the render component of tool calls not being displayed
  correctly when the tool call signal was read before it was registered.

## Examples

- New example:
  [AI Support Chat](https://liveblocks.io/examples/ai-support/nextjs-ai-support).

## Contributors

ctnicholas, nimeshnayaju, nvie, marcbouchenoire

# Week 27 (2025-07-04)

## v3.1.0

### `@liveblocks/client`

- `defineAiTool()()` now takes an optional `enabled` property. When set to
  `false`, the tool will not be made available to the AI copilot for new/future
  chat messages, but still allow existing tool invocations to be rendered that
  are part of the historic chat record.

### `@liveblocks/react`

- `RegisterAiTool` now also takes an optional `enabled` prop. This is a
  convenience prop that can be used to override the tool’s `enabled` status
  directly in React.

### `@liveblocks/react-ui`

- Reasoning parts in `AiChat` are now automatically collapsed when the reasoning
  is done.
- Add `collapsible` prop to `AiTool` to control whether its content can be
  collapsed/expanded.
- Add `InboxNotification.Inspector` component to help debugging custom inbox
  notifications.

### `@liveblocks/redux`

- Add support for Redux v5.

### `@liveblocks/react-lexical`

- Fix default `z-index` of collaboration cursors, and make them inherit their
  font family instead of always using Arial.
- Add `lb-lexical-cursors` class to the collaboration cursors’ container.
- Improve mentions’ serialization.

### `@liveblocks/node-lexical`

- Improve mentions’ serialization.

## Contributors

nvie, marcbouchenoire, sugardarius

# Week 26 (2025-06-27)

## Dashboard

- Fix caching issue when editing notification settings.

## Website

- New blog post:
  [People and AI working together, in any app — the story behind Liveblocks 3.0](https://liveblocks.io/blog/people-and-ai-working-together-liveblocks-3-0).

## Contributors

pierrelevaillant, stevenfabre, sugardarius

# Week 25 (2025-06-20)

## v3.0.0

Liveblocks 3.0 is our third major release, focusing on our newest product,
[AI Copilots](https://liveblocks.io/blog/meet-liveblocks-3-0-the-fastest-way-to-let-your-users-collaborate-with-ai-in-your-product).
We’ve used this as an opportunity to tidy up some of our existing APIs, ensuring
consistency throughout our offering.

For full upgrade instructions and codemods, see the
[3.0 upgrade guide](https://liveblocks.io/docs/platform/upgrading/3.0).

### All packages

- TypeScript 5.0 is now the minimum supported version.
- Remove deprecated APIs, see
  [the deprecated section](https://liveblocks.io/docs/platform/upgrading/3.0#deprecated)
  in the upgrade guide to learn more.

### `@liveblocks/react`

- Introduce hooks and APIs for AI Copilots: `useAiChats`, `useAiChat`,
  `useDeleteAiChat`,`useSendAiMessage`, `RegisterAiTool`, `RegisterAiKnowledge`,
  etc.
- Rename `UPDATE_USER_NOTIFICATION_SETTINGS_ERROR` to
  `UPDATE_NOTIFICATION_SETTINGS_ERROR` when using `useNotificationSettings` or
  `useUpdateNotificationSettings`.

### `@liveblocks/react-ui`

- Introduce pre-built components for AI Copilots: `AiChat`, `AiTool`, etc.
- The `onMentionClick` prop on `Thread` and `Comment` now receives a
  `MentionData` object instead of a `userId` string.
- The `Mention` component on the `Comment.Body` and `Composer.Editor` primitives
  now receives a `mention` prop instead of a `userId` one.
- The `MentionSuggestions` component on the `Composer.Editor` primitive now
  receives a `mentions` prop instead of a `userIds` one, and the
  `selectedUserId` prop has been renamed to `selectedMentionId`.
- Rename `LiveblocksUIConfig` to `LiveblocksUiConfig` for consistency with other
  Liveblocks APIs.

### `@liveblocks/emails`

- Remove deprecated `htmlBody`/`reactBody` properties from
  `prepareThreadNotificationEmailAsHtml`/`prepareThreadNotificationEmailAsReact`,
  use `body` instead.
- Remove `htmlContent`/`reactContent` properties from
  `prepareTextMentionNotificationEmailAsHtml`/`prepareTextMentionNotificationEmailAsReact`,
  use `content` instead.
- The `prepareTextMentionNotificationEmailAsReact` and
  `prepareTextMentionNotificationEmailAsHtml` functions’ returned data changed
  slightly:
  - The `id` property is now named `textMentionId`, it refers to the mention’s
    Text Mention ID, not the user ID used for the mention
  - The `id` property now refers to the mention’s ID, as in the user ID used for
    the mention
- The `element` prop received by the `Mention` component in
  `prepareTextMentionNotificationEmailAsReact` now contains an `id` property
  instead of `userId`, and a new `kind` property to indicate the mention’s kind.

### `@liveblocks/client` and `@liveblocks/node`

- The `getMentionedIdsFromCommentBody` utility has been replaced by
  `getMentionsFromCommentBody`.

## Dashboard

- Introduce an AI Copilots view to manage copilots and their knowledge.

## Examples

- New example:
  [AI Popup Chat](https://liveblocks.io/examples/ai-popup/nextjs-ai-popup).
- New example:
  [AI Chats](https://liveblocks.io/examples/ai-chats/nextjs-ai-chats).
- New example:
  [AI Reports Dashboard](https://liveblocks.io/examples/ai-dashboard-reports/nextjs-ai-dashboard-reports).

## Website

- New blog post:
  [Meet Liveblocks 3.0, the fastest way to let people collaborate with AI in your product](https://liveblocks.io/blog/meet-liveblocks-3-0-the-fastest-way-to-let-your-users-collaborate-with-ai-in-your-product).

## Contributors

adigau, ctnicholas, flowflorent, jrowny, marcbouchenoire, nimeshnayaju, nvie,
ofoucherot, pierrelevaillant, stevenfabre, sugardarius

# Week 22 (2025-05-30)

### `@liveblocks/react` and `@liveblocks/react-ui`

- Fix an issue with subpath imports (e.g. `@liveblocks/react/suspense`) and
  CommonJS which could happen with certain bundlers.

## Contributors

marcbouchenoire

# Week 19 (2025-05-09)

### `@liveblocks/react-ui`

- Disable or hide actions in `Thread` and `Comment` components for users without
  permission to perform them, such as adding reactions or (un)resolving threads.

## Contributors

marcbouchenoire

# Week 18 (2025-05-02)

## v2.24.1

### `@liveblocks/yjs`

- Fix for occasional desync issue.

## v2.24.0

We are introducing thread subscriptions to add more granularity to thread
notifications, allowing users to subscribe to threads without participating or
unsubscribing from specific ones.

We are also using this opportunity to rename some of the concepts around
notifications and notification settings to improve clarity. None of these
changes are breaking but you can learn more about them, their rationale, and how
to automatically apply them with a codemod in our
[Upgrade Guide for 2.24](https://liveblocks.io/docs/platform/upgrading/2.24).

### `@liveblocks/react-ui`

- Add "Subscribe to thread" and "Unsubscribe from thread" actions to `Thread`
  and thread `InboxNotification` out of the box.

### `@liveblocks/react`

- Add `useSubscribeToThread` and `useUnsubscribeFromThread` hooks.
- Add `subscribe` and `unsubscribe` methods to the existing
  `useThreadSubscription` hook.
- Add support for `textMentions` in room subscription settings.
- Rename `useRoomNotificationSettings` and `useUpdateRoomNotificationSettings`
  to `useRoomSubscriptionSettings` and `useUpdateRoomSubscriptionSettings`.

### `@liveblocks/node`

- Add `subscribeToThread`, `unsubscribeFromThread`, `getThreadSubscriptions` and
  `getUserRoomSubscriptionSettings` methods.
- Add support for `textMentions` in room subscription settings.
- Rename `getRoomNotificationSettings`, `updateRoomNotificationSettings`, and
  `deleteRoomNotificationSettings` to `getRoomSubscriptionSettings`,
  `updateRoomSubscriptionSettings`, and `deleteRoomSubscriptionSettings`.

### `@liveblocks/client`

- Add `Room.subscribeToThread` and `Room.unsubscribeFromThread` methods.
- Methods which return threads and their associated inbox notifications now also
  return the thread’s associated subscriptions.
- Add support for `textMentions` in room subscription settings.
- Rename `Room.getNotificationSettings` and `Room.updateNotificationSettings` to
  `Room.getSubscriptionSettings` and `Room.updateSubscriptionSettings`.

## MCP server

- New [MCP server](https://github.com/liveblocks/liveblocks-mcp-server) has been
  created for Liveblocks.
- Create and modify rooms, threads, comments, notifications, more.
- Read realtime Storage and Yjs values.
- Broadcast custom events to connected clients.
- Mark threads and notifications as read/unread.

## Documentation

- New page detailing how to use the
  [Liveblocks MCP server](https://liveblocks.io/docs/tools/mcp-server).

## Website

- New [trust center](https://liveblocks.safebase.us/) has been created, and
  links added to our website.

## Contributors

ctnicholas, marcbouchenoire, ofoucherot, flowflorent

# Week 17 (2025-04-25)

## v2.23.2

### `@liveblocks/tiptap`

- Add `closeAi` Tiptap command to manually close the AI toolbar.
- Fix `AiToolbar` focus behavior in Safari.
- Fix `FloatingToolbar` focus behavior in Safari.

### `@liveblocks/lexical`

- Fix `FloatingToolbar` focus behavior in Safari.

## v2.23.1

### `@liveblocks/client`

- Fix potential runtime error in browsers that do not support `Symbol.dispose`
  yet.

### `@liveblocks/node`

- Fix a bug in `.mutateStorage()` and `.massMutateStorage()` where mutating
  storage could potentially corrupt the storage tree.

## v2.23.0

### `@liveblocks/node`

- Expose new property `triggeredAt` for notification webhook events.

### `@liveblocks/emails`

- The `prepareThreadNotificationEmailAsHtml` and
  `prepareThreadNotificationEmailAsReact` functions are now avoiding duplicated
  comments between two emails data.

### `@liveblocks/react-ui`

- Improve event propagation from `Composer` and the emoji pickers in
  `Comment`/`Thread`.

### `@liveblocks/react-blocknote`

- Fix crash when unmounting. Thank you
  [@nperez0111](https://github.com/nperez0111)!
- Fix `withLiveblocksEditorOptions` not passing all options to BlockNote. Thank
  you [@chadnorvell](https://github.com/chadnorvell)!

## Documentation

- New
  [AI Copilots features](https://liveblocks.io/docs/ready-made-features/ai-copilots/features)
  page, highlighting all upcoming features.
- Mention first day free policy.
- Small updates to docs homepage

## Dashboard

- Refined billing and usage settings page, now displaying billed and non-billed
  users for monthly active users (MAUs) metric.

## Website

- New blog post:
  [Add Notion-style collaborative text editing to your app with Liveblocks BlockNote](https://liveblocks.io/blog/add-notion-style-collaborative-text-editing-to-your-app-with-liveblocks-blocknote).
- New blog post:
  [Introducing fairer billing with first day free](https://liveblocks.io/blog/introducing-fairer-billing-with-first-day-free).
- New blog post:
  [Rethinking product strategy in the age of AI with Melissa Perri](https://liveblocks.io/blog/rethinking-product-strategy-in-the-age-of-ai).
- New blog post:
  [What’s new in Liveblocks: March 2025](https://liveblocks.io/blog/whats-new-in-liveblocks-march-edition-2025).
- New blog post:
  [How Artefect reinvented collaborative workspaces for technical teams](https://liveblocks.io/blog/how-artefact-reinvented-collaborative-workspaces-for-technical-teams).

## Contributors

marcbouchenoire, flowflorent, sugardarius, nperez0111, chadnorvell, nvie,
ctnicholas, pierrelevaillant

# Week 14 (2025-04-04)

## v2.22.3

### `@liveblocks/react-ui`

- The `InboxNotification` component now uses `resolveRoomsInfo` for
  `textMention` notifications to make them link to the mentions’ room
  automatically if `href` isn’t set.
- Fix names capitalization in lists. (e.g. the list of who reacted in reactions’
  tooltips)
- Add `emojibaseUrl` **advanced** option on `LiveblocksUIConfig` to allow
  choosing where Emojibase’s data used by the Liveblocks emoji picker is fetched
  from: another CDN, self-hosted files, etc.

### `@liveblocks/react-blocknote`

- Fix: Update dependencies resolution.
- Fix: Avoid `<AnchoredThreads />` threads rendering if the editor's view is
  `null`.

## Contributors

marcbouchenoire, jrowny

# Week 13 (2025-03-28)

## v2.22.2

### `@liveblocks/node`

- Optimize `.getOrCreateRoom()` to only make a single round-trip to the server.
- Optimize `.upsertRoom()` to only make a single round-trip to the server.
- Also expose `LiveObject`, `LiveMap`, and `LiveList` in `@liveblocks/node`.

## v2.22.1

### `@liveblocks/react-blocknote`

- Fix report text editor function's call. Now we report correctly `blocknote` as
  text editor type.

### `@liveblocks/react-tiptap`

- Internal refactoring.

### `@liveblocks/node`

- Fix: improve stack traces of REST API errors to include the original error
  location.

## Dashboard

- BlockNote editors are now supported in a room's Text Editor view.

## Documentation

- Improve guide on
  [how to modify Liveblocks Storage from the server](https://liveblocks.io/docs/guides/how-to-modify-liveblocks-storage-from-the-server).
- Fix BlockNote code snippets and add info about it in the email package.

## Examples

- Improve notification settings in the
  [Next.js Starter Kit](https://liveblocks.io/nextjs-starter-kit).
- Update
  [notifications settings example](https://liveblocks.io/examples/notification-settings)
  to use the latest APIs.

## Contributors

nvie, sugardarius, ctnicholas, marcbouchenoire

# Week 12 (2025-03-21)

## v2.22.0

### `@liveblocks/node`

- Added pagination support to `.getInboxNotifications()`. See
  [docs](https://liveblocks.io/docs/api-reference/liveblocks-node#get-users-userId-inboxNotifications).
- New method `.getOrCreate()` which combines `.getRoom()` and `.createRoom()`.
  See
  [docs](https://liveblocks.io/docs/api-reference/liveblocks-node#get-or-create-rooms-roomId).
- New method `.upsertRoom()` which combines `.updateRoom()` and `.createRoom()`.
  See
  [docs](https://liveblocks.io/docs/api-reference/liveblocks-node#upsert-rooms-roomId).
- New method `.iterRooms()` which is like `.getRooms()` except pagination
  happens automatically. See [docs](https://liveblocks.io).
- New method `.iterInboxNotifications()` which is like
  `.getInboxNotifications()` except pagination happens automatically. See
  [docs](https://liveblocks.io/docs/api-reference/liveblocks-node#iter-users-userId-inboxNotifications).
- New method `.mutateStorage()` which can be used to make changes to Storage
  from your backend. See
  [docs](https://liveblocks.io/docs/api-reference/liveblocks-node#mutate-storage).
- New method `.massMutateStorage()` which can be used to make changes to Storage
  for multiple rooms simultaneously. See
  [docs](https://liveblocks.io/docs/api-reference/liveblocks-node#mass-mutate-storage).
- Updated method `.deleteRoom()` to no longer throw when the room already does
  not exist. See
  [docs](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-rooms-roomId).

### `@liveblocks/react-ui`

- Add new icons to `<Icon.* />`.

### `@liveblocks/emails`

- Implement a new core logic for thread notification event.
- Mark `htmlBody` from `prepareThreadNotificationEmailAsHtml` and `reactBody`
  from `prepareThreadNotificationEmailAsReact` as deprecated. Use `body`
  property instead.

## v2.21.0

### `@liveblocks/react-blocknote`

- New package to support using BlockNote with Liveblock’s comments, mentions,
  and realtime collaboration out of the box.

### `@liveblocks/node`

- Fix `markThreadAsResolved` and `markThreadAsUnresolved` methods not passing
  user ID correctly to the corresponding backend endpoints.

### `@liveblocks/react-ui`

- Improve emoji picker’s performance, bundle size, and add a preview of the
  currently selected emoji.
  - This is the result of us moving the emoji picker to
    [its own package](https://frimousse.liveblocks.io) and improving it in the
    process. You can also combine this package with the primitives to build your
    own reaction picker for example.
- Improve and fix pasting HTML into the composer.

## REST API

- The
  [Delete Room](https://liveblocks.io/docs/api-reference/rest-api-endpoints#delete-rooms-roomId)
  endpoint will no longer return a 404 when a room already did not exist before.

## Examples

- Updated
  [Comments primitives example](https://liveblocks.io/examples/comments-primitives)
  to use [Frimousse](https://frimousse.liveblocks.io).
- Updated
  [BlockNote example](https://liveblocks.io/examples/collaborative-text-editor/nextjs-blocknote)
  to use our new package.

## Documentation

- Mention our latest package, [Frimousse](https://frimousse.liveblocks.io).
- Detail building a primitive
  [emoji picker](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#emoji-picker)
  and
  [emoji reactions](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#emoji-reactions).
- API reference for all new
  [Node.js methods](https://liveblocks.io/docs/api-reference/liveblocks-node).
- API reference for
  [`@liveblocks/react-blocknoite`](https://liveblocks.io/docs/api-reference/liveblocks-react-blocknote).
- Updated
  [get started guides for BlockNote](https://liveblocks.io/docs/get-started/text-editor/blocknote).
- New
  [BlockNote overview](https://liveblocks.io/docs/ready-made-features/text-editor/blocknote)
  page.
- Updated guide on
  [modifying Storage from the server](https://liveblocks.io/docs/guides/how-to-modify-liveblocks-storage-from-the-server).

## Website

- New blog post:
  [We’ve open-sourced our customizable React emoji picker](https://liveblocks.io/blog/weve-open-sourced-our-customizable-emoji-picker-for-react).

## Contributors

jrowny, nimeshnayaju, marcbouchenoire, pierrelevaillant, ctnicholas, nvie,
sugardarius

# Week 11 (2025-03-14)

## Documentation

- Fixed a bug in the
  [interactive React tutorial](https://liveblocks.io/docs/tutorial/react/getting-started/welcome#/start.tsx)
  and updated all demos to use Vite instead of Create React App.
- Improved guide on
  [How to modify Liveblocks Storage from the server](https://liveblocks.io/docs/guides/how-to-modify-liveblocks-storage-from-the-server).
- Add more info about text editor data being permanently stored.

## Website

- New blog post:
  [How to build notifications that encourage collaboration](https://liveblocks.io/blog/how-to-build-notifications-that-encourage-collaboration).
- New blog post:
  [What’s new in Liveblocks: February 2025](https://liveblocks.io/blog/whats-new-in-liveblocks-february-2025).

## Contributors

ctnicholas, marcbouchenoire, pierrelevaillant

# Week 10 (2025-03-07)

## v2.20.0

### `@liveblocks/client`

- Implement a proxy factory for `UserNotificationSettings` object to return
  `null` to prevent any errors when accessing a disabled notification channel.

### `@liveblocks/node`

- Implement a proxy factory for `UserNotificationSettings` object to return
  `null` to prevent any errors when accessing a disabled notification channel.

### `@liveblocks/react`

- Add optional `useRoom({ allowOutsideRoom: true })` option. When this option is
  set, the hook will return `null` when used outside of a room, whereas the
  default behavior of the hook is be to throw.
- Implement a proxy factory for `UserNotificationSettings` object to return
  `null` to prevent any errors when accessing a disabled notification channel.

### `@liveblocks/react-ui`

- Improve mentions behavior around whitespace, fixing a regression introduced in
  `v2.18.3` when we added support for whitespace _within_ mentions.
- Prevent mention suggestions from scrolling instead of flipping when there’s
  enough space on the other side (e.g. moving from top to bottom).
- Improve event propagation in the formatting toolbar of `Composer`.

## v2.19.0

### `@liveblocks/*`

- Output ES modules by default (but CJS builds are still included)
- Modernize internal build tool settings

### `@liveblocks/node`

- Allow passing optional AbortSignal to all client methods
- Fix bug in encoding of error information in the LiveblocksError when an API
  call fails (thanks for reporting,
  [@robcresswell](https://github.com/robcresswell)!)
- Fix `getStorageDocument("my-room", "json")` typing in its output `LiveMap`
  instances as `ReadonlyMap` instead of serialized plain objects.

## Documentation

- New guide:
  [How to create a notification settings panel](https://liveblocks.io/docs/guides/how-to-create-a-notification-settings-panel).
- Improved
  [Notifications overview](https://liveblocks.io/docs/ready-made-features/notifications)
  pages, adding info on user notification settings.
- Improved existing webhooks guides, adding more context about notification
  channels, and how to create a settings panel.
- More info about how Text Editor permanently stores documents, and how it's
  different to Yjs.

## Examples

- New example:
  [Notification settings example](https://liveblocks.io/examples/notification-settings).
- Improved notification settings panel in the
  [Next.js Starter Kit](https://liveblocks.io/nextjs-starter-kit).

## Website

- New blog post:
  [Configure each user’s notification settings for email, Slack, and more](https://liveblocks.io/blog/configure-each-users-notifications-settings-for-slack-email-and-more).
- New blog post:
  [Liveblocks is now SOC 2 Type 2 and HIPAA compliant](https://liveblocks.io/blog/liveblocks-is-soc2-type-2-hipaa-compliant).

## Upkeep

- Ship all Liveblocks packages as ESM by default (but CJS builds are still
  included)
- Modernized internal build tool settings

## Contributors

ctnicholas, nvie, marcbouchenoire, nimeshnayaju, sugardarius, stevenfabre,
pierrelevaillant

# Week 8 (2025-02-21)

## v2.18.3

### `@liveblocks/node`

- Fix HTML escaping in `stringifyCommentBody` utility.

### `@liveblocks/client`

- Log more details in specific error cases to help debugging
- Fix HTML escaping in `stringifyCommentBody` utility.

### `@liveblocks/react`

- Increases the allowed stale time for polled user threads data. Only affects
  the `useUserThreads_experimental` hook.

### `@liveblocks/react-ui`

- Allow spaces and more non-alphanumeric characters when creating mentions in
  Comments composers.

### `@liveblocks/emails`

- Fix HTML escaping in prepare as HTML functions. Thank you
  [@huy-cove](https://github.com/huy-cove)!
- Revert deduplication logic introduced in `v2.18.0` as it provided no
  measurable benefits while increasing complexity.

## v2.18.2

### `@liveblocks/client`

- Improve performance of undo/redo operations on large documents. Thank you
  [@rudi-c](https://github.com/rudi-c)!

### `@liveblocks/react-tiptap`

- Fix a performance regression introduced in 2.18.1.

## Documentation

- Added info on how data storage is calculated.
- Fixed a number of broken links on various pages.

## Dashboard

- Internal refactoring and code clean up.

## Website

- New blog post:
  [Why collaborative features will define your product’s success](https://liveblocks.io/blog/why-collaborative-features-will-define-your-products-success).

## Contributors

ctnicholas, nvie, marcbouchenoire, nimeshnayaju, sugardarius, huy-cove, rudi-c

# Week 7 (2025-02-14)

## v2.18.1

### `@liveblocks/react-ui`

- Fix `<Composer />` and `<Comment />`
  [overrides](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Overrides)
  not working when set on `<Thread />`.

### `@liveblocks/yjs`

- Added a factory function
  [`getYjsProviderForRoom`](https://liveblocks.io/docs/api-reference/liveblocks-yjs#getYjsProviderForRoom)
  to grab an instance of Yjs provider that will be automatically cleaned up when
  the room is disconnected/changed. This is now
  [the recommended way to set up your Yjs app](https://liveblocks.io/docs/api-reference/liveblocks-yjs#Setup).
- Simplified types for
  [`LiveblocksYjsProvider`](https://liveblocks.io/docs/api-reference/liveblocks-yjs#LiveblocksYjsProvider).

### `@liveblocks/react-tiptap`

- Fixed a bug where documents would no longer sync after room the ID changed.

## v2.18.0

Introducing user notification settings. You can now create beautiful user
notification settings pages in your app.

### User notification settings (public beta)

Our packages `@liveblocks/client`, `@liveblocks/react` and `@liveblocks/node`
are now exposing functions to manage user notification settings on different
notification channels and kinds.

You can support `thread`, `textMention` and custom notification kinds (starting
by a `$`) on `email`, `Slack`, `Microsoft Teams` and `Web Push` channels.

#### Notification settings in the dashboard

You can choose from our new notifications dashboard page to enable or disable
notification kinds on every channels you want to use in your app. It means our
internal notification system on our infrastructure will decide to send or not an
event on your webhook.

### `@liveblocks/client`

We're adding two new methods in our client to get and update user notification
settings:

```tsx
import { createClient } from '@liveblocks/client'
const client = createClient({ ... })

const settings = await client.getNotificationSettings();
// { email: { thread: true, ... }, slack: { thread: false, ... }, ... }
console.log(settings);

const updatedSettings = await client.updateNotificationSettings({
  email: {
    thread: false,
  }
});
```

### `@liveblocks/react`

We're adding a new set of hooks to manage user notification settings.

You can either choose
[`useNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-react#useNotificationSettings)
if you need to get the current user notification settings and update them at the
same time:

```tsx
// A suspense version of this hook is available
import { useNotificationSettings } from "@liveblocks/react";

const [{ isLoading, error, settings }, updateSettings] =
  useNotificationSettings();
// { email: { thread: true, ... }, slack: { thread: false, ... }, ... }
console.log(settings);

const onSave = () => {
  updateSettings({
    slack: {
      textMention: true,
    },
  });
};
```

Or you can choose
[`useUpdateNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-react#useUpdateNotificationSettings)
if you just need to update the current user notification settings (e.g an
unsubscribe button):

```tsx
// A suspense version of this hook is available
import { useUpdateNotificationSettings } from "@liveblocks/react";

const updateSettings = useUpdateNotificationSettings();

const onUnsubscribe = () => {
  updateSettings({
    slack: {
      thread: false,
    },
  });
};
```

### `@liveblocks/node`

Our Node.js client now exposes
[three new methods](https://liveblocks.io/docs/api-reference/liveblocks-node#get-users-userId-notification-settings)
to manage user notification settings:

```tsx
import { Liveblocks } from "@liveblocks/node";
const liveblocks = new Liveblocks({ secret: "sk_xxx" });

const settings = await liveblocks.getNotificationSettings({ userId });
// { email: { thread: true, ... }, slack: { thread: false, ... }, ... }
console.log(settings);

const updatedSettings = await liveblocks.updateNotificationSettings({
  userId,
  data: {
    teams: {
      $fileUploaded: true,
    },
  },
});
await liveblocks.deleteNotificationSettings({ userId });
```

### `@liveblocks/emails`

- Update the behavior of
  [`prepareThreadNotificationEmailAsHtml`](https://liveblocks.io/docs/api-reference/liveblocks-emails#prepare-thread-notification-email-as-html)
  and
  [`prepareThreadNotificationEmailAsReact`](https://liveblocks.io/docs/api-reference/liveblocks-emails#prepare-thread-notification-email-as-react):
  the contents of previous emails data are now taken into account to avoid
  repeating mentions and replies that are still unread but have already been
  extracted in another email data.

## Examples

- Added user notification settings to the
  [Next.js Starter Kit](https://liveblocks.io/nextjs-starter-kit).
- Updated all Yjs examples to use
  [`getYjsProviderForRoom`](https://liveblocks.io/docs/api-reference/liveblocks-yjs#getYjsProviderForRoom).

## Documentation

- New guide:
  [What to check before enabling a new notification kind](https://liveblocks.io/docs/guides/what-to-check-before-enabling-a-new-notification-kind).
- Added info for new methods and hooks:
  - React:
    [`useNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-react#useNotificationSettings),
    [`useUpdateNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-react#useUpdateNotificationSettings).
  - JavaScript:
    [`getNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-client#Client.getNotificationSettings),
    [`updateNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-client#Client.updateNotificationSettings).
  - Node.js:
    [`getNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#get-users-userId-notification-settings),
    [`updateNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-users-userId-notification-settings),
    [`deleteNotificationSettings`](https://liveblocks.io/docs/api-reference/liveblocks-node#delete-users-userId-notification-settings).
- Rewrote email notification overview pages for
  [Comments](https://liveblocks.io/docs/ready-made-features/comments/email-notifications)
  and
  [Notifications](https://liveblocks.io/docs/ready-made-features/notifications/email-notifications).
- Adjusted existing notification guides to work with new dashboard settings.
- Improved information structure for
  [`useInboxNotifications`](https://liveblocks.io/docs/api-reference/liveblocks-react#useInboxNotifications).
- Improved
  [`@liveblocks/yjs`](https://liveblocks.io/docs/api-reference/liveblocks-yjs)
  API reference.
- Added info for new API
  [`getYjsProviderForRoom`](https://liveblocks.io/docs/api-reference/liveblocks-yjs#getYjsProviderForRoom).
- Updated all Yjs [get started guides](https://liveblocks.io/docs/get-started)
  to use the new API.

## Website

- We now have [`llms.txt`](https://liveblocks.io/llms.txt) and
  [`llms-full.txt`](https://liveblocks.io/llms-full.txt) files on our website,
  used to help AI understand our product.

## Dashboard

- Added new Notifications page to projects, allowing you to enable/disable
  webhooks events for different notification kinds, on different channels.

## Infrastructure

- Preparing foundation in the backend to make Storage more efficient in the
  future.

## Contributors

ctnicholas, pierrelevaillant, flowflorent, sugardarius, jrowny, marcbouchenoire,
nvie

# Week 6 (2025-02-07)

## v2.17.0

### `@liveblocks/client`

- Report a console error when a client attempts to send a WebSocket message that
  is >1 MB (which is not supported). Previously the client would silently fail
  in this scenario.
- Added a new client config option `largeMessageStrategy` to allow specifying
  the preferred strategy for dealing with messages that are too large to send
  over WebSockets. There now is a choice between:
  - `default` Don’t send anything, but log the error to the console.
  - `split` Split the large message up into smaller chunks (at the cost of
    sacrificing atomicity). Thank you
    [@adam-subframe](https://github.com/adam-subframe)!
  - `experimental-fallback-to-http` Send the message over HTTP instead of
    WebSocket.
- Deprecated the `unstable_fallbackToHTTP` experimental flag (please set
  `largeMessageStrategy="experimental-fallback-to-http"` instead).

### `@liveblocks/react`

- Added `<LiveblocksProvider largeMessageStrategy="..." />` prop to
  LiveblocksProvider. See above for possible options.

### `@liveblocks/react-ui`

- Fix crash when a `Composer` is unmounted during its `onComposerSubmit`
  callback.
- Add new icons to `<Icon.* />`.

### `@liveblocks/react-tiptap`

### AI Toolbar (private beta)

This release adds components and utilities to add an AI toolbar to your text
editor, available in private beta.

- Add `ai` option to `useLiveblocksExtension` to enable (and configure) it.
- Add `<AiToolbar />` component. (with `<AiToolbar.Suggestion />`,
  `<AiToolbar.SuggestionsSeparator />`, etc)
- Add default AI buttons in `Toolbar` and `FloatingToolbar` when the `ai` option
  is enabled.
- Add `askAi` Tiptap command to manually open the toolbar, it can also be
  invoked with a prompt to directly start the request when opening the toolbar.
  (e.g. `editor.commands.askAi("Explain this text")`)

## Documentation

- [`@liveblocks/node-prosemirror`](https://liveblocks.io/docs/api-reference/liveblocks-node-prosemirror)
  documentation has been published. Use this package for editing Tiptap and
  ProseMirror documents on the server.
- [`@liveblocks/node-lexical`](https://liveblocks.io/docs/api-reference/liveblocks-node-lexical)
  documentation has been improved to match the ProseMirror docs.

## Website

- New blog post:
  [Which rich text editor framework should you choose in 2025?](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025).

## Contributors

jrowny, ctnicholas, nvie, marcbouchenoire, sugardarius, adam-subframe

# Week 5 (2025-01-31)

## v2.16.2

### `@liveblocks/react`

- Improve error message if hooks are accidentally called server side.

### `@liveblocks/zustand`

- Fix bug in Zustand typing in case the multi-argument form of `set()` is used.
  Thank you [@hans-lizihan](https://github.com/hans-lizihan)!

## Website

- New blog post:
  [Great agent experience starts with great collaboration](https://liveblocks.io/blog/great-agent-experience-great-collaboration).

## Documentation

- Better info on `initialStorage` values.

## Contributors

ctnicholas, stevenfabre, sugardarius, nvie, hans-lizihan

# Week 4 (2025-01-24)

## v2.16.1

### `@liveblocks/react-lexical` and `@liveblocks/react-tiptap`

- `<Toolbar.Button />` and `<Toolbar.Toggle />` now display their `name`
  visually if `children` and `icon` aren’t set.

## Documentation

- Added missing 409 response to Initialize Storage REST API.
- Typo fixed in custom notification snippet.

## Contributors

jltimm, ctnicholas, marcbouchenoire

# Week 3 (2025-01-17)

## v2.16.0

We've created new toolbar elements that allow you to import a default floating
toolbar in Tiptap and Lexical. It's also possible to use these APIs to build
custom or static toolbars. We've updated a number of our examples to show how to
do this.

Our error listener APIs will now receive more errors in general, including
errors from using Comments & Notifications. Previously, these would only receive
room connection errors from Presence, Storage, or Yjs. For example, now when
creation of a thread fails, deletion of a comment fails, marking a notification
as read fails, etc.

### `@liveblocks/react`

#### **Breaking**: More errors can appear in `useErrorListener()`

```ts
// ❌ Before: required a RoomProvider and would only notify about errors for that room
// ✅ Now: requires a LiveblocksProvider and will notify about errors for any room
useErrorListener((err: LiveblocksError) => {
  /* show toast, or notify Sentry, Datadog, etc */
});
```

See the
[Upgrade Guide for 2.16](https://liveblocks.io/docs/platform/upgrading/2.16) to
learn how to adapt your code.

#### Filtering by absence of metadata

We now support filtering threads by _absence_ of metadata as well in
`useThreads({ query })` (or `useUserThreads_experimental({ query })`). For
example, you can now filter threads that do not have a `color` attribute set in
their metadata:

```ts
useThreads({
  query: {
    // Filter any "pinned" threads that don't have a color set
    metadata: {
      pinned: true,
      color: null, // ✨
    },
  },
});
```

See the
[Upgrade Guide for 2.16](https://liveblocks.io/docs/platform/upgrading/2.16) to
learn how to adapt your code.

#### Bug fixes

- Automatically refresh Comments and Notifications when the browser window
  regains focus.

### `@liveblocks/client`

The error listener APIs will now receive more errors in general, including
errors from using Comments & Notifications. Previously, these would only receive
room connection errors from Presence, Storage, or Yjs.

```ts
// 👌 Same as before, but might now also receive errors related to Comments & Notifications
room.subscribe("error", (err) => { ... });
```

### `@liveblocks/react-ui`

- Most of the icons used in the default components are now usable as
  `<Icon.* />` via `import { Icon } from "@liveblocks/react-ui"`.

### `@liveblocks/react-lexical` and `@liveblocks/react-tiptap`

- Add `<Toolbar />` and `<FloatingToolbar />` components to simplify building
  editor toolbars. They come with default controls out-of-the-box based on what
  the editor they’re attached to supports, but they’re also heavily extendable
  and customizable. Use inner components like `<Toolbar.Toggle />` and
  `<Toolbar.Separator />` to extend the defaults with your own actions, or start
  from scratch while customizing some of the defaults via
  `<Toolbar.SectionInline />` or `<Toolbar.BlockSelector />` for example.

### `@liveblocks/react-lexical`

- Add `isTextFormatActive` and `isBlockNodeActive` utilities.

## Examples

- Updated [Next.js Starter Kit](https://liveblocks.io/nextjs-starter-kit) to use
  the new `FloatingToolbar`.
- Updated many text editor examples to use the new `FloatingToolbar`:
  - [Advanced collaborative text editor (Tiptap)](https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-tiptap-advanced)`.
  - [Collaborative text editor (Tiptap)](https://liveblocks.io/examples/collaborative-text-editor/nextjs-tiptap).
  - [Collaborative text editor (Lexical)](https://liveblocks.io/examples/collaborative-text-editor/nextjs-lexical).
  - [Text editor comments (Tiptap)](https://liveblocks.io/examples/text-editor-comments/nextjs-comments-tiptap).
  - [Next.js Tiptap editor](https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-tiptap-advanced).
  - [Next.js Tiptap editor](https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-tiptap-advanced).

## Dashboard

- Allow rate limit configuration for webhook endpoints.
- Fix download comments attachments action in text editor view from room detail
  page.

## Contributors

jrowny, sugardarius, ctnicholas, nvie, marcbouchenoire

# Week 2 (2025-01-10)

## 2.15.2

### All packages

- Fix `useLayoutEffect` warnings when using React versions lower than 18.3.0 and
  SSR.

### `@liveblocks/react`

- Fix memory leak in some hooks.
- Fix bug where querying metadata with `useThreads()` would not always reuse the
  cache correctly.

## Website

- New blog post:
  [What’s new in Liveblocks: December 2024](https://liveblocks.io/blog/whats-new-in-liveblocks-december-edition-2024).

## Contributors

ctnicholas, nvie, marcbouchenoire

# Week 52 (2024-12-27)

## 2.15.1

### All packages

- Fix rollup config to always ensure `"use client"` directives are on top of
  files after build.

## Contributors

sugardarius

# Week 51 (2024-12-20)

## v2.15.0

### `@liveblocks/react`

- **Breaking**: Drop support for React 17 (and 16). If you’re unable to upgrade
  React to 18 or higher, you can still continue to use Liveblocks 2.14.0, which
  is the last version to support React versions lower than 18.

### All packages

- The published target for all Liveblocks packages is now ES2022 (up from
  ES2020). This should have a positive impact on your bundle size[\*].

- Various internal refactorings and code cleanup.

[\*] If you bundle for the browser, this should not be a problem, as all major
browsers support ES2022. If however you're specifically targeting very old
browsers (mostly IE), then you may need to configure your bundler (Webpack,
rollup, esbuild, etc) to also down-compile code from dependencies inside
`node_modules` for you, if you aren't already.

## Website

- New blog post:
  [A better way to email your users about unread content](https://liveblocks.io/blog/a-better-way-to-email-your-users-about-unread-content).

## Examples

- Adjusted email templates to allow switching the logo more easily.
- [Next.js Starter Kit](https://liveblocks.io/nextjs-starter-kit) improvements:
  - Renaming a document updates it immediately for everyone else.
  - Clicking outside of the rename input saves the new name.
  - Added tldraw's dark mode.
  - Added option to filter for canvas in the room listing.
  - Upgraded Liveblocks.
  - Fixed a z-index problem and added a hover style.

## Documentation

- [Upgrade guide for 2.15](https://liveblocks.io/docs/platform/upgrading/2.15).
- Added links to email templates in guides and API reference.

## Contributors

ctnicholas, nvie, marcbouchenoire

# Week 50 (2024-12-13)

## v2.14.0

### `@liveblocks/emails`

- Add new functions
  [`prepareTextMentionNotificationEmailAsHtml`](https://liveblocks.io/docs/api-reference/liveblocks-emails#prepare-text-mention-notification-email-as-html)
  and
  [`prepareTextMentionNotificationEmailAsReact`](https://liveblocks.io/docs/api-reference/liveblocks-emails#prepare-text-mention-notification-email-as-react)
  to support text mention notification event for Lexical and Tiptap text editors
  and prepare data into email-ready formats.

## v2.13.2

### `@liveblocks/react-lexical`

- Fix report text editor function's call. Now we wait for the room's status to
  be `connected` to report the text editor instead of reporting directly after
  room creation / loading.

### `@liveblocks/react-tiptap`

- Fix report text editor function's call. Now we wait for the room's status to
  be `connected` to report the text editor instead of reporting directly after
  room creation / loading.

## Examples

- New example:
  [Text Editor Emails (Tiptap)](https://liveblocks.io/examples/collaborative-text-editor-emails/nextjs-tiptap-emails-resend).
- New example:
  [Text Editor Emails (Lexical)](https://liveblocks.io/examples/collaborative-text-editor-emails/nextjs-lexical-emails-resend).

## Documentation

- New guide:
  [How to send email notifications for unread text editor mentions](https://liveblocks.io/docs/guides/how-to-send-email-notifications-for-unread-text-editor-mentions).
- Improved
  [thread metadata page](https://liveblocks.io/docs/products/comments/metadata).

## Website

- New blog post:
  [What's new in Liveblocks: November 2024](https://liveblocks.io/blog/whats-new-in-liveblocks-november-edition-2024).
- Revamped the [Liveblocks blog](https://liveblocks.io/blog):
  - Added the ability to switch between categories to find relevant posts.
  - Added the ability to search posts and filter results using tags.
  - Updated the layout with a table of contents, writer information, and
    featured posts.

## Contributors

sugardarius, ctnicholas

# Week 49 (2024-12-06)

## v2.13.1

### `@liveblocks/react-ui`

- Improve the spacing consequences of `--lb-line-height` (introduced in 2.13.0)
  in some contexts.

## Dashboard

- Multiple Tiptap editors are now supported in a room's Text Editor view.

## Documentation

- Improved
  [custom composer behavior](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Custom-composer-behavior)
  code example.

## Contributors

ctnicholas, pierrelevaillant, marcbouchenoire

# Week 48 (2024-11-29)

## v2.13.0

### `@liveblocks/react-ui`

- Add a formatting toolbar to `Composer` which appears when selecting text. It’s
  enabled by default in the default components and can also be custom built with
  new primitives (`Composer.FloatingToolbar` and `Composer.MarkToggle`) and new
  APIs (`const { marks, toggleMark } = useComposer()`).
- Add new `--lb-line-height` token to control the line height of main elements
  (e.g. comment bodies in comments and composers).
- Remove `Timestamp` export mistakenly added to `@liveblocks/react-ui`, it
  should be imported from `@liveblocks/react-ui/primitives` instead.

## Website

- New blog post:
  [Easy collaborative text editing with Liveblocks Tiptap](http://liveblocks.io/blog/easy-collaborative-text-editing-with-liveblocks-tiptap).

## Examples

- New example:
  [Novel AI editor](https://liveblocks.io/examples/novel-ai-editor).

## Documentation

- Info on
  [using multiple Tiptap editors](https://liveblocks.io/docs/api-reference/liveblocks-react-tiptap#Multiple-editors).
- Info on
  [offline support for Tiptap](https://liveblocks.io/docs/api-reference/liveblocks-react-tiptap#Offline-support).
- Removed `beta` warnings from Tiptap docs.
- Improved `resolveUsers` and `resolveRoomsInfo` docs.
- Fix
  [custom composer behavior](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Custom-composer-behavior)
  code snippet.

## Contributors

ctnicholas, marcbouchenoire, flowflorent

# Week 47 (2024-11-22)

## v2.12.2

### `@liveblocks/react-tiptap`

- Add new options for
  [`useLiveblocksExtension`](https://liveblocks.io/docs/api-reference/liveblocks-react-tiptap#useLiveblocksExtension)
  to allow setting initial content, experimental offline support, and the field
  name.
- Update floating composer to support `onComposerSubmit` handler and closing the
  composer with the escape key.

### `@liveblocks/zustand`

- Add support for Zustand v5.

## v2.12.1

### `@liveblocks/react-ui`

- Prevent unsupported attachment previews from loading infinitely.
- Refactored `Thread` and `Comment` component to be used outside of the
  `RoomProvider` component.

## Documentation

- Better info on
  [default permissions with access tokens](https://liveblocks.io/docs/authentication/access-token#Default-permissions).
- Updated API reference for
  [`useLiveblocksExtension`](https://liveblocks.io/docs/api-reference/liveblocks-react-tiptap#useLiveblocksExtension).

## Examples

- Added offline support for Tiptap text documents in the
  [Next.js Starter Kit](https://liveblocks.io/nextjs-starter-kit).

## Contributors

ctnicholas, jrowny, sugardarius, marcbouchenoire, nimeshnayaju

# Week 46 (2024-11-15)

## v2.12.0

This release adds support for tracking synchronization status of pending local
changes for any part of Liveblocks. Whether you use Storage, Text Editors,
Threads, or Notifications. If the client’s sync status is `synchronized`, it
means all local pending changes have been persisted by our servers. If there are
pending local changes in any part of Liveblocks you’re using, then the client’s
sync status will be `synchronizing`.

Also, we’re introducing a way to prevent browser tabs from being closed while
local changes are not yet synchronized. To opt-in to this protection, enable
`preventUnsavedChanges` option on the client:

- In React: `<LiveblocksProvider preventUnsavedChanges />`
- Otherwise: `createClient({ preventUnsavedChanges: true })`

### `@liveblocks/client`

- Add new API
  [`client.getSyncStatus()`](https://liveblocks.io/docs/api-reference/liveblocks-client#Client.getSyncStatus)
  method.
- Add new client config option:
  [`preventUnsavedChanges`](https://liveblocks.io/docs/api-reference/liveblocks-client#prevent-users-losing-unsaved-changes).
- Expose `ToImmutable<T>` helper type.

### `@liveblocks/react`

- Add new hook
  [`useSyncStatus`](https://liveblocks.io/docs/api-reference/liveblocks-react#useSyncStatus)
  that can be used to tell whether Liveblocks is synchronizing local changes to
  the server. Useful to display a "Saving..." spinner in your application, when
  used with `useSyncStatus({ smooth: true })`.
- Add new `LiveblocksProvider` prop:
  [`preventUnsavedChanges`](https://liveblocks.io/docs/api-reference/liveblocks-react#prevent-users-losing-unsaved-changes).
- Deprecated APIs:
  - `useStorageStatus` is now deprecated in favor of `useSyncStatus`.

### `@liveblocks/react-ui`

- Take composers into account when the new `preventUnsavedChanges` option is
  set.

### `@liveblocks/react-lexical`

- Add new hook
  [`useIsEditorReady`](http://liveblocks.io/docs/api-reference/liveblocks-react-lexical#useIsEditorReady)
  which can be used to show a skeleton UI before the editor has received the
  initial text from the server.
- Deprecated APIs:
  - `useEditorStatus` is now deprecated in favor of `useIsEditorReady` (or
    `useSyncStatus`).

## Examples

- Added new canvas document type to
  [Next.js Starter Kit](https://liveblocks.io/nextjs-starter-kit), powered by
  [tldraw](https://tldraw.dev/).
- Added loading `useStatusSync` loading spinners to
  [Linear-like Issue Tracker](https://liveblocks.io/examples/linear-like-issue-tracker/nextjs-linear-like-issue-tracker)
  and
  [Notion-like AI editor](https://liveblocks.io/examples/notion-like-ai-editor/nextjs-notion-like-ai-editor).
- Added `useIsEditorReady` to Lexical examples.

## Dashboard

- Redirect users to a specific error page on authentication failure.

## Contributors

ctnicholas, nvie, marcbouchenoire, nimeshnayaju, sugardarius

# Week 45 (2024-11-08)

## v2.11.0

### `@liveblocks/react-ui`

- Upgrade dependencies.
- Fix minor appearance issues related to attachments.
- Fix pasting issues introduced in 2.10.0.

### `@liveblocks/react`

- Fix regression with `useThreads` that caused the hook to return an error if
  its associated room did not exist.

### `@liveblocks/react-tiptap`

- Initial release.

### `@liveblocks/emails`

- Initial release.

## Documentation

- [`@liveblocks/react-tiptap`](https://liveblocks.io/docs/api-reference/liveblocks-react-tiptap)
  API reference.
- New
  [Tiptap overview page](https://liveblocks.io/docs/ready-made-features/text-editor/tiptap).
- Restructured getting started, adding new guides for using
  `@liveblocks/react-tiptap` on
  [Next.js](https://liveblocks.io/docs/get-started/nextjs-tiptap) and
  [React](https://liveblocks.io/docs/get-started/react-tiptap).
- [`@liveblocks/emails`](https://liveblocks.io/docs/api-reference/liveblocks-emails)
  API reference.
- Updated guide on
  [sending emails when comments are created](https://liveblocks.io/docs/guides/how-to-send-email-notifications-of-unread-comments).
- Updated
  [email notifications overview](https://liveblocks.io/docs/ready-made-features/comments/email-notifications).

## Examples

- New
  [Next.js Comments + Resend example](https://liveblocks.io/examples/comments-emails/nextjs-comments-emails-resend).
- New
  [Next.js Comments + SendGrid example](https://liveblocks.io/examples/comments-emails/nextjs-comments-emails-sendgrid).
- Updated [Next.js Starter Kit](https://liveblocks.io/nextjs-starter-kit) to use
  `@liveblocks/react-tiptap`.
- Updated
  [Next.js advanced Tiptap text editor example](https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-tiptap-advanced)
  to use `@liveblocks/react-tiptap`.
- Updated
  [Next.js Tiptap text editor example](https://liveblocks.io/examples/collaborative-text-editor/nextjs-tiptap)
  to use `@liveblocks/react-tiptap`.

## Contributors

sugardarius, nimeshnayaju, marcbouchenoire, jrowny, ctnicholas

# Week 44 (2024-11-01)

## v2.10.2

### `@liveblocks/client`

- Internal refactorings and code cleanup across various parts of the client's
  inner workings.

### `@liveblocks/react`

- Implement automatic retry for initial load of inbox notifications, user
  threads, room threads, room versions, or room notification settings—except
  when encountering a 4xx error.
- Background tabs will no longer poll threads, notification, room versions or
  room notification settings.
- Fix incorrect suspense export for `useRoomNotificationSettings` hook.
- Support for React 19 and Next.js 15.

### `@liveblocks/react-ui`

- Support for React 19 and Next.js 15.

### `@liveblocks/react-lexical`

- Support for React 19 and Next.js 15.

## Dashboard

- Icons indicating which rooms are public/private on room listing and detail
  pages.
- New warning message if all your rooms are publicly accessible.

## Documentation

- Improved clarity on Notifications being
  [project-based](http://liveblocks.io/docs/ready-made-features/notifications/concepts#Project-based).
- Typo fixes.

## Contributors

haydenbleasel, ctnicholas, pierrelevaillant, nvie, nimeshnayaju

# Week 43 (2024-10-25)

## v2.10.0

### `@liveblocks/client`

- Add new
  [resolver methods](https://liveblocks.io/docs/api-reference/liveblocks-client#Resolvers)
  under `client.resolvers.*` to invalidate the cache of `resolveUsers`,
  `resolveRoomsInfo`, and `resolveMentionSuggestions`.
- When subscribing to Storage update events using
  [`room.subscribe(root, ..., { isDeep: true })`](https://liveblocks.io/docs/api-reference/liveblocks-client#listening-for-nested-changes),
  all LiveList deletion updates will now also include the item that was deleted.

### `@liveblocks/react-ui`

- Improve and fix pasting rich text into the composer.
- Improve mention suggestions click behavior.

## Dashboard

- Removed `Show deleted threads` checkbox from the room detail `Comments` tab to
  ensure consistent behavior across dashboard and APIs.

## Documentation

- Prevent truncated API keys being copied in code snippets.
- Typo fixes.

## Contributors

pierrelevaillant, sugardarius, kaf-lamed-beyt, ctnicholas, marcbouchenoire, nvie

# Week 42 (2024-10-18)

## v2.9.1

### `@liveblocks/client`

- Fix regression with metadata filtering on explicitly-`undefined` values.
- Fix bug where client wasn't always using the newest delta update backend
  endpoint yet.
- Fix type definition of `ThreadData`: `updatedAt` is always set.

### `@liveblocks/react-ui`

- When
  [`Composer`](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Composer)
  is disabled, its actions are now also disabled as expected.
- Various event propagation improvements in
  [`Composer`](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Composer).

## v2.9.0

We are introducing pagination support to allow apps using threads and inbox
notifications to be built in a more user-friendly way, where the initial load is
faster and more data can be fetched incrementally as users interact with the
app.

### `@liveblocks/react`

- Add pagination support to
  [`useInboxNotifications`](https://liveblocks.io/docs/api-reference/liveblocks-react#useInboxNotifications).

  ```tsx
  const {
    inboxNotifications,
    isLoading,
    error,

    // ✨ New in Liveblocks 2.9
    fetchMore,
    isFetchingMore,
    hasFetchedAll,
    fetchMoreError,
  } = useInboxNotifications();
  ```

- Add pagination support to
  [`useThreads`](https://liveblocks.io/docs/api-reference/liveblocks-react#useThreads)
  and `useUserThreads_experimental`.

  ```tsx
  const {
    threads,
    isLoading,
    error,

    // ✨ New in Liveblocks 2.9
    fetchMore,
    isFetchingMore,
    hasFetchedAll,
    fetchMoreError,
  } = useThreads({ query });
  ```

## Website

- New [startups](https://liveblocks.io/startups) page highlighting discounts for
  startups and nonprofits.

## Contributors

nimeshnayaju, ofoucherot, marcbouchenoire, nvie, pierrelevaillant, stevenfabre

# Week 40 (2024-10-04)

## v2.8.2

### `@liveblocks/client`

- Send client version in HTTP request headers from the client, to ensure
  backward compatible responses from the server

## v2.8.1

### `@liveblocks/react-ui`

- Expose `onComposerSubmit` on `Thread` to react to the inner composer of a
  thread.

## Website

- Refresh pricing page design

## Dashboard

- Add attachments support to the comments view on the room detail page

## Figma Kit

- Add comments attachments to the
  [Liveblocks Collaboration Kit in Figma](https://www.figma.com/community/file/1387130796111847788/liveblocks-collaboration-kit)

## Contributors

marcbouchenoire, sugardarius, pierrelevaillant, nvie

# Week 39 (2024-09-27)

## v2.8.0

We are introducing attachments to allow users to add files to their comments,
for more information about this change please read our
[Upgrade Guide for 2.8](https://liveblocks.io/docs/platform/upgrading/2.8).

### `@liveblocks/react-ui`

- Add out-of-the-box support for attachments in the default components.
- Add new primitives to support attachments in custom components:
  - `Composer.AttachmentsDropArea`: Receives files via drag-and-drop
  - `Composer.AttachFiles`: Opens a file picker
  - `FileSize`: Displays a formatted file size
- Add values and methods to `useComposer` to support attachments in custom
  components.

### `@liveblocks/react`

- Add `useAttachmentUrl` hook to get presigned URLs for attachments.

### `@liveblocks/client`

- Add `prepareAttachment` and `uploadAttachment` methods to `Room` to create
  attachments.
- Add `getAttachmentUrl` method to `Room` to get presigned URLs for attachments.

## Website

- New blog post:
  [Next.js Template Week recap](https://liveblocks.io/blog/nextjs-template-week-recap).
- Bug fix on the pricing page MAU slider which didn't apply the MAU value set to
  the price of the products.

## Contributors

ctnicholas, stevenfabre, marcbouchenoire, ofoucherot, flowflorent

# Week 38 (2024-09-20)

## v2.7.2

### `@liveblocks/react`

- Fix a bug where under some conditions threads could end up without comments.
- Fix a bug where notifications associated to deleted threads would not be
  deleted.
- Fix a bug where subsequent optimistic updates to the same inbox notification
  could sometimes not get applied correctly.

## v2.7.1

### `@liveblocks/react-lexical`

- Fixed a bug where resolved threads remained visible in the editor and the
  `AnchoredThreads` and `FloatingThreads` components.

## Examples

- New
  [Linear-like Issue Tracker example](https://liveblocks.io/examples/linear-like-issue-tracker/nextjs-linear-like-issue-tracker).
- New
  [Tldraw Whiteboard Storage example](https://liveblocks.io/examples/tldraw-whiteboard/nextjs-tldraw-whiteboard-storage).
- New
  [Tldraw Whiteboard Yjs example](https://liveblocks.io/examples/tldraw-whiteboard/nextjs-tldraw-whiteboard-yjs).
- New
  [Notion-like AI Editor example](https://liveblocks.io/examples/notion-like-ai-editor/nextjs-notion-like-ai-editor).

## Documentation

- Rewritten Lexical Text Editor get started guides for
  [Next.js](https://liveblocks.io/docs/get-started/nextjs-lexical) and
  [React](https://liveblocks.io/docs/get-started/react-lexical), adding
  [`AnchoredThreads`](https://liveblocks.io/docs/api-reference/liveblocks-react-lexical#AnchoredThreads)
  and
  [`FloatingThreads`](https://liveblocks.io/docs/api-reference/liveblocks-react-lexical#FloatingThreads).

## Dashboard

- Fix a bug where room storage data wasn't fetched correctly and not displayed
  in the room detail storage tab.
- Fix a bug where room storage data couldn't be deleted from the room detail
  storage tab.

## Contributors

ctnicholas, nimeshnayaju, marcbouchenoire, nvie, sugardarius

# Week 37 (2024-09-13)

## v2.7.0

### `@liveblocks/client`

- Refactor caching internals to prepare for upcoming features.

### `@liveblocks/react`

- Add support for `query` argument to `useUserThreads_experimental`.
- Fix bug where some combinations of `query` criteria could over-select threads
  in `useThreads`.

## 2.6.1

### `@liveblocks/react-ui`

- Fix mention suggestions dropdown not following scroll in some scenarios.

## Dashboard

- Improved error messages to provide clearer guidance during team creation.
- Implemented various bug fixes and performed stabilization work to enhance
  overall system reliability.

## Contributors

nvie, flowflorent, jrowny, marcbouchenoire, sugardarius, nimeshnayaju

# Week 36 (2024-09-06)

## Website

- New blog post:
  [Dashboard enhancements to improve observability and developer experience](https://liveblocks.io/blog/dashboard-enhancements-to-improve-observability-and-developer-experience).
- New blog post:
  [What’s new in Liveblocks: August edition](https://liveblocks.io/blog/whats-new-in-liveblocks-august-edition-2024).

## Documentation

- New guide on
  [migrating to Comments](https://liveblocks.io/docs/guides/how-to-migrate-to-liveblocks-comments).

## Contributors

ctnicholas

# Week 35 (2024-08-30)

## v2.6.0

### `@liveblocks/node`

- Add `getInboxNotifications` method which supports an `unread` query parameter.

## Dashboard

- Room detail page enhancements:
  - Renamed "Document" tab to "Realtime APIs" (Storage + Yjs) to reflect new
    product offerings.
  - Reordered tabs: Comments, Text Editor, Realtime APIs, Metadata, Permissions.
  - Introduced a new Text Editor tab with enhanced features:
    - Preview Lexical documents directly from the dashboard, including mentions,
      comment annotations, and custom nodes.
    - Access comment threads from text annotations and browse their comments and
      metadata.
  - Broadcast custom events to people connected in the room using a typed
    editor.
- New inline view for comment threads:
  - Offers a more visual and intuitive way to browse comments.
  - Added ability to sort threads by latest activity, most replies, or creation
    date.
  - Introduced an option to delete all threads in a room at once.

## Documentation

- Improved search dialog box:
  - Returns more accurate results, and is generally much more useful.
  - Returns more results than before, allowing you to accessibly scroll through
    the list.
- New guide on
  [setting initial/default state in BlockNote](https://liveblocks.io/docs/guides/setting-an-initial-or-default-value-in-blocknote).

## Website

- New [book a demo](http://liveblocks.io/contact/sales) page, allowing you to
  easily set up a meeting with our sales team.

## Contributors

ctnicholas, sugardarius, pierrelevaillant, stevenfabre

# Week 34 (2024-08-23)

## Examples

- Add new features and polish to the
  [Next.js Overlay Comments](https://liveblocks.io/examples/overlay-comments/nextjs-comments-overlay)
  and
  [Next.js Canvas Comments](https://liveblocks.io/examples/canvas-comments/nextjs-comments-canvas)
  examples.
- Comments now flip when previously they would go offscreen, and other small
  bugs were fixed.

## Contributors

ctnicholas

# Week 33 (2024-08-16)

## v2.5.1

### `@liveblocks/yjs`

- Fix `LiveblocksProvider` `update`/`change` event not returning `removed`
  users.

## v2.5.0

### `@liveblocks/react`

- Add
  [`useIsInsideRoom`](https://liveblocks.io/docs/api-reference/liveblocks-react#useIsInsideRoom)
  hook, useful for rendering different components inside and outside of
  [`RoomProvider`](https://liveblocks.io/docs/api-reference/liveblocks-react#RoomProvider).

### `@liveblocks/react-lexical`

- Fix a bug in
  [`useEditorStatus`](https://liveblocks.io/docs/api-reference/liveblocks-react-lexical#useEditorStatus)
  which prevented it from returning a correct status when `LexicalPlugin` was
  rendered conditionally.
- Fix remote cursors not displaying user names.

### `@liveblocks/react-ui`

- Improve event propagation in
  [`Composer`](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Composer).

## `@liveblocks/codemod`

- Prevent modifying files that weren’t changed by the codemods.

## Contributors

ctnicholas, nimeshnayaju, marcbouchenoire

# Week 32 (2024-08-09)

## Website

- New blog post:
  [What’s new in Liveblocks: July edition](https://liveblocks.io/blog/whats-new-in-liveblocks-july-edition-2024).

## Dashboard

- Add the ability to see the response body of webhook attempts in the webhook
  event details dialog (found in the "more" dropdown).

## Documentation

- Add API reference for
  [`liveblocks.markThreadAsResolved`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-mark-as-resolved)
  and
  [`liveblocks.markThreadAsUnresolved`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-threadId-mark-as-unresolved).

## Contributors

ctnicholas

# Week 31 (2024-08-02)

## Dashboard

- Add the Room API docs to the dashboard. Copy pre-filled code snippets from the
  API reference directly from the Room detail page.
- Optimize the width of rooms, schemas, and webhooks lists when a detail view is
  opened for more comfort on medium-sized screens.

## Documentation

- Updated
  [How to modify Storage from the server](https://liveblocks.io/docs/guides/how-to-modify-liveblocks-storage-from-the-server)
  for Liveblocks 2.0.
- Fixed various typos.
- Show public/secret keys within the Bash code snippets for connected users.

## Contributors

pierrelevaillant, sugardarius, teddarific, assaadhalabi

# Week 30 (2024-07-26)

## v2.4.0

### `@liveblocks/client`

- Add vanilla
  [Comments](https://liveblocks.io/docs/api-reference/liveblocks-client#Comments)
  and
  [Notifications](https://liveblocks.io/docs/api-reference/liveblocks-client#Notifications)
  APIs to `Client` and `Room`, enabling these products outside of React.

## Documentation

- Add info on new
  [Comments](https://liveblocks.io/docs/api-reference/liveblocks-client#Comments)
  and
  [Notifications](https://liveblocks.io/docs/api-reference/liveblocks-client#Notifications)
  methods in `@liveblocks/client` API reference.
- Add info on
  [typing thread metadata](https://liveblocks.io/docs/api-reference/liveblocks-react-ui#Typed-metadata)
  to React UI API reference.
- Various small fixes.

## Dashboard

- Add room search functionality in the Rooms tab of a project.
- Include creation dates in the rooms table list.
- Fix number formatting issues for document sizes.
- Implement sorting options by room ID, last connection date, comments count,
  documents size, and creation date.
- Improve date formatting across the dashboard. Now using more human-readable
  relative dates, with absolute dates displayed on hover.
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

- Open the config file by default in the interactive
  [broadcasting events tutorial](https://liveblocks.io/docs/tutorial/react/getting-started/broadcasting-events).

## Website

- Fix changelog images on mobile.

## Contributors

nimeshnayaju, ofoucherot, nvie, marcbouchenoire, dant2021, ctnicholas

# Week 28 (2024-07-12)

## v2.2.2

### `@liveblocks/react-ui`

- Fix missing avatar in `textMention` inbox notifications.
- Fix `textMention` usage (and its props type) when customizing rendering via
  `kinds` on `InboxNotification`.
- Fix broken CSS selector in default styles.

## v2.2.1

### `@liveblocks/yjs`

- Don’t attempt to write Yjs changes if the current user has no write access

## Contributors

jrowny, nvie, marcbouchenoire

# Week 27 (2024-07-05)

## v2.2.0

We are making `resolved` a first-class citizen property on
[threads](https://liveblocks.io/docs/ready-made-features/comments/concepts#Threads),
for more information about this change please read our
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

- Add
  [`useStorageStatus`](https://liveblocks.io/docs/api-reference/liveblocks-react#useStorageStatus)
  information.
- Fix code snippet in
  [Nested data types page](https://liveblocks.io/docs/tutorial/react/getting-started/nesting-data-types)
  of interactive tutorial.

## Website

- New blog post:
  [How Hashnode added collaboration to their text editor to sell to larger organizations](https://liveblocks.io/blog/how-hashnode-added-collaboration-to-their-text-editor-to-sell-to-larger-organizations).

## Contributors

flowflorent, ofoucherot, nvie, marcbouchenoire, nimeshnayaju, ctnicholas,
Teddarific, stevenfabre

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
  [Lexical product page](https://liveblocks.io/docs/ready-made-features/text-editor/lexical)
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
</LiveblocksProvider>;
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
  [Notifications](https://liveblocks.io/docs/ready-made-features/notifications),
  with info on concepts, components, hooks, styling, and email notifications.
- Added product page for
  [Lexical](https://liveblocks.io/docs/ready-made-features/text-editor/lexical)
  summarising all its features.
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
    [Liveblocks Sync Datastore](https://liveblocks.io/sync-datastore)
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
  [Upgrade Guide for 0.17](https://liveblocks.io/docs/platform/upgrading/0.17)
  for instructions.
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
    within our
    [Upgrade Guide](https://liveblocks.io/docs/platform/upgrading/0.17)
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
