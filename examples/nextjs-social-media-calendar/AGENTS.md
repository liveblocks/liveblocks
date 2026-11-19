# nextjs-social-media-calendar

A gallery example: a collaborative social media content calendar built with
Liveblocks Storage, LiveText, Tiptap, and Next.js. It depends on the published
`@liveblocks/*` packages and uses plain `npm`.

## ui-sdk

The interface is built with [ui-sdk](https://ui-sdk.dev) (`@ui-sdk/react` and
`@ui-sdk/core`). Before using ui-sdk:

- Follow the `ui-sdk` skill if it's installed
  (`.agents/skills/ui-sdk/SKILL.md`).
- Read `node_modules/@ui-sdk/react/docs/llms.txt`, then only the component pages
  the task needs (`node_modules/@ui-sdk/react/docs/components/*.md`).

To build a new component or behavior ui-sdk doesn't ship, also search
`node_modules/@ui-sdk/react/docs/core.md` by heading (it's large; don't read it
top to bottom), and read `rendering.md` next to it.

Import components from their own entries (`@ui-sdk/react/button`, not a package
root), style them from `data-slot` and state attributes, and keep
`@layer ui-sdk;` at the top of `app/globals.css`.
