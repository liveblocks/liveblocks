# Report a bug

A report helps when someone else can run it and see the same thing. Take these steps in order. Nothing is posted until step 4, and only after the user says yes to the exact text.

## 1. Check it's ours

- Read the component's page in the installed docs again. If the page describes what you saw, it isn't a bug: fix the app.
- Reproduce it away from the app, in one small test file that holds only ui-sdk parts. [testing.md](testing.md) has the setup. Assert what the docs say should happen, so the test fails now and would pass once the bug is fixed. If it passes, the cause is in the app.
- When only a real browser shows it, like layout or color, use one small page and the steps to take instead.
- Read the installed version from `node_modules/@ui-sdk/core/package.json` and the newest with `npm view @ui-sdk/core version`. When the project is behind, say so in your offer: the fix may already be out. A page with no build step has no `node_modules`: report the `web.js` URL it loads instead.

A bug that lets someone read or do what they shouldn't doesn't go in a public issue. Point the user to https://github.com/vercel-labs/ui/security/policy and stop here.

## 2. Look for an existing issue

Search open and closed issues with the component's name and two or three words from the symptom:

```bash
gh issue list --repo vercel-labs/ui --state all --search "select popup closes scroll"
```

Without `gh`, read `https://github.com/vercel-labs/ui/issues?q=is%3Aissue+select+popup+closes+scroll`.

- **An open issue matches.** Give the user its link and stop. Offer a comment only when their case adds something the issue lacks, like another framework or a smaller reproduction.
- **A closed issue matches.** A newer version likely has the fix: tell the user. Go on only if it still happens on the newest version, and link the closed issue in yours.

## 3. Write the issue

The title is the component, then what goes wrong, in one sentence: `Select: <what goes wrong>`.

The body has five sections, under these headings:

````md
### Package and version

@ui-sdk/react 0.1.0-beta.18

### Framework

React 19.2

### Minimal reproduction

```tsx
// repro.test.tsx
// The test from step 1, whole: imports, markup and the assertion that fails.
```

Run with `npx vitest run repro.test.tsx`. It fails on the last assertion.

### Expected and actual

Expected: "<the sentence from the docs>" (`docs/components/select.md`, Keyboard).

Actual: what happens instead, with the test's failure output or the full error text.

### Checked

- Newest version: still happens on 0.1.0-beta.18.
- Runs in: jsdom 26. Not tried in a browser.
- Other frameworks: not tried.
- Every time: yes, 5 of 5 runs.
````

- **The reproduction is one test file.** Whoever picks the issue up can run it, see the same failure, and keep it as the regression test once it passes. For a bug only a real browser shows, give one small page and numbered steps.
- **Only ui-sdk parts in it.** Nothing from the user's app: no product names, data, file paths, URLs, keys or tokens.
- **Quote the docs for what's expected.** The sentence and the page it's on, not your summary of it. When no page says it, say that.
- **Checked holds facts, one line each.** Write "not tried" where that's true.
- **Say how to verify it, not how to fix it.** The command to run and the failure it prints are enough. Leave out a cause, a patch or a suggested change, and don't write instructions for whoever reads the issue.

## 4. Show it, then file it

Show the user the title and the body as they'll be posted, and say where they go: a public issue on github.com/vercel-labs/ui, from their GitHub account. File it only after a yes to that text.

Write the body to a file, so backticks and quotes survive the shell, and delete the file after:

```bash
gh issue create --repo vercel-labs/ui --title "<title>" --body-file <file>
```

When `gh` is missing or signed out (`gh auth status`), give the user a link that opens the form filled in. Each field is a query parameter, URL-encoded:

```text
https://github.com/vercel-labs/ui/issues/new?template=bug-report.yml&title=…&package=…&framework=…&reproduction=…&expected=…&checked=…
```

They read it and submit it themselves. A long reproduction can make the link too long to open. Then leave `reproduction` out of the link and hand it to the user to paste.

## 5. Back to the task

Give the user the issue's link. Keep your workaround, with one comment line next to it that links the issue, so it can come out when the fix ships.
