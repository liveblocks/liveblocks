---
name: write-docs
description:
  Write and review Liveblocks documentation, API reference, guides, and
  quickstarts. Use when editing files under docs/, documenting a new Liveblocks
  feature, updating API reference pages, adding docs routes, or reviewing
  documentation for clarity, discoverability, and consistency.
---

# Liveblocks Docs

## Quick Start

Before writing, inspect nearby docs and copy their structure.

```bash
rg --files docs/pages
sed -n '1,180p' docs/pages/api-reference/liveblocks-react.mdx
sed -n '1,180p' docs/pages/collaboration-features/comments/users-and-mentions.mdx
```

Then write the smallest docs update that makes the feature findable from the
places users are likely to look.

## Workflow

1. Identify the docs surface:
   - API reference: every new public API, prop, option, return value, or type.
   - Ready-made feature pages: user-facing workflows and common combinations.
   - Guides: task-specific docs under `guides/pages`, registered in
     `guides/guides.json`.
   - Platform pages: dashboard, account, project, webhook, REST, limits, or
     infrastructure behavior.
   - Get started pages: only when the setup flow changes or a feature should be
     part of onboarding.
   - Interactive tutorials: step-by-step learning content under `tutorial`,
     registered in `tutorial/tutorials.json`.

2. Decide the release size:
   - Large features need API docs, a prominent feature page, and updates across
     every relevant docs surface.
   - Medium and small features need API docs plus every relevant usage page.
   - Tiny features can usually live in one API reference section.
   - Features spanning client, server, dashboard, webhooks, or packages need one
     single overview or guide that ties the pieces together.

3. Repeat intentionally:
   - Do not assume users read the overview first.
   - Mention the feature in each relevant API reference and feature page.
   - Link each mention to the canonical page or section.
   - Check: "Can I link to one place that explains this feature?"

4. Match the existing page:
   - Keep existing frontmatter shape.
   - Use the same heading depth and anchor style, such as
     `### Name [#custom-anchor]`.
   - Use existing MDX components such as `PropertiesList`, `Banner`, `Figure`,
     `Steps`, `StepCompact`, and `ListGrid`.
   - Register new docs pages in `docs/routes.json`, guides in
     `guides/guides.json`, and interactive tutorials in
     `tutorial/tutorials.json`.

5. Verify:
   - Inspect changed MDX for broken links, malformed JSX, heading hierarchy, and
     route or guide registration.

## Style Rules

- Write simply, neutrally, and directly. Avoid marketing language.
- Start each section with the simplest useful snippet, then add optional
  behavior in later subsections.
- Pick strong defaults instead of presenting equivalent options for the user to
  choose between.
- Optimize for skimming with clear headings, short paragraphs, and code
  comments.
- Link API names, components, hooks, and related concepts whenever mentioned.
- Include limits, pagination, loading states, error states, and permissions
  where relevant.
- Prefer Suspense imports in React snippets unless the surrounding page uses
  regular hooks.
- Keep snippets realistic but compact, with placeholders like `// ...` for
  unrelated app code.
- Use public package names in docs prose, avoid presenting `@liveblocks/core` as
  user-facing.

## More Detail

See [REFERENCE.md](REFERENCE.md) for placement rules, API reference structure,
MDX conventions, and review checklists.
