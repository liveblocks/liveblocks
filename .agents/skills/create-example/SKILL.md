---
name: create-example
description:
  Create a new Liveblocks example app for the gallery under examples/. Use when
  asked to build a new example, demo, or showcase app, or when restructuring an
  existing example. Covers scaffolding, gallery conventions (exampleId,
  examplePreview, database.ts, HelpButton), providers configuration, AI
  patterns, styling, local testing against the dev server, and READMEs.
---

# Creating a Liveblocks example

## Ground rules

- Examples live in `examples/` and are NOT part of the pnpm workspace. They
  depend on the latest _published_ Liveblocks packages, use plain `npm`
  (commit `package-lock.json`), and cannot be tested against local package
  source.
- Start by copying the closest existing example and adapting it. Good bases:
  - `nextjs-ai-slideshow` — AI chat + document layout, Tailwind v4 + shadcn
    UI kit, AI Elements components, `database.ts`, help button.
  - `nextjs-ai-elements-realtime` — multiplayer AI chat on Feeds with
    streamed replies written server-side via `@liveblocks/node`.
  - `nextjs-comments-notifications` — gallery param helpers
    (`example.ts` / `example.client.ts`).
  - `nextjs-comments-ai` — AI replies to comments (webhook + workflow).
- Verify features against the _published_ package (e.g. check typings on
  unpkg), not the local monorepo source — they can differ. When an example
  relies on an experimental release (e.g. `3.23.0-exp2`), pin `@liveblocks/*`
  to that exact version; use caret ranges (`^3.21.0`) for stable releases.
  Every `@liveblocks/*` package must use the same version.

## Required boilerplate (gallery conventions)

Every example needs these, copied and adapted from an existing example:

- **Room id**: `liveblocks:examples:<example-name>` (append `:<subid>` for
  multi-room examples). The auth route allows
  `session.allow("liveblocks:examples:*", ["*:write"])`.
- **Gallery URL params** (used when the example is embedded on liveblocks.io;
  harmless locally):
  - `exampleId` — isolates a gallery session: append `-${exampleId}` to the
    room id (and to user ids where user identity must be isolated).
  - `examplePreview` — a number identifying the preview pane; use it to pick
    a distinct demo user per pane: `users[examplePreview % users.length]`.
  - Use the `useExampleRoomId` hook pattern (or `example.ts` +
    `example.client.ts` from `nextjs-comments-notifications` when you also
    need `examplePreview`), with the standard "used when deploying an example
    on liveblocks.io, ignore locally" comment.
- **`app/database.ts`** (as in `nextjs-ai-slideshow`): a hardcoded mock user
  database typed as `Liveblocks["UserMeta"][]`, avatars from
  `https://liveblocks.io/avatars/avatar-N.png`, `getUser`/`getUsers`/
  `getRandomUser` helpers. For AI examples add `AI_USER_ID = "ai-assistant"`
  with the `https://liveblocks.io/api/avatar?u=ai-assistant&agent=true`
  avatar.
- **Auth**: `/api/liveblocks-auth` route using the secret key. The client
  picks a demo user (random, or via `examplePreview`) and POSTs
  `{ room, userId }` to the route via an `authEndpoint` function — there is
  no `exampleUser` param; user identity always flows through this `userId`.
- **Providers** (see `nextjs-ai-slideshow/app/providers.tsx`):
  - `throttle={16}`
  - `authEndpoint` as described above
  - `resolveUsers` → `/api/users?userIds=...`
  - `resolveMentionSuggestions` → `/api/users/search?text=...`
  - both API routes backed by `database.ts`
- **Help button** (as in `nextjs-ai-slideshow/components/help-button.tsx`): a
  small `?` button opening a dialog with the example name (linking to its
  gallery page `https://liveblocks.io/examples/<slug>/<example-name>`) and
  3-4 short feature descriptions explaining what the example does and how to
  try the multiplayer behavior (e.g. "open in two tabs").
- **`liveblocks.config.ts`**: declare all types globally (`UserMeta`,
  `Presence`, `Storage`, `FeedMessageData`, …) with brief comments.
- **`.env.example`**: `LIVEBLOCKS_SECRET_KEY` (with dashboard link) plus any
  optional keys (e.g. `AI_GATEWAY_API_KEY`) documented with their fallback
  behavior.
