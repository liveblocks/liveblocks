<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Multiplayer Markdown Editor with Version History

<p>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
  <img src="https://img.shields.io/badge/yjs-message?style=flat&color=0bd" alt="Yjs" />
  <img src="https://img.shields.io/badge/monaco-message?style=flat&color=627" alt="Monaco" />
  <img src="https://img.shields.io/badge/next--auth-message?style=flat&color=000" alt="NextAuth" />
</p>

A full multi-document markdown app that combines Liveblocks, Yjs, Monaco and
NextAuth (GitHub) to give every document its own in-line version history.

## What's interesting in this example

- **GitHub sign-in.** Users sign in with their GitHub account. Each user only
  sees and edits their own documents. The Liveblocks auth endpoint only grants
  access to rooms namespaced under the signed-in user's id.
- **Each document is a Liveblocks room.** The dashboard lists the user's rooms
  via `liveblocks.getRooms({ query: { roomId: { startsWith: "..." } } })`.
- **Each version is a `Y.Text` inside the room.** Inside every room we keep:
  - `yDoc.getArray<VersionInfo>("versions")` — the ordered version metadata.
  - `yDoc.getText("text:<versionId>")` — the markdown contents for that version.

  See [`src/lib/yjs-versions.ts`](src/lib/yjs-versions.ts).
- **Smooth horizontal carousel.** The editor view shows two panels at a time:
  the left one is a Monaco DiffEditor (or a rendered markdown preview), the
  right one is a live Monaco editor bound to the current version's `Y.Text`.
  When you create a new version the current editor smoothly slides into the
  left-hand diff position and a fresh editor slides in on the right.
- **Virtualized 3-panel layout.** Only 3 Monaco panels are mounted at a time
  (more during an animation step). Visit
  [`EditorCarousel.tsx`](src/app/docs/[docId]/EditorCarousel.tsx) to see how the
  "tape" of versions is positioned and animated.
- **Duplicate any version.** Select an old version in the left sidebar, hit
  *Duplicate version* and a new latest version is appended whose contents are a
  copy of the one you selected.

## How the pieces fit together

```
GitHub OAuth (next-auth)
        │
        ▼
auth/manager.ts ──▶ session.user.githubId
        │
        ├──▶ middleware.ts (gates everything except /signin and /api/*)
        │
        ├──▶ /api/liveblocks-auth — session.allow(`...:<ownerId>:*`)
        │
        └──▶ /docs server actions (createDoc, listMyDocs, deleteDoc, …)
                       │
                       └──▶ liveblocks.getRooms({ query: { roomId } })

Each room id: `liveblocks:examples:nextjs-yjs-markdown-versions:<ownerId>:<docId>`

Inside each room (Y.Doc):
  versions: Y.Array<{ id, createdAt, label? }>   ← ordered, last = current
  text:<id>: Y.Text                              ← one per version
```

## Getting started

You need a GitHub OAuth app and a Liveblocks project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Liveblocks project on
   [liveblocks.io](https://liveblocks.io/dashboard) and copy your **secret**
   key.

3. Create a GitHub OAuth app
   ([github.com/settings/developers](https://github.com/settings/developers))
   with these settings:

   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

4. Copy `.env.example` to `.env.local` and fill in:

   ```
   LIVEBLOCKS_SECRET_KEY=sk_dev_...
   AUTH_SECRET=$(openssl rand -base64 32)
   AUTH_GITHUB_ID=...
   AUTH_GITHUB_SECRET=...
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000), sign in with GitHub,
   and create your first markdown document.

## File map

- `src/auth/` — NextAuth (v5) configuration with the GitHub provider.
- `src/middleware.ts` — Forces sign-in on every non-API, non-signin route.
- `src/app/api/liveblocks-auth/route.ts` — Issues Liveblocks access tokens
  scoped to the signed-in user.
- `src/app/docs/actions.ts` — Server actions for creating/listing/deleting
  documents. Talks to `@liveblocks/node`.
- `src/app/docs/page.tsx` — Dashboard listing the user's docs.
- `src/app/docs/[docId]/DocumentEditor.tsx` — The editor view shell and
  toolbar.
- `src/app/docs/[docId]/EditorCarousel.tsx` — The 3-panel virtualized
  carousel.
- `src/app/docs/[docId]/{Editor,Diff,Preview}Panel.tsx` — The three panel
  types.
- `src/lib/yjs-versions.ts` — `Y.Doc` helpers for the versions array and the
  per-version `Y.Text`s.

## Related

- [Liveblocks get started: Yjs + Monaco + React](https://liveblocks.io/docs/get-started/yjs-monaco-react)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Yjs documentation](https://docs.yjs.dev)
