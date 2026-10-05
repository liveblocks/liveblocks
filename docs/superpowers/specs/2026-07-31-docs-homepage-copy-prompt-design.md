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
- Copy the result of
  `buildDocsAssistantPrompt(window.location.href, GET_STARTED_PROMPT, document.title || undefined)`.
  This is the exact page-context algorithm used by the existing prompt CTA. If
  browser globals are unavailable, use the unmodified prompt.
- After a successful copy, temporarily replace “Copy prompt” with “Copied!”
  using the prompt CTA's existing animation and timeout.
- If copying fails, show the existing copy-error toast and leave the label as
  “Copy prompt”.
- Respect reduced-motion preferences in both locations.

## Component design

Extract the current copy action from `DocsPromptCta` into a focused client
component named `DocsCopyPromptButton`. The shared component owns clipboard
access, page-context assembly, success state, animation, timeout cleanup, and
error feedback.

`DocsCopyPromptButtonProps` will extend `ButtonProps` while omitting `children`,
`onClick`, `type`, and `loading`, because the component owns those behaviors. It
will add these props:

- `prompt: string`: the prompt to copy.
- `label?: string`: idle label, defaulting to “Copy prompt”.
- `successLabel?: string`: successful label, defaulting to “Copied!”.

Callers may pass visual and accessibility props such as `appearance`, `size`,
`className`, `disabled`, and `aria-*`. The component always renders
`type="button"`. A disabled button remains disabled and performs no copy.

`DocsPromptCta` will use the shared component with `size="sm"` and
`appearance="primary"`. `DocsHomepageHero` will use a discriminated action
union:

```ts
type ActionItem =
  | {
      title: string;
      href: string;
      appearance?: ButtonAppearance;
    }
  | {
      title: string;
      type: "copy-get-started-prompt";
      appearance?: ButtonAppearance;
    };
```

The copy action renders `DocsCopyPromptButton` with its title as the idle label,
`GET_STARTED_PROMPT` as the prompt, and no explicit `size` or `appearance`.
Those omitted values preserve the former “Browse examples” button's medium,
secondary Button defaults. The prompt remains in website code rather than being
duplicated in MDX.

The hero remains a server component. Only the shared copy button is a client
component.

## Files and integration

- `liveblocks.io`: add the shared copy button, refactor `DocsPromptCta`, and add
  a copy-prompt action to `DocsHomepageHero`.
- `liveblocks`: replace the Docs homepage hero's examples action with the new
  copy-prompt action in `docs/pages/index.mdx`.
- Do not change API reference pages or the Get started page's existing prompt
  CTA text.
- Merge and deploy the backwards-compatible `liveblocks.io` component support
  before merging the Docs MDX change, so the new action is never rendered by an
  older hero implementation that expects every action to have an `href`.

## Verification

- Format and lint the changed website components.
- Run the website TypeScript check with the Docs repository configured.
- Format the changed MDX and validate Docs navigation.
- Confirm from the rendered component props that the homepage action omits
  `size` and `appearance`, while the prompt CTA passes `size="sm"` and
  `appearance="primary"`.
- Confirm the copy handler supplies the current URL, shared prompt, and current
  document title to `buildDocsAssistantPrompt`.
- Confirm a successful copy changes the label to “Copied!” for 2.5 seconds;
  another successful click resets that timeout; unmount clears the timeout.
- Confirm a failed copy creates the existing “Couldn’t copy prompt to clipboard”
  toast and does not enter the successful state.
- Confirm reduced-motion users receive the existing opacity-only label
  transition and other users receive the existing vertical label transition.
- No component-test infrastructure exists in `liveblocks.io`; do not introduce a
  new framework for this isolated refactor. Verify these unchanged behaviors by
  retaining their existing implementation in the extracted component, plus
  TypeScript, lint, formatting, and focused source inspection.
- Preserve unrelated uncommitted changes in both repositories.
