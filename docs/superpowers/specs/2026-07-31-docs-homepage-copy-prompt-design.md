# Docs homepage copy prompt button

## Goal

Replace the Docs homepage hero's “Browse examples” link with a button that
copies the same Get started prompt used by the prompt CTA on the Docs homepage
and Get started page.

## Behavior

- Keep the hero's existing “Get started” primary link unchanged.
- Replace “Browse examples” with “Copy prompt”.
- Preserve the replaced button's default medium size, rounded shape, and
  secondary appearance.
- Copy `GET_STARTED_PROMPT` with the same page context added by the existing
  prompt CTA.
- After a successful copy, temporarily replace “Copy prompt” with “Copied!”
  using the prompt CTA's existing animation and timeout.
- If copying fails, show the existing copy-error toast and leave the label as
  “Copy prompt”.
- Respect reduced-motion preferences in both locations.

## Component design

Extract the current copy action from `DocsPromptCta` into a focused client
component. The shared component owns clipboard access, page-context assembly,
success state, animation, timeout cleanup, and error feedback. Its public props
accept the prompt, labels, and normal `Button` presentation props so each caller
retains its existing visual treatment.

`DocsPromptCta` will use the shared component with `size="sm"` and
`appearance="primary"`. A new hero action variant will render the shared
component with the Button defaults, preserving the former “Browse examples”
button's appearance. The hero action will reference `GET_STARTED_PROMPT`
directly from the website code rather than duplicating the prompt in MDX.

The hero remains a server component. Only the shared copy button is a client
component.

## Files and integration

- `liveblocks.io`: add the shared copy button, refactor `DocsPromptCta`, and add
  a copy-prompt action to `DocsHomepageHero`.
- `liveblocks`: replace the Docs homepage hero's examples action with the new
  copy-prompt action in `docs/pages/index.mdx`.
- Do not change API reference pages or the Get started page's existing prompt
  CTA text.

## Verification

- Format and lint the changed website components.
- Run the website TypeScript check with the Docs repository configured.
- Format the changed MDX and validate Docs navigation.
- Confirm the homepage action keeps the default medium secondary Button props
  while the prompt CTA keeps its small primary props.
- Preserve unrelated uncommitted changes in both repositories.
