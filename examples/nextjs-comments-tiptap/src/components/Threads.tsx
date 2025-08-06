import { AnchoredThreads, FloatingThreads } from "@liveblocks/react-tiptap";
import { Comment, Composer, Icon } from "@liveblocks/react-ui";
import { Editor as TEditor } from "@tiptap/react";
import { useThreads } from "@liveblocks/react/suspense";
import { CommentIcon } from "@/icons";
import { useScenario } from "@/hooks/useScenario";
import { memo } from "react";
import type { CommentData, ThreadData } from "@liveblocks/client";
import {
  useSelf,
  useAddReaction,
  useRemoveReaction,
  useMarkThreadAsResolved,
  useMarkThreadAsUnresolved,
} from "@liveblocks/react";

export function Threads({ editor }: { editor: TEditor | null }) {
  const { threads } = useThreads();
  const { scenario } = useScenario();

  if (!threads || !editor || scenario === "auth-hidden") {
    return null;
  }

  if (threads.length === 0) {
    return (
      <div className="text-text-lighter pt-8 flex flex-col gap-4 select-none ml-4 text-sm max-w-[260px] max-xl:bg-surface-elevated max-xl:border max-xl:border-border max-xl:shadow-sm max-xl:rounded-sm max-xl:p-8 max-xl:ml-0">
        <div className="text-text-light font-semibold text-lg">
          No comments yet
        </div>
        <p className="max-xl:inline-flex max-xl:items-center">
          Create a comment by selecting text and pressing the{" "}
          <CommentIcon className="inline -mt-0.5" /> Comment button.
        </p>
      </div>
    );
  }

  return (
    <>
      <AnchoredThreads
        threads={threads}
        editor={editor}
        className="w-[350px] hidden xl:block"
        components={{
          Thread: CustomThread,
        }}
      />
      <FloatingThreads
        editor={editor}
        threads={threads}
        className="w-[350px] block xl:hidden !overflow-visible !shadow-none"
        components={{
          Thread: CustomThread,
        }}
      />
    </>
  );
}

const CustomThread = memo(function CustomThread({
  thread,
}: {
  thread: ThreadData;
}) {
  const markThreadAsResolved = useMarkThreadAsResolved();
  const markThreadAsUnresolved = useMarkThreadAsUnresolved();
  const { scenario } = useScenario();

  return (
    <div className="shadow-lg border rounded-sm overflow-hidden">
      {scenario !== "anonymous" && (
        <div className="bg-neutral-50 border-b px-4 py-3 text-sm text-neutral-600 font-medium flex justify-between items-center">
          Review
          <button
            className="flex items-center gap-2 text-sm text-neutral-600 font-medium"
            onClick={() => {
              if (thread.resolved) {
                markThreadAsUnresolved(thread.id);
              } else {
                markThreadAsResolved(thread.id);
              }
            }}
          >
            {thread.resolved ? <Icon.Check /> : <Icon.CheckCircle />}
          </button>
        </div>
      )}

      {thread.comments.map((comment) => (
        <CustomComment key={comment.id} comment={comment} />
      ))}
      {scenario !== "anonymous" && (
        <Composer threadId={thread.id} className="border-t" />
      )}
    </div>
  );
});

const CustomComment = memo(function CustomComment({
  comment,
}: {
  comment: CommentData;
}) {
  const { scenario } = useScenario();
  const currentId = useSelf((me) => me.id);
  const upvoteUsers = comment.reactions.filter((r) => r.emoji === "⬆️")?.[0]
    ?.users;
  const hasUpvoted = upvoteUsers
    ? upvoteUsers.some((u) => u.id === currentId)
    : false;

  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  const reactionObject = {
    threadId: comment.threadId,
    commentId: comment.id,
    emoji: "⬆️",
  };

  if (comment.deletedAt) {
    return null;
  }

  return (
    <div className="">
      <Comment
        className="!pb-16"
        comment={comment}
        showReactions={false}
        indentContent={true}
      />
      <div className="px-16 pb-6 pt-0.5 -mt-15 z-10 relative">
        <button
          className="flex h-11 w-15 justify-center items-center gap-1.5 rounded-full border border-solid border-gray-200 text-base text-gray-400 hover:bg-gray-100 data-[picked]:border-blue-300 data-[picked]:bg-blue-50 data-[picked]:text-blue-600"
          data-picked={hasUpvoted || undefined}
          onClick={() =>
            hasUpvoted
              ? removeReaction(reactionObject)
              : addReaction(reactionObject)
          }
          disabled={scenario === "anonymous"} // TODO come back and allow this for anon users
        >
          ▲{" "}
          <span className="text-xs tabular-nums">
            {upvoteUsers?.length || 0}
          </span>
        </button>
      </div>
    </div>
  );
});
