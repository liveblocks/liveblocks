import { Presence } from "@/components/Presence";
import { Comments } from "@/components/Comments";
import { Editor } from "@/components/Editor";
import { IssueProperties } from "@/components/IssueProperties";
import { IssueLabels } from "@/components/IssueLabels";
import { IssueActions } from "@/components/IssueActions";
import { liveblocks } from "@/liveblocks.server.config";
import { withLexicalDocument } from "@liveblocks/node-lexical";
import { getRoomId } from "@/config";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { IssueLinks } from "@/components/IssueLinks";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import Link from "next/link";
import { Status } from "./Status";

export async function Issue({ issueId }: { issueId: string }) {
  const roomId = getRoomId(issueId);

  // Get storage contents of room (e.g. issue properties) to render placeholder on load
  const storagePromise = liveblocks.getStorageDocument(roomId, "json");

  // Get content and convert it to markdown for displaying a placeholder
  const contentHtmlPromise = withLexicalDocument(
    {
      roomId,
      client: liveblocks,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    },
    async (doc) => {
      let markdown = "";

      doc.getEditorState().read(() => {
        // Get markdown version of Lexical state
        markdown = $convertToMarkdownString(TRANSFORMERS, undefined, true)
          // Make new lines display correctly
          .replace(/\n{2,}/g, (match) => "<p><br></p>".repeat(match.length - 1))
          .replace(/\n(?!$)/g, "\n\n")
          .replace(/(\n+)$/g, (match) => "<p><br></p>".repeat(match.length));
      });

      // Remove all HTML tags but "p" and "br"
      markdown = sanitizeHtml(markdown, {
        allowedTags: ["p", "br"],
        disallowedTagsMode: "escape",
      });

      return marked(markdown);
    }
  );

  let error;
  let results;

  try {
    results = await Promise.all([storagePromise, contentHtmlPromise]);
  } catch (err) {
    console.log(err);
    error = err;
  }

  if (
    error ||
    !Array.isArray(results) ||
    Object.keys(results[0]).length === 0
  ) {
    console.log(error);
    return (
      <div className="max-w-[840px] mx-auto pt-20">
        <h1 className="outline-none block w-full text-2xl font-bold bg-transparent my-6">
          Issue not found
        </h1>
        <div>
          This issue has been deleted. Go back to the{" "}
          <Link className="font-bold underline" href="/">
            issue list
          </Link>
          .
        </div>
      </div>
    );
  }

  const [storage, contentHtml] = results;

  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between border-b h-10 px-4 items-center">
        <Status />
        <Presence />
      </header>
      <div className="flex-grow relative">
        <div className="absolute inset-0 flex flex-row">
          <div className="flex-grow h-full overflow-y-scroll">
            <div className="max-w-[840px] mx-auto py-6 relative">
              <div className="px-12">
                <Editor
                  storageFallback={storage}
                  contentFallback={
                    <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
                  }
                />
                <div className="my-6">
                  <IssueLinks storageFallback={storage} />
                </div>
                <div className="border-t my-6" />
                <Comments />
              </div>
            </div>
          </div>
          <div className="border-l flex-grow-0 flex-shrink-0 w-[200px] lg:w-[260px] px-4 flex flex-col gap-4">
            <div>
              <div className="text-xs font-medium text-neutral-600 mb-2 h-10 flex items-center">
                Properties
              </div>
              <IssueProperties storageFallback={storage} />
            </div>

            <div>
              <div className="text-xs font-medium text-neutral-600 mb-0 h-10 flex items-center">
                Labels
              </div>
              <IssueLabels storageFallback={storage} />
            </div>

            <div>
              <div className="text-xs font-medium text-neutral-600 mb-0 h-10 flex items-center">
                Actions
              </div>
              <IssueActions issueId={issueId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
