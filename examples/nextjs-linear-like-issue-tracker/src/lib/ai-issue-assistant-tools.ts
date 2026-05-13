import { AI_USER_INFO, getUsers } from "@/database";
import { applyIssueDescriptionMarkdown } from "@/lib/apply-issue-description-markdown";
import { appendIssueLinks } from "@/lib/apply-issue-links";
import { applyIssuePropertyUpdates } from "@/lib/apply-issue-property-updates";
import {
  createIssueRoomForAi,
  type CreateIssueRoomOptions,
} from "@/lib/create-issue-room";
import {
  ISSUE_LABEL_IDS,
  ISSUE_PRIORITY_IDS,
  ISSUE_PROGRESS_IDS,
  type IssuePropertyUpdates,
} from "@/lib/issue-storage-enums";
import { fetchRecentIssueRoomsForAi } from "@/lib/search-issue-rooms";
import { getIssueId, getRoomId } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";
import { tool } from "ai";
import { z } from "zod";

/** Max linked issues on an AI reply (comma-separated in comment metadata). */
const MAX_REFERENCED_ISSUES_IN_REPLY = 10;

function mergeReferencedIssueIdsCsv(
  previous: string | undefined,
  additions: string[],
  currentThreadIssueId: string,
  mode: "append" | "prepend"
): string {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const id = raw.trim();
    if (!id || seen.has(id)) {
      return;
    }
    if (id === currentThreadIssueId) {
      return;
    }
    seen.add(id);
    out.push(id);
  };
  if (mode === "prepend") {
    for (const id of additions) {
      push(id);
    }
    if (previous) {
      for (const p of previous.split(",")) {
        push(p);
      }
    }
  } else {
    if (previous) {
      for (const p of previous.split(",")) {
        push(p);
      }
    }
    for (const id of additions) {
      push(id);
    }
  }
  return out.slice(0, MAX_REFERENCED_ISSUES_IN_REPLY).join(",");
}

export type AiIssueAssistantToolRunState = {
  /** Comma-separated issue ids for inline previews (new issue from create_issue is prepended here). */
  referencedIssueIdsCsv?: string;
  editorMarkdownApplied: boolean;
  issuePropertiesUpdated: boolean;
  issueLinksUpdated: boolean;
};

