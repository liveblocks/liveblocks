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
import { $generateHtmlFromNodes } from "@lexical/html";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { marked } from "marked";

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
        markdown = $convertToMarkdownString(TRANSFORMERS, undefined, true)
          .replace(/\n{2,}/g, (match) => {
            return "<p><br></p>".repeat(match.length / 2);
          })
          .replace(/\n/g, "\n\n");
      });

      console.log(1, markdown);

      // console.log(1, markdown);
      const html = marked(markdown);

      // const content = (await remark().use(html).process(markdown)).toString();
      console.log(2, html);

      return html;
      //return "<br>" + markdown; //.replace(/\n/g, "\n<br />\n");
      //return doc
      //.toMarkdown()
      //.replace(/^\s*$(\r?\n^\s*$)+/gm, "\n<p>&nbsp;a</p>\n");
    }
  );
  //.then((markdown) => remark().use(html).process(markdown))
  //.then((processedContent) => processedContent.toString());

  const [storage, contentHtml] = await Promise.all([
    storagePromise,
    contentHtmlPromise,
  ]);

  //console.log(2, contentHtml);

  // await withLexicalDocument(
  //   {
  //     roomId,
  //     client: liveblocks,
  //     nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
  //   },
  //   async (doc) =>
  //     // await doc.update(() => {
  //     $generateHtmlFromNodes(doc.getLexicalEditor(), null)
  //   // })
  // );

  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between border-b h-10 px-4 items-center">
        <div className="text-sm font-medium text-neutral-700"></div>
        <Presence />
      </header>
      <div className="flex-grow relative">
        <div className="absolute inset-0 flex flex-row">
          <div className="flex-grow h-full overflow-y-scroll">
            <div className="max-w-[840px] mx-auto py-6">
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
