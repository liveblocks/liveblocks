import { Presence } from "@/components/Presence";
import { Comments } from "@/components/Comments";
import { Editor } from "@/components/Editor";
import { IssueProperties } from "@/components/IssueProperties";
import { IssueLabels } from "@/components/IssueLabels";
import { IssueActions } from "@/components/IssueActions";
import { IssueAiButton } from "@/components/IssueAiButton";
import { liveblocks } from "@/liveblocks.server.config";
import { getRoomId } from "@/config";
import { ISSUE_LEXICAL_NODES } from "@/lib/issue-lexical-nodes";
import {
  storageDocumentToMarkdown,
  type StorageJsonNode,
} from "@/lib/lexical-live-storage";
import { IssueLinks } from "@/components/IssueLinks";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import Link from "next/link";
import { Status } from "./Status";
import type { ImmutableStorage } from "@/liveblocks.config";

type StorageJson = ImmutableStorage & {
  document?: StorageJsonNode;
};

export async function Issue({ issueId }: { issueId: string }) {
  const roomId = getRoomId(issueId);

  async function fetchIssueData() {
    "use cache";
    const storage = (await liveblocks.getStorageDocument(
      roomId,
      "json"
    )) as StorageJson;

    let markdown = storageDocumentToMarkdown(
      storage.document,
      ISSUE_LEXICAL_NODES
    )
      // Make new lines display correctly
      .replace(/\n{2,}/g, (match) =>
        "<p><br></p>".repeat(match.length - 1)
      )
      .replace(/\n(?!$)/g, "\n\n")
      .replace(/(\n+)$/g, (match) => "<p><br></p>".repeat(match.length));

    const rawHtml = await marked(markdown);

    const contentHtml = sanitizeHtml(rawHtml, {
      allowedTags: [
        "p",
        "br",
        "strong",
        "em",
        "s",
        "code",
        "pre",
        "blockquote",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "a",
      ],
      allowedAttributes: {
        a: ["href", "name", "target", "rel"],
      },
      allowedSchemes: ["http", "https", "mailto"],
    });

    return { storage, contentHtml };
  }

  let error;
  let results;

  try {
    results = await fetchIssueData();
  } catch (err) {
    console.log(err);
    error = err;
  }

  if (
    error ||
    !results ||
    Object.keys(results.storage).length === 0
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

  const { storage, contentHtml } = results;

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
                  <IssueLinks storageFallback={storage} issueId={issueId} />
                </div>
                <div className="border-t my-6" />
                <Comments />
              </div>
            </div>
          </div>
          <div className="border-l flex-grow-0 flex-shrink-0 w-[200px] lg:w-[260px] px-4 flex flex-col gap-4">
            <div>
              <div className="text-xs font-medium text-neutral-600 mb-2 flex h-10 items-center justify-between gap-1">
                <span>Properties</span>
                <IssueAiButton kind="properties" issueId={issueId} />
              </div>
              <IssueProperties storageFallback={storage} />
            </div>

            <div>
              <div className="text-xs font-medium text-neutral-600 mb-0 flex h-10 items-center justify-between gap-1">
                <span>Labels</span>
                <IssueAiButton kind="labels" issueId={issueId} />
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
