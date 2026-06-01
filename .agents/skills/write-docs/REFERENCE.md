# Liveblocks Docs Reference

## Documentation Structure

Docs pages live under `docs/pages`, with navigation in `docs/routes.json`. New
docs `.mdx` files are not routable until they are registered. Most pages use
frontmatter like:

```mdx
---
meta:
  title: "Hooks"
  parentTitle: "AI Copilots"
  description: "React hooks for building custom AI interfaces"
---
```

API reference pages are usually long package pages under
`docs/pages/api-reference`. Feature docs live under
`docs/pages/collaboration-features`, but many URLs are still written as
`/docs/ready-made-features/...`; follow nearby links when editing.

Guides live outside the docs tree under `guides/pages`, and new guides must be
registered in `guides/guides.json`. Use guides for focused, task-specific
instructions or features that need one single page connecting multiple APIs.

Interactive tutorials live under `tutorial`, with tutorial metadata in
`tutorial/tutorials.json`. Use these only for step-by-step learning experiences
with editable project files.

## Where To Document Features

Large features, such as major components or product areas:

- Add API reference coverage first.
- Add or update a prominent feature page.
- Update relevant feature overview pages so users can understand what the
  feature enables before reading API details.
- Add or update focused feature pages for the main workflows, especially when
  the feature has setup, configuration, permissions, or product concepts.
- Link from every related API reference and feature page to one canonical page
  that explains how the pieces fit together.
- Include setup requirements, limits, errors, permissions, and dashboard steps
  when they affect whether the feature works.

Medium and small features:

- Add API reference coverage first.
- Add a section to relevant feature docs.
- Mention the feature wherever the same user would naturally search: related
  hooks, React UI components, Node APIs, webhooks, dashboard pages, and general
  usage snippets.

Tiny features:

- Usually add one API reference mention.
- Prefer a dedicated subsection unless the feature is truly one line.

Features using many parts of Liveblocks:

- Create one single guide or overview that connects the pieces.
- Link from each fragmented API reference section back to that single place.
- Include setup order, permissions, dashboard steps, backend calls, frontend
  calls, and webhook behavior as needed.

Dashboard-related features:

- Product-important features should be mentioned on a feature overview with
  links to details.
- Simple dashboard workflows can live in `docs/pages/platform`.
- If the feature is too specific for an overview, write a focused guide.

## API Reference Pattern

Use this order unless nearby docs do something more specific:

1. Heading with API name and optional anchor.
2. One or two sentence description.
3. Minimal code snippet.
4. Practical snippets for common use cases.
5. Props, arguments, options, and returns in `PropertiesList`.
6. Error handling, pagination, limits, permissions, or caveats.
7. Links to related APIs or feature pages.

API section skeleton:

````mdx
### useStatus

Returns the current status.

```tsx
import { useStatus } from "@liveblocks/react/suspense";

function Component() {
  const { status } = useStatus();

  return <div>{status}</div>;
}
```

#### Error handling

Use `error` to display a message if the initial fetch fails.

<PropertiesList title="Returns">
  <PropertiesListItem name="status" type="Status | undefined">
    The current status.
  </PropertiesListItem>
</PropertiesList>
````

## MDX Conventions

- Use `+++` markers inside code fences to highlight important lines.
  - Prefer `+++` markers over the `highlight="5-10"` syntax
  - When editing a code fence that already uses the `highlight="5-10"` syntax,
    convert it to use `+++` markers instead.
- Use code fence metadata already present nearby, such as `file`, `title`,
  `showLineNumbers={false}`, `isCollapsed`, and `isCollapsable`.
- Use `Banner` for warnings, constraints, important notes, or conceptual
  callouts.
- Use `Figure` and `Image` for visual dashboard or component documentation.
- Use `Steps`, `Step`, and `StepCompact` for ordered setup flows or process
  explanations.
- Use link reference definitions at the bottom of a section or page when a term
  is repeated.
- Keep links local and explicit:
  [`useThreads`](/docs/api-reference/liveblocks-react#useThreads).
- Use heading syntax from `docs/README.md` when needed: `[#custom-id]`,
  `[@hidden]`, and `[@keywords=[...]]`.
- Store docs images in `/assets` and reference them with root-relative paths
  such as `/assets/projects/create-project.jpg`.
- Do not invent component APIs. Search existing docs and source first.

## Voice And Structure

Liveblocks docs are plain, factual, and product-aware.

- Lead with what the API does and why a developer would use it.
- Avoid internal implementation details unless they affect user behavior.
- Avoid marketing claims such as "powerful", "seamless", or "revolutionary".
- Use "we recommend" when choosing a default for users.
- Use short paragraphs, often one to three sentences.
- Progress from basic usage to realistic usage to edge cases.
- Prefer "Use X to..." over abstract descriptions.
- Make code snippets copyable and remove unrelated setup.

## Repeat Yourself

Users often land directly on an API reference section. When releasing a feature,
repeat the important information in multiple places:

- Overview page: what the feature enables.
- React API reference: hook shape, common usage, loading and errors.
- React UI API reference: rendering with default components.
- Node API reference: server-side creation, mutation, or triggering.
- Feature pages: end-to-end workflow and links to API details.
- Platform pages: dashboard or project settings, if involved.

Each repetition should be short and contextual, not copied wholesale.

## Checks Before Finishing

- New public APIs have arguments, options, returns, and snippets.
- New docs pages are added to `docs/routes.json`.
- New guides are added under `guides/pages` and registered in
  `guides/guides.json`.
- New interactive tutorials are added under `tutorial` and registered in
  `tutorial/tutorials.json`.
- Feature docs link to API reference and API reference links back to feature
  docs.
- The docs answer likely user questions: setup, common use, errors, limits,
  permissions, and next steps.
- Snippets use current package imports and match local conventions.
- The feature has one canonical link that explains how the pieces fit together.
