# nextjs-interior-design

A gallery example: a collaborative interior design app, with a multiplayer floor
plan editor built with Liveblocks Storage, Presence, and Next.js. It depends on
the published `@liveblocks/*` packages and uses plain `npm`.

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

Where ui-sdk is used:

- `components/ui/` wraps its components (buttons, tooltips, menu, dialog,
  toggles, number input, autocomplete) with this example's styles.
- `components/canvas/floor-plan.ts` is a primitive of its own, made with
  `definePrimitive`: it pans and zooms the plan with `createViewport`.
- `components/canvas/canvas.tsx` and `components/library.tsx` follow the pointer
  with `bindDrag` for everything that's dragged.
- `components/canvas/use-plan-shortcuts.ts` binds the keys with `useShortcut`.

The versions of `@ui-sdk/react` and `@ui-sdk/core` are pinned: ui-sdk is in
beta, and its canvas behaviors are marked experimental.
