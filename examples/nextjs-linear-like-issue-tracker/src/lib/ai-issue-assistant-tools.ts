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

/** Mutable flags updated by tool `execute` handlers (read after `streamText` finishes). */
export type AiIssueAssistantToolRunState = {
  createdIssueId?: string;
  /** Issue id (nanoid) for inline “related issue” preview at bottom of AI comment; last link wins. */
  referencedIssueId?: string;
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
        "Create a new tracked issue. Required: title. Optional: descriptionMarkdown (GFM body — NEVER start with #/##/###; title is the title field), labels, links, progress, priority, assignedTo.",
      inputSchema: z.object({
        title: z
          .string()
          .describe("Concise issue title shown in the issue list"),
        descriptionMarkdown: z
          .string()
          .optional()
          .describe(
            "Body markdown: open with a paragraph, list, or quote — NEVER start with a heading line (# through ######); use the title field for the issue name. Headings allowed deeper in the body after opening text if needed."
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
        state.createdIssueId = issueId;
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
        "Insert markdown into this issue's main description (Lexical). The title property is the only top-level title — NEVER begin markdown with #/##/###. Prefer append.",
      inputSchema: z.object({
        markdown: z
          .string()
          .describe(
            "Markdown for the body: first line must NOT be a heading (# … ######). Start with a paragraph or list; headings only after opening non-heading content if needed."
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
        "List the most recently created issues (Liveblocks rooms, newest first). Excludes the current thread’s issue. Optional `filter` narrows that list by substring on title or issue id (does not scan older pages). Use before **link_issue_in_reply** when you need candidate issueIds.",
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
    link_issue_in_reply: tool({
      description:
        "Attach one existing issue to the bottom of this AI comment as an inline preview + link (stored in comment metadata). Only the last successful call is kept if you call more than once. Use an issueId from **list_recent_issues** or from context; must be a real issue room.",
      inputSchema: z.object({
        issueId: z
          .string()
          .min(1)
          .describe("The issue’s id (same as in URLs / room metadata), not the full room id."),
      }),
      execute: async ({ issueId }) => {
        if (issueId === getIssueId(roomId)) {
          return {
            linked: false as const,
            error: "Use link_issue_in_reply only for a different issue than this thread.",
          };
        }
        const targetRoomId = getRoomId(issueId);
        try {
          await liveblocks.getRoom(targetRoomId);
        } catch {
          return {
            linked: false as const,
            error: "No issue found for that issueId.",
          };
        }
        state.referencedIssueId = issueId;
        return { linked: true as const, issueId };
      },
    }),
  };
}
