/**
 * Documents the agent writes for the team. The agent saves them as Markdown
 * files in its artifacts directory; after each run the workflow patches any
 * new or changed file into the Storage-backed Tiptap document the side panel
 * shows, where people can edit it together.
 */

/** On the agent's machine; everything under `/opt/cursor/artifacts` is uploaded */
export const DOCS_ARTIFACT_DIR = "/opt/cursor/artifacts/docs";
/** How Cursor's API lists the same files */
export const DOCS_ARTIFACT_PREFIX = "artifacts/docs/";

/** Storage key for a chat's document */
export function getDocumentKey(feedId: string, slug: string) {
  return `${feedId}:${slug}`;
}

/**
 * `artifacts/docs/Release Plan.md` -> `release-plan`. Null for anything that
 * isn't a Markdown file directly inside the docs directory.
 */
export function slugFromArtifactPath(path: string) {
  if (!path.startsWith(DOCS_ARTIFACT_PREFIX) || !path.endsWith(".md")) {
    return null;
  }
  const name = path.slice(DOCS_ARTIFACT_PREFIX.length, -".md".length);
  if (name.includes("/")) {
    return null;
  }
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

/** First `# Heading` in the markdown, else the slug spelled out */
export function titleFromMarkdown(markdown: string, slug: string) {
  const heading = markdown.match(/^#\s+(.+?)\s*#*\s*$/m);
  const title = heading?.[1].trim();
  if (title) {
    return title;
  }
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The smallest single replacement that turns `before` into `after`, so a
 * changed text run can be applied to a LiveText without rewriting all of it.
 */
export function diffAsReplace(before: string, after: string) {
  if (before === after) {
    return null;
  }
  let start = 0;
  const maxStart = Math.min(before.length, after.length);
  while (start < maxStart && before[start] === after[start]) {
    start++;
  }
  let endBefore = before.length;
  let endAfter = after.length;
  while (
    endBefore > start &&
    endAfter > start &&
    before[endBefore - 1] === after[endAfter - 1]
  ) {
    endBefore--;
    endAfter--;
  }
  return {
    index: start,
    length: endBefore - start,
    text: after.slice(start, endAfter),
  };
}
