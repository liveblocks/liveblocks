import { useThreads } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-ui";
import React from "react";

const ThreadPanel = () => {
  const { threads } = useThreads();

  if (!threads || threads.length === 0) {
    return <div className="lb-lexical-threads-empty">No threads yet</div>;
  }

  return (
    <div className="lb-lexical-threads">
      {threads.map((thread) => {
        return <Thread key={thread.id} thread={thread} />;
      })}
    </div>
  );
};

export { ThreadPanel };
