import { AI_USER_INFO, getUsers } from "@/database";
import { applyIssueDescriptionMarkdown } from "@/lib/apply-issue-description-markdown";
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
import { tool } from "ai";
import { z } from "zod";

/** Mutable flags updated by tool `execute` handlers (read after `streamText` finishes). */
export type AiIssueAssistantToolRunState = {
  createdIssueId?: string;
  editorMarkdownApplied: boolean;
  issuePropertiesUpdated: boolean;
};

export function createAiIssueAssistantTools(
  roomId: string,
  state: AiIssueAssistantToolRunState
) {
  return {
    create_issue: tool({
      description:
        "Create a new tracked issue. Required: title. Optional: descriptionMarkdown (body-only GFM — no leading # title that repeats title), labels, links, progress, priority, assignedTo.",
      inputSchema: z.object({
        title: z
          .string()
          .describe("Concise issue title shown in the issue list"),
        descriptionMarkdown: z
          .string()
          .optional()
          .describe(
            "Body-only markdown: paragraphs, ## sections, lists, links, code. Do not start with a single # heading that duplicates the issue title — the title field is shown above the editor."
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
    insert_issue_description_markdown: tool({
      description:
        "Insert markdown into this issue's main description (Lexical). The issue title is shown above the body — do not open markdown with a # line that repeats it. Prefer mode append.",
      inputSchema: z.object({
        markdown: z
          .string()
          .describe(
            "Markdown for the body only: start with content or ## subheadings — not a top-level # title that duplicates the issue title (shown in the UI above this text)."
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
  };
}
