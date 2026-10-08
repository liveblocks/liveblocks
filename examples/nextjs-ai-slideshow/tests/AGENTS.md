# Tests: shared setup and e2e rules

This folder holds only shared test infrastructure. Tests live next to their code
in `features/<name>/tests/`, `views/<name>/tests/`, `lib/tests/` and
`components/tests/`.

- `setup.ts`: Vitest setup (jest-dom matchers). Component tests opt into the DOM
  with `// @vitest-environment jsdom` as the first line.
- `e2e-helpers.ts`: Playwright helpers. Always open rooms with
  `uniqueRoomUrl("<spec-name>")` so parallel runs and reruns never share a room,
  and `openSlideshow(page, url)` to wait for the first slide.

## Writing a Playwright spec (`*.spec.ts`)

- Locate by role, label or visible text
  (`getByRole("button", { name: "Add slide" })`); slide iframes by their `title`
  (`iframe[title="Slide preview"]`, `iframe[title$="thumbnail"]`). No
  `data-testid`.
- Content inside a slide iframe is reached through `previewFrame(page)` /
  `thumbnails(page)` from the helpers; assert inside the frame with
  `frameLocator`, not by reading `srcdoc`.
- The code editor is CodeMirror: it virtualises lines, so scroll to the end
  (`ControlOrMeta+End`) before asserting on `.cm-content`.
- Two-user flows open a second `browser.newContext()`; demo users are random, so
  retry opening the context until the avatar `alt` differs if the flow depends
  on distinct users.
- Flows that need Liveblocks Cloud (Feeds, Comments) start with
  `test.skip(!process.env.LIVEBLOCKS_CLOUD, CLOUD_ONLY)` and are listed under
  "Cannot be verified locally" in the root AGENTS.md.
- The suite starts its own server on a free port: `dev:local` with the mock
  assistant by default, or plain `next dev` with the `.env.local` keys when
  `LIVEBLOCKS_CLOUD=1` (which is when the cloud-only specs run). Never assume a
  server on a fixed port.