- **`README.md`**: copy the house template — Liveblocks header SVGs, badges,
  one-paragraph description with docs links,
  `npx create-liveblocks-app@latest --example <name> --api-key`, collapsed
  "Manual setup" / "Deploy on Vercel" / "CodeSandbox" sections.
- **`vercel.json`**, **`next.config.ts`** (with the monorepo-root turbopack
  setting), **`package.json`** `name` (`@liveblocks-examples/<name>`) and
  `description` — copy from the base example.

## Styling

- Tailwind v4 (`@tailwindcss/postcss`) + shadcn-style components. Style after
  `nextjs-ai-slideshow` unless told otherwise: `h-dvh` shell on
  `bg-neutral-50`, rounded white panels (`rounded-lg bg-white shadow ring-1
  ring-neutral-950/5`), a fixed-width (~380px) right panel for chat-style
  UIs, `lucide-react` icons, `AvatarStack` in the header.
- Tailwind v4 gates `hover:` behind `@media (hover: hover)`; if hover-only
  controls must also work with touch/synthetic pointers, add
  `@custom-variant hover (&:hover);` in `globals.css`.
- Tailwind preflight resets typography — rich-text editors need explicit CSS
  for headings, lists, quotes, and code in `globals.css`.

## AI examples

- Always ship a keyless mock fallback: without `AI_GATEWAY_API_KEY`, stream a
  canned reply through the same code path (e.g. `updateFeedMessage` loop) and
  still perform any real side effects (document edits, reactions) so the
  whole loop works with only a Liveblocks key.
- Stream AI replies server-side with `@liveblocks/node`
  (`createFeedMessage` + repeated `updateFeedMessage`); clients see them live
  via `useFeedMessages`. Throttle updates (~100ms) while streaming.
- Give models Markdown interfaces (in prompts and tool inputs), not raw
  ProseMirror/JSON. Convert server-side (`marked` + `generateJSON` from
  `@tiptap/html`, or `markdownToCommentBody` from `@liveblocks/node`).
- When the AI edits shared state, prefer targeted, merge-friendly writes over
  whole-document replaces (e.g. `mutateStorage` with ops scoped to the blocks
  being changed) so concurrent human edits survive.
- For examples with comments, add AI comment replies like
  `nextjs-comments-ai`: a `commentCreated` webhook
  (`LIVEBLOCKS_WEBHOOK_SECRET_KEY`) starts a Workflow SDK workflow that
  replies only when the AI user is @-mentioned — it leaves a 👀 reaction,
  shows AI presence, creates a placeholder comment plus a feed, and streams
  the reply into the feed.

## Local testing (keep it light)

- Do NOT create screen recordings or screenshots, and skip browser-driven
  manual testing. Verify with `npx tsc --noEmit`, a running dev server, and
  terminal-level checks (curl against API routes, small scripts). Deep
  end-to-end testing is not expected for examples.
- To run against the local dev server (`pnpm dlx liveblocks dev --port
  1153`), put in `.env.local`: `LIVEBLOCKS_SECRET_KEY=sk_localdev` and, if
  the example supports it, `LIVEBLOCKS_BASE_URL` /
  `NEXT_PUBLIC_LIVEBLOCKS_BASE_URL` set to `http://localhost:1153`. Passing
  `baseUrl` through `LiveblocksProvider` and `new Liveblocks({...})` from
  these env vars is acceptable in committed code (with a comment) — it's
  inert in production.
