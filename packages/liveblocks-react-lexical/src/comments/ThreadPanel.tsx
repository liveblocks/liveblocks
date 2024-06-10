import type { BaseMetadata, ThreadData } from "@liveblocks/core";
import { useThreads } from "@liveblocks/react";
import type {
  CommentOverrides,
  ComposerOverrides,
  GlobalOverrides,
  ThreadOverrides,
  ThreadPanelOverrides,
  ThreadProps,
} from "@liveblocks/react-ui";
import { Thread as DefaultThread, useOverrides } from "@liveblocks/react-ui";
import type { ComponentProps, ComponentType } from "react";
import React, { forwardRef, useCallback, useContext } from "react";

import { classNames } from "../classnames";
import {
  IsActiveThreadContext,
  OnDeleteThreadCallback,
} from "./comment-plugin-provider";

type ThreadPanelComponents = {
  Thread: ComponentType<ThreadProps>;
};

export interface ThreadPanelProps extends ComponentProps<"div"> {
  /**
   * Override the component's components.
   */
  components?: Partial<ThreadPanelComponents>;

  /**
   * Override the component's strings.
   */
  overrides?: Partial<
    GlobalOverrides &
      ThreadPanelOverrides &
      ThreadOverrides &
      CommentOverrides &
      ComposerOverrides
  >;
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

export const ThreadPanel = forwardRef<HTMLDivElement, ThreadPanelProps>(
  ({ components, overrides, className, ...props }, forwardedRef) => {
    const $ = useOverrides(overrides);
    const { threads } = useThreads();
    const isThreadActive = useContext(IsActiveThreadContext);
    const Thread = components?.Thread ?? DefaultThread;

    return (
      <div
        className={classNames(className, "lb-root lb-lexical-thread-panel")}
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
                className="lb-lexical-thread-panel-thread"
              />
            );
          })
        ) : (
          <div className="lb-lexical-thread-panel-empty">
            {$.THREAD_PANEL_EMPTY}
          </div>
        )}
      </div>
    );
  }
);
