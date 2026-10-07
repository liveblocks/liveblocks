import {
  getLiveblocksProsemirrorDocument,
  liveblocksProsemirrorNodeToJson,
} from "@liveblocks/prosemirror";
import { getDocumentKey } from "@/lib/documents";
import type { PromptDocument } from "@/lib/prompt";
import { documentToMarkdown } from "@/lib/server/document-markdown";
import { getLiveblocks } from "@/lib/server/liveblocks";

/**
 * The chat's documents as they are now in Storage, as Markdown for a
 * prompt. People edit documents in the side panel, so this is read fresh
 * each time rather than from the agent's own copy.
 */
export async function readDocuments({
  roomId,
  feedId,
}: {
  roomId: string;
  feedId: string;
}): Promise<PromptDocument[]> {
  const documents: PromptDocument[] = [];

  // Going through `mutateStorage` gives the Live tree, which
  // `@liveblocks/prosemirror` turns back into the editor's JSON; nothing is
  // written since nothing is changed. Storage may not exist yet for a room
  // nobody has opened since documents were added; there are none then.
  await getLiveblocks()
    .mutateStorage(roomId, ({ root }) => {
      const records = [...(root.get("documents")?.values() ?? [])]
        .filter((record) => record.get("feedId") === feedId)
        .sort((a, b) => a.get("createdAt").localeCompare(b.get("createdAt")));

      for (const record of records) {
        const slug = record.get("slug");
        const node = getLiveblocksProsemirrorDocument(
          root,
          getDocumentKey(feedId, slug)
        );
        documents.push({
          slug,
          title: record.get("title"),
          content: node
            ? documentToMarkdown(liveblocksProsemirrorNodeToJson(node))
            : "",
        });
      }
    })
    .catch(() => {});

  return documents;
}
