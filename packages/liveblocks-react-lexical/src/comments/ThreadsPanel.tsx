import type { BaseMetadata, ThreadData } from "@liveblocks/core";
import { useThreads } from "@liveblocks/react";
import type { ThreadProps } from "@liveblocks/react-ui";
import { Thread } from "@liveblocks/react-ui";
import type { ComponentProps, ComponentType } from "react";
import React, { forwardRef, useCallback, useContext } from "react";

import { classNames } from "../classnames";
import {
  IsActiveThreadContext,
  OnDeleteThreadCallback,
} from "./comment-plugin-provider";

export interface ThreadComponentProps extends ThreadProps {
  isActive: boolean;
}

type ThreadsPanelComponents = {
  Thread: ComponentType<ThreadComponentProps>;
};

export interface ThreadsPanelProps extends ComponentProps<"div"> {
  components?: Partial<ThreadsPanelComponents>;
}

const DefaultThread = ({ thread, isActive }: ThreadComponentProps) => {
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

  return (
    <Thread
      thread={thread}
      data-state={isActive ? "active" : null}
      onThreadDelete={handleThreadDelete}
    />
  );
};

export const ThreadsPanel = forwardRef<HTMLDivElement, ThreadsPanelProps>(
  ({ components, className, ...props }, forwardedRef) => {
    const { threads } = useThreads();
    const isThreadActive = useContext(IsActiveThreadContext);
    const Thread = components?.Thread ?? DefaultThread;

    return (
      <div
        className={classNames(className, "lb-root lb-lexical-threads-panel")}
        ref={forwardedRef}
        {...props}
      >
        {threads && threads.length > 0 ? (
          threads.map((thread) => {
            return (
              <Thread
                isActive={isThreadActive(thread.id)}
                key={thread.id}
                thread={thread}
              />
            );
          })
        ) : (
          <div className="lb-lexical-threads-panel-empty">No threads yet</div>
        )}
      </div>
    );
  }
);
