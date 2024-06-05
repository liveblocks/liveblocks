import type { BaseMetadata, ThreadData } from "@liveblocks/core";
import { useThreads } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-ui";
import React, { useCallback, useContext } from "react";

import { OnDeleteThreadCallback } from "./comment-plugin-provider";

const ThreadPanel = () => {
  const { threads } = useThreads();
  const onDeleteThread = useContext(OnDeleteThreadCallback);

  if (onDeleteThread === null) {
    throw new Error("OnDeleteThreadCallback not provided");
  }

  const handleThreadDelete = useCallback(
    (thread: ThreadData<BaseMetadata>) => {
      onDeleteThread(thread.id);
    },
    [onDeleteThread]
  );

  if (!threads || threads.length === 0) {
    return <div className="lb-lexical-threads-empty">No threads yet</div>;
  }

  return (
    <div className="lb-lexical-threads">
      {threads.map((thread) => {
        return (
          <Thread
            key={thread.id}
            thread={thread}
            onThreadDelete={handleThreadDelete}
          />
        );
      })}
    </div>
  );
};

export { ThreadPanel };
