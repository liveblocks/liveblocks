import type { BaseMetadata, ThreadData } from "@liveblocks/core";
import { useThreads } from "@liveblocks/react";
import { Thread } from "@liveblocks/react-ui";
import type { ComponentType } from "react";
import React, { useCallback, useContext } from "react";

import { IsActiveThreadContext, OnDeleteThreadCallback } from "./comment-plugin-provider";

type ThreadProps = {
  thread: ThreadData<BaseMetadata>,
  isActive: boolean,
}

type ThreadPanelProps = {
  renderThread?: ComponentType<ThreadProps>;
}

const DefaultThread = ({ thread, isActive }: ThreadProps) => {
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

  return <Thread thread={thread}
    data-state={isActive ? "active" : null}
    onThreadDelete={handleThreadDelete}
  />
}

const ThreadPanel = ({ renderThread }: ThreadPanelProps) => {
  const { threads } = useThreads();
  const isThreadActive = useContext(IsActiveThreadContext)
  const ThreadComponent = renderThread ?? DefaultThread;

  if (!threads || threads.length === 0) {
    return <div className="lb-lexical-threads-empty">No threads yet</div>;
  }

  return (
    <div className="lb-lexical-threads">
      {threads.map((thread) => {
        return (
          <ThreadComponent
            isActive={isThreadActive(thread.id)}
            key={thread.id}
            thread={thread}
          />
        );
      })}
    </div>
  );
};

export { ThreadPanel };
