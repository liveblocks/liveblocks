import { AnchoredThreads } from "@liveblocks/react-tiptap";
import { Comment } from "@liveblocks/react-ui";
import { Editor as TEditor } from "@tiptap/react";
import { useThreads } from "@liveblocks/react/suspense";
import { CommentIcon } from "@/icons";
import { useScenario } from "@/hooks/useScenario";
import { memo } from "react";
import type { CommentData, ThreadData } from "@liveblocks/client";
import { useSelf, useAddReaction, useRemoveReaction } from "@liveblocks/react";

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
    <AnchoredThreads
      threads={threads}
      editor={editor}
      style={{ width: 350 }}
      components={{
        Thread: CustomThread,
      }}
    />
  );
}

const CustomThread = memo(function CustomThread({
  thread,
}: {
  thread: ThreadData;
}) {
  return (
    <div className="shadow-xl border border-border rounded-sm overflow-hidden">
      {thread.comments.map((comment) => (
        <CustomComment key={comment.id} comment={comment} />
      ))}
    </div>
  );
});

const CustomComment = memo(function CustomComment({
  comment,
}: {
  comment: CommentData;
}) {
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

  return (
    <div>
      <Comment comment={comment} showReactions={false} indentContent={false} />
      <div className="px-8 pb-6 pt-0.5 -mt-2 z-10 relative">
        <button
          className="flex h-11 w-15 justify-center items-center gap-1.5 rounded-full border border-solid border-gray-200 text-base text-gray-400 hover:bg-gray-100 data-[picked]:border-blue-300 data-[picked]:bg-blue-50 data-[picked]:text-blue-600"
          data-picked={hasUpvoted || undefined}
          onClick={() =>
            hasUpvoted
              ? removeReaction(reactionObject)
              : addReaction(reactionObject)
          }
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

function UpvoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-square-chevron-up-icon lucide-square-chevron-up"
      {...props}
    >
      <rect width={18} height={18} x={3} y={3} rx={2} />
      <path d="M8 14l4-4 4 4" />
    </svg>
  );
}
