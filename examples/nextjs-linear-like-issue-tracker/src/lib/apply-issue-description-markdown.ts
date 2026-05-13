import { withLexicalDocument } from "@liveblocks/node-lexical";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { $getRoot } from "lexical";
import { liveblocks } from "@/liveblocks.server.config";
import { ISSUE_LEXICAL_NODES } from "@/lib/issue-lexical-nodes";
import { AI_EDITING_TYPE } from "@/lib/ai-editing-presence-types";
import { setAiRemotePresenceEditing } from "@/lib/ai-remote-presence";

export type IssueDescriptionMarkdownMode = "append" | "replace";

/**
 * Applies markdown to the collaborative Lexical issue description using
 * {@link https://liveblocks.io/docs/api-reference/liveblocks-node-lexical | withLexicalDocument}
 * and `doc.update`, following the same pattern as
 * `examples/nextjs-notion-like-ai-editor` (`createRoomWithLexicalDocument`).
 *
 * Sets AI presence `editingTypes` to include `content` before writing; does not
 * clear it (the AI assistant clears presence when the run ends).
 */
export async function applyIssueDescriptionMarkdown(
  roomId: string,
  markdown: string,
  mode: IssueDescriptionMarkdownMode
): Promise<void> {
  const text = markdown.trim();
  if (!text) {
    return;
  }

  await setAiRemotePresenceEditing(roomId, [AI_EDITING_TYPE.CONTENT]);
  await withLexicalDocument(
    {
      roomId,
      client: liveblocks,
      nodes: [...ISSUE_LEXICAL_NODES],
    },
    async (doc) => {
      await doc.update(() => {
        const root = $getRoot();

        if (mode === "replace") {
          root.clear();
          $convertFromMarkdownString(text, TRANSFORMERS);
          return;
        }

        const last = root.getLastChild();
        if (last !== null) {
          last.selectEnd();
        }
        const prefix =
          root.getChildrenSize() > 0 && root.getTextContent().trim().length > 0
            ? "\n\n"
            : "";
        $convertFromMarkdownString(prefix + text, TRANSFORMERS);
      });
    }
  );
}