export function createAiIssueAssistantTools(
  roomId: string,
  state: AiIssueAssistantToolRunState
) {
  return {
    create_issue: tool({
      description:
        "Create a new tracked issue. Required: title. Optional: descriptionMarkdown (GFM body — NEVER start with #/##/###; use blank lines between paragraphs / two newlines; title is the title field), labels, links, progress, priority, assignedTo. The new issue’s nanoid is prepended to comment \`referencedIssueIds\` for inline previews—do not pass that same id to link_issues_in_reply in the same reply.",
      inputSchema: z.object({
        title: z
          .string()
          .describe("Concise issue title shown in the issue list"),
        descriptionMarkdown: z
          .string()
          .optional()
          .describe(
            "Body markdown: open with a paragraph, list, or quote — NEVER start with a heading line (# through ######); use the title field for the issue name. Headings allowed deeper in the body after opening text if needed. Between prose paragraphs use a blank line (two newlines), not a single newline."
          ),
        labels: z
          .array(z.enum(ISSUE_LABEL_IDS))
          .optional()
          .describe(
            "Initial labels for the new issue (full set). Omit for none."
          ),
        links: z
          .array(z.string().min(1).max(4000))
          .max(30)
          .optional()
          .describe(
            "URLs to add under the issue’s Links section (plain https URLs, like the UI)."
          ),
        progress: z.enum(ISSUE_PROGRESS_IDS).optional(),
        priority: z.enum(ISSUE_PRIORITY_IDS).optional(),
        assignedTo: z
          .union([z.literal("none"), z.string().min(1)])
          .optional()
          .describe(
            'Initial assignee: "none" or an exact human user id from the prompt.'
          ),
      }),
      execute: async (input) => {
        const humanIds = new Set(
          getUsers()
            .filter((u) => u.id !== AI_USER_INFO.id)
            .map((u) => u.id)
        );

        let assignedTo: CreateIssueRoomOptions["assignedTo"];
        if (input.assignedTo === undefined) {
          assignedTo = undefined;
        } else if (input.assignedTo === "none") {
          assignedTo = "none";
        } else {
          assignedTo = humanIds.has(input.assignedTo)
            ? input.assignedTo
            : "none";
        }

        const { issueId } = await createIssueRoomForAi(input.title, {
          descriptionMarkdown: input.descriptionMarkdown,
          labels: input.labels,
          links: input.links,
          progress: input.progress,
          priority: input.priority,
          assignedTo,
        });
        const current = getIssueId(roomId);
        state.referencedIssueIdsCsv = mergeReferencedIssueIdsCsv(
          state.referencedIssueIdsCsv,
          [issueId],
          current,
          "prepend"
        );
        return { issueId };
      },
    }),
    append_issue_links: tool({
      description:
        "Append one or more URLs to this issue’s Links section (plain https URLs, deduped; max 30 links total on an issue). Use when the user wants references attached to the ticket, not only markdown links in the body.",
      inputSchema: z.object({
        urls: z
          .array(z.string().min(1).max(4000))
          .min(1)
          .max(30)
          .describe("URLs to add (trimmed; duplicates and the cap are handled server-side)."),
      }),
      execute: async ({ urls }) => {
        const { added } = await appendIssueLinks(roomId, urls);
        if (added > 0) {
          state.issueLinksUpdated = true;
        }
        return { added };
      },
    }),
    insert_issue_description_markdown: tool({
      description:
        "Insert markdown into this issue's main description (Lexical). The title property is the only top-level title — NEVER begin markdown with #/##/###. Prefer append. Use blank lines (two newlines) between paragraphs.",
      inputSchema: z.object({
        markdown: z
          .string()
          .describe(
            "Markdown for the body: first line must NOT be a heading (# … ######). Start with a paragraph or list; headings only after opening non-heading content if needed. Separate paragraphs with a blank line (two newlines), not a single newline between prose lines."
          ),
        mode: z
          .enum(["append", "replace"])
          .default("append")
          .describe(
            "append: add after existing content. replace: clear the description then set from markdown only if the user asked to replace everything."
          ),
      }),
      execute: async ({ markdown, mode }) => {
        await applyIssueDescriptionMarkdown(roomId, markdown, mode);
        state.editorMarkdownApplied = true;
        return { applied: true as const };
      },
    }),
    update_issue_properties: tool({
      description:
        "Update this issue's title, progress, priority, assignee, and/or labels in storage (and room metadata for lists). Only pass fields you are changing.",
      inputSchema: z.object({
        title: z
          .string()
          .optional()
          .describe("Issue title (storage meta + room metadata)."),
        progress: z.enum(ISSUE_PROGRESS_IDS).optional(),
        priority: z.enum(ISSUE_PRIORITY_IDS).optional(),
        assignedTo: z
          .union([z.literal("none"), z.string().min(1)])
          .optional()
          .describe(
            'Use "none" or an exact user id from the system prompt list.'
          ),
        labels: z
          .array(z.enum(ISSUE_LABEL_IDS))
          .optional()
          .describe("Full label set to apply (replaces existing)."),
      }),
      execute: async (patch) => {
        const { title, progress, priority, assignedTo, labels } = patch;
        const updates: IssuePropertyUpdates = {};
        if (title !== undefined) updates.title = title;
        if (progress !== undefined) updates.progress = progress;
        if (priority !== undefined) updates.priority = priority;
        if (assignedTo !== undefined) updates.assignedTo = assignedTo;
        if (labels !== undefined) updates.labels = labels;
        if (Object.keys(updates).length === 0) {
          return { updated: false as const };
        }
        await applyIssuePropertyUpdates(roomId, updates);
        state.issuePropertiesUpdated = true;
        return { updated: true as const };
      },
    }),
    list_recent_issues: tool({
      description:
        "List the most recently created issues (newest first). Excludes the current thread’s issue. Optional \`filter\` narrows that page by title or id substring. When your answer names specific issues from the results, you must also call **link_issues_in_reply** with those nanoid ids (same reply)—do not only list them in text.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(25)
          .describe("How many recent rooms to fetch (max 50)."),
        filter: z
          .string()
          .max(200)
          .optional()
          .describe(
            "Optional case-insensitive substring; if set, only issues in the recent page whose title or issue id contain it are returned."
          ),
      }),
      execute: async ({ limit, filter }) => {
        const issues = await fetchRecentIssueRoomsForAi({
          limit,
          excludeIssueId: getIssueId(roomId),
          titleOrIdContains: filter,
        });
        return { issues };
      },
    }),
    link_issues_in_reply: tool({
      description:
        "Required whenever you surface specific other issues in your answer (e.g. after list_recent_issues): attach them as inline previews under this comment via comment metadata (comma-separated issueIds, max 10 after merge). Do not ask the user for permission to link—call this tool with the nanoid ids you are discussing. Multiple calls merge (deduped). Each id must be a real issue room.",
      inputSchema: z.object({
        issueIds: z
          .array(z.string().min(1))
          .min(1)
          .max(MAX_REFERENCED_ISSUES_IN_REPLY)
          .describe(
            "Issue ids (nanoids), not full room ids. Duplicates and the current thread id are ignored."
          ),
      }),
      execute: async ({ issueIds }) => {
        const current = getIssueId(roomId);
        const validated: string[] = [];
        for (const raw of issueIds) {
          const id = raw.trim();
          if (!id || id === current) {
            continue;
          }
          try {
            await liveblocks.getRoom(getRoomId(id));
          } catch {
            return {
              linked: false as const,
              error: `No issue found for issueId: ${id}`,
            };
          }
          validated.push(id);
        }
        if (validated.length === 0) {
          return {
            linked: false as const,
            error: "No valid issue ids to link.",
          };
        }
        state.referencedIssueIdsCsv = mergeReferencedIssueIdsCsv(
          state.referencedIssueIdsCsv,
          validated,
          current,
          "append"
        );
        return {
          linked: true as const,
          issueIds: state.referencedIssueIdsCsv.split(",").filter(Boolean),
        };
      },
    }),
  };
}
