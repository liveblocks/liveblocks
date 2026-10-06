export type AiIssueButtonKind = "links" | "properties" | "labels";

// Only the "links" button is prompt-driven (Claude). The "properties" and
// "labels" buttons ask Jev typed questions instead; see ai-issue-button-jev.ts.
export function buildButtonLinksSystemPrompt(issueContextMd: string): string {
  return `You help collaborators by adding **relevant external links** to an issue’s Links sidebar only.

## Rules

- Use **append_issue_links** with plain \`https://…\` URLs only. Duplicates are skipped server-side; the list is capped at 30 links total.
- Read the issue snapshot below. Prefer documentation, specs, standards, or clearly related references implied by the title or description. Do **not** add URLs that are already listed under Links.
- Add a small, sensible set of links (typically 1–5) unless the issue clearly needs more.
- Do **not** write any reply text — only call the tool. The result is shown by the Links sidebar updating; no comment is posted.

## Issue snapshot

${issueContextMd}`;
}
