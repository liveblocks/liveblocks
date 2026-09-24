// Tool call payloads from the Cursor SDK are not a stable schema, so this
// module only reads a few well-known fields defensively and turns each call
// into a short label that can be rendered in the chat.

const PATH_KEYS = [
  "path",
  "target_file",
  "file_path",
  "relative_workspace_path",
  "directory",
  "target_directory",
];

const TEXT_KEYS = ["command", "pattern", "query", "glob_pattern", "url"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstString(
  record: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function truncate(text: string, max = 120) {
  const singleLine = text.replace(/\s+/g, " ").trim();
  return singleLine.length > max
    ? `${singleLine.slice(0, max - 1)}…`
    : singleLine;
}

/**
 * Human-readable one-liner for a tool call, e.g. `read README.md` or
 * `shell pnpm test`. Falls back to the tool name alone.
 */
export function summarizeToolCall(name: string, args: unknown): string {
  if (!isRecord(args)) {
    return "";
  }

  const path = firstString(args, PATH_KEYS);
  if (path) {
    return truncate(path);
  }

  const text = firstString(args, TEXT_KEYS);
  if (text) {
    return truncate(text);
  }

  // Edits usually carry a list of files or a single file
  const files = args.files;
  if (Array.isArray(files)) {
    const names = files
      .map((file) =>
        isRecord(file) ? firstString(file, PATH_KEYS) : undefined
      )
      .filter((file): file is string => Boolean(file));
    if (names.length) {
      return truncate(names.join(", "));
    }
  }

  if (typeof args.description === "string") {
    return truncate(args.description);
  }

  return "";
}

/** Normalizes tool names from the SDK to a small set the UI knows how to render. */
export function normalizeToolName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("read")) return "read";
  if (
    lower.includes("edit") ||
    lower.includes("write") ||
    lower.includes("apply")
  )
    return "edit";
  if (lower.includes("delete")) return "delete";
  if (
    lower.includes("shell") ||
    lower.includes("terminal") ||
    lower.includes("command")
  )
    return "shell";
  if (
    lower.includes("grep") ||
    lower.includes("search") ||
    lower.includes("glob")
  )
    return "search";
  if (lower.includes("ls") || lower.includes("list")) return "list";
  if (lower.includes("todo") || lower.includes("plan")) return "plan";
  if (lower.includes("web") || lower.includes("fetch")) return "web";
  return "tool";
}
