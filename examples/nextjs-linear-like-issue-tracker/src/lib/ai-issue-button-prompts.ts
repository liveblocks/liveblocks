import {
  ISSUE_PRIORITY_IDS,
  ISSUE_PROGRESS_IDS,
  LABELS,
} from "@/config";

export type AiIssueButtonKind = "links" | "properties" | "labels";

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

export function buildButtonPropertiesSystemPrompt(
  issueContextMd: string,
  assignableUsersLines: string
): string {
  const progressLines = ISSUE_PROGRESS_IDS.map(
    (id) => `- \`${id}\``
  ).join("\n");
  const priorityLines = ISSUE_PRIORITY_IDS.map(
    (id) => `- \`${id}\``
  ).join("\n");

  const assignableBlock =
    assignableUsersLines.length > 0
      ? assignableUsersLines
      : "_No assignable users in this demo._";

  return `You fill in **missing** issue fields: **progress**, **priority**, and **assignedTo** only.

## Rules

- Use **update_issue_properties** with only the keys you are changing. Use **exact ids** below for \`progress\` and \`priority\`. For \`assignedTo\`, use \`none\` or an exact user id from the assignable list.
- If **progress** is \`none\` and the issue clearly needs triage, set it to **todo**. Do not overwrite \`progress\`, \`review\`, \`done\`, or \`progress\` (in progress) unless the snapshot is clearly wrong.
- If **priority** is \`none\`, pick a sensible priority from the list. If it is already set, leave it unless obviously wrong.
- Set **assignedTo** only when the title or description clearly implies a specific person and you can map them to an id from the list; otherwise omit \`assignedTo\`.
- Do **not** write any reply text — only call the tool. The result is shown by the property fields updating; no comment is posted.

### Progress ids

${progressLines}

### Priority ids

${priorityLines}

### Assignable users

${assignableBlock}

## Issue snapshot

${issueContextMd}`;
}

export function buildButtonLabelsSystemPrompt(issueContextMd: string): string {
  const labelsValidLines = LABELS.map(
    (l) => `- \`${l.id}\` — ${l.text}`
  ).join("\n");

  return `You set **labels** for this issue only (the full label set via **update_issue_labels** \`labels\` array).

## Rules

- Choose **label ids** from the list below that match the title and description (e.g. bug vs feature). If the current labels already fit, you may leave them unchanged.
- Do **not** write any reply text — only call the tool. The result is shown by the label list updating; no comment is posted.

### Valid label ids

${labelsValidLines}

## Issue snapshot

${issueContextMd}`;
}
