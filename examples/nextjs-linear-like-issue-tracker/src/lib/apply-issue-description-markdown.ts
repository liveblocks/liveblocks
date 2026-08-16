import { LiveList } from "@liveblocks/client";
import { liveblocks } from "@/liveblocks.server.config";
import { ISSUE_LEXICAL_NODES } from "@/lib/issue-lexical-nodes";
import { markdownToLiveNodes } from "@/lib/lexical-live-storage";
import { AI_EDITING_TYPE } from "@/lib/ai-editing-presence-types";
import { setAiRemotePresenceEditing } from "@/lib/ai-remote-presence";

export type IssueDescriptionMarkdownMode = "append" | "replace";

// Adds markdown content to the issue description document in storage
export async function applyIssueDescriptionMarkdown(
  roomId: string,
  markdown: string,
  mode: IssueDescriptionMarkdownMode
): Promise<void> {
  const text = markdown.trim();
  if (!text) {
    return;
  }

  const blocks = markdownToLiveNodes(text, ISSUE_LEXICAL_NODES);

  await setAiRemotePresenceEditing(roomId, [AI_EDITING_TYPE.CONTENT]);
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const document = root.get("document");

    if (mode === "replace") {
      document.set("children", new LiveList(blocks));
      return;
    }

    const children = document.get("children");
    for (const block of blocks) {
      children.push(block);
    }
  });
}