- Known dev-server limitations (don't mistake these for app bugs):
  - REST feed endpoints and client thread endpoints are stubs — server-side
    `createFeedMessage`/`updateFeedMessage` no-op and comments don't
    persist. Websocket-driven client features work.
  - Version history endpoints are unimplemented.
  - Rooms must exist before `mutateStorage` (404 otherwise).
  - Storage is in-memory: everything resets on dev-server restart.
  - Newer experimental storage types may be rejected by its decoders
    (silently, as 4xx on `send-message`) — check the dev-server log.
  - Features that only exist on the production backend need a cloud key to
    verify; say so in your report instead of building elaborate workarounds.

## Thumbnails, social cards, and publishing PRs

Every example needs two Figma images, created after the example code is
complete, then used in two PRs. IMPORTANT: always pause after creating the
images — link both Figma nodes to the human and wait for approval (they
usually make final edits by hand). Only export and open PRs once approved.

The images are made with the official Figma MCP server. If it isn't
available in your environment, let the user know they can set it up if they
want help with the images — this step is optional (you can skip it and they
can make the images themselves), but doing it via the MCP is preferred.

### 1. Gallery thumbnail (Figma)

- File: [Examples thumbnails](https://www.figma.com/design/Qcr7GAO1zTm6lAdYrFsMRx/Examples-thumbnails),
  page "🆗  Version 3.0" (node `801:8644`).
- Layout: one master component per example (1072×714, named by the example
  slug, no `nextjs-` prefix), plus "Website thumbnails" and "Github
  thumbnails" columns holding plain instances of the masters.
- Workflow: clone the newest master (bottom of the masters column), rename it
  to the new slug, place it one row below (row spacing 825), rework the
  content to depict the new example, then `createInstance()` twice and place
  the instances in the two instance columns at the same row offset.
- Match the style vocabulary, don't invent: placeholder pills are black at
  10% opacity with cornerRadius 16 (toolbar icons 4); panels are no-fill with
  a 1px black-8% stroke, radius 8; the purple accent is `rgb(144, 99, 246)`;
  the white app card and drop shadow come free with the clone. Placeholder
  paragraph lines should wrap naturally (full lines first, short line last).

### 2. Social card (Figma)

- File: [Social Images Thumbnails](https://www.figma.com/design/rslApB7BFH57mPfa2k6xUV/Social-Images-Thumbnails)
  (page node `1343:2040`).
- Cards are 1200×630 frames named `examples/<slug>` in a column at x=9100,
  row spacing 730. Clone the newest one, rename, place below.
- The big title is a `heading` TEXT component property on the
  `templates/examples` instance; small mock UI text is regular text nodes.

### Figma font gotcha

The brand font (Suisse Intl) is licensed and unavailable in the Figma MCP
plugin environment: `loadFontAsync` fails, so `characters` edits and
`setProperties` on text properties throw. Workaround: create replacement
text nodes in Inter Medium, copying fontSize / lineHeight / letterSpacing /
fills / position from the original, then remove the original (or hide it and
overlay, for text inside instances, e.g. the social card title). Tell the
human which nodes are Inter so they can flip the family back to Suisse Intl.

### 3. After approval: example README image (liveblocks/liveblocks)

- Export the thumbnail component at 1x (1072×714) as PNG and commit it to
  `.github/assets/examples/<slug>.png` on the example PR branch.
- Embed it in the example README below the badges block:

  ```html
  <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/<slug>.png" width="536" alt="<Example title>" />
  ```

### 4. After approval: website PR (liveblocks/liveblocks.io)

Model it on [liveblocks.io#3307](https://github.com/liveblocks/liveblocks.io/pull/3307)
— three files, one short PR body linking the example PR:

- `public/images/examples/thumbnails/<slug>.jpg` — thumbnail export,
  1072×714 JPG.
- `public/images/social-images/examples/<slug>.png` — social card export,
  1200×630 PNG.
- `src/constants/examples.ts` — add an `EXAMPLES_INDEX` entry next to
  similar examples: title, slug, `categories` / `products` /
  `useCaseTechnologies` / `documentStorage` enums, `featured`, `image` and
  `socialImage` set to the two paths above, and a `technologies` array with
  the example `directory`, `previewUrl`
  (`https://<directory>.liveblocks.app`), preview options, `defaultFile`,
  `environmentVariables` (secret key) and extras like `AI_GATEWAY_API_KEY`
  in `additionalEnvironmentVariables`.

### 5. When everything is done: tell the human their next steps

Once the example, images, and both PRs are complete, finish by telling the
human what they need to do to deploy (these are manual steps for them, not
for the agent):

1. Merge the example PR (liveblocks/liveblocks).
2. Merge `main` into the `examples` branch.
3. Run the [Set up Vercel example](https://github.com/liveblocks/liveblocks/actions/workflows/setup-vercel-example.yml)
   workflow with the example's folder name (e.g. `nextjs-tiptap-ai-chat`) —
   this creates the `https://<folder-name>.liveblocks.app` deployment that
   the website PR's `previewUrl` points at.

## Publishing notes

- Gallery registration happens in the liveblocks.io repo (see above); the
  example folder + house-format README is all that's needed in this repo.
- Examples are downloaded verbatim by `create-liveblocks-app` — don't commit
  scratch scripts, `.env.local`, or test artifacts into the example folder.
