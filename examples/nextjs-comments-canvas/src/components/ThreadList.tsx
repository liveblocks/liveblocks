import { Comment } from "@liveblocks/react-ui";
import { ThreadData } from "@liveblocks/client";
import { useThreads } from "@liveblocks/react/suspense";
import { useActiveThread } from "./ActiveThreadProvider";

export function ThreadList() {
  const { threads } = useThreads();

  return (
    <>
      {threads.map((thread) => (
        <FirstComment key={thread.id} thread={thread} />
      ))}
    </>
  );
}

function FirstComment({ thread }: { thread: ThreadData }) {
  const firstComment = thread.comments[0];
  const { open, setOpen } = useActiveThread(thread.id);

  return (
    <Comment
      key={firstComment.id}
      comment={firstComment}
      showReactions={false}
      showActions={false}
      showAttachments={false}
      onClick={() => setOpen(!open)}
      style={{
        background: open ? "#fafafa" : undefined,
        cursor: "pointer",
        borderBottom: "1px solid #eee",
      }}
    />
  );
}
