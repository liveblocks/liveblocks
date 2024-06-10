import type { BaseMetadata, ThreadData } from "@liveblocks/core";
import { useThreads } from "@liveblocks/react";
import type { ThreadProps } from "@liveblocks/react-ui";
import { Thread as DefaultThread } from "@liveblocks/react-ui";
import type { ComponentProps, ComponentType } from "react";
import React, { forwardRef, useCallback, useContext } from "react";

import { classNames } from "../classnames";
import {
  IsActiveThreadContext,
  OnDeleteThreadCallback,
} from "./comment-plugin-provider";

type ThreadsPanelComponents = {
  Thread: ComponentType<ThreadProps>;
};

export interface ThreadsPanelProps extends ComponentProps<"div"> {
  components?: Partial<ThreadsPanelComponents>;
}

interface ThreadWrapperProps extends ThreadProps {
  Thread: ComponentType<ThreadProps>;
  isActive: boolean;
}

const ThreadWrapper = ({ Thread, isActive, ...props }: ThreadWrapperProps) => {
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
      onThreadDelete={handleThreadDelete}
      data-state={isActive ? "active" : null}
      {...props}
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
              <ThreadWrapper
                Thread={Thread}
                isActive={isThreadActive(thread.id)}
                key={thread.id}
                thread={thread}
                className="lb-lexical-threads-panel-thread"
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
