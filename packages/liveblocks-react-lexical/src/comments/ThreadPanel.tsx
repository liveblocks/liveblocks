import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { BaseMetadata, ThreadData } from "@liveblocks/core";
import { useThreads } from "@liveblocks/react";
import type { ThreadProps } from "@liveblocks/react-ui";
import { Thread as DefaultThread, useOverrides } from "@liveblocks/react-ui";
import { $getNodeByKey } from "lexical";
import type { ComponentProps, ComponentType } from "react";
import React, { forwardRef, useCallback, useContext } from "react";

import { classNames } from "../classnames";
import type { ThreadToNodesMap } from "./comment-plugin-provider";
import {
  OnDeleteThreadCallback,
  ThreadToNodesContext,
  useIsThreadActive,
} from "./comment-plugin-provider";
import { $isThreadMarkNode } from "./thread-mark-node";

type ThreadPanelComponents = {
  Thread: ComponentType<ThreadProps>;
};

export interface ThreadPanelProps extends ComponentProps<"div"> {
  /**
   * Override the component's components.
   */
  components?: Partial<ThreadPanelComponents>;

  // /**
  //  * Override the component's strings.
  //  */
  // overrides?: Partial<
  //   GlobalOverrides &
  //     ThreadPanelOverrides &
  //     ThreadOverrides &
  //     CommentOverrides &
  //     ComposerOverrides
  // >;
}

interface ThreadWrapperProps extends ThreadProps {
  Thread: ComponentType<ThreadProps>;
}

const ThreadWrapper = ({ Thread, ...props }: ThreadWrapperProps) => {
  const onDeleteThread = useContext(OnDeleteThreadCallback);
  const threadToNodes = useThreadToNodes();
  const [editor] = useLexicalComposerContext();

  if (onDeleteThread === null || onDeleteThread === null) {
    throw new Error(
      "ThreadPanel component must be used within a LiveblocksPlugin"
    );
  }

  const isActive = useIsThreadActive(props.thread.id);

  const handleThreadDelete = useCallback(
    (thread: ThreadData<BaseMetadata>) => {
      onDeleteThread(thread.id);
    },
    [onDeleteThread]
  );

  const handleThreadClick = useCallback(() => {
    const nodes = threadToNodes.get(props.thread.id);
    if (nodes === undefined || nodes.size === 0) return;

    if (isActive) return;

    editor.update(() => {
      const [key] = nodes;
      const node = $getNodeByKey(key);
      if (!$isThreadMarkNode(node)) return;
      node.selectStart();
    });
  }, [editor, threadToNodes, isActive, props.thread.id]);

  return (
    <Thread
      onThreadDelete={handleThreadDelete}
      onClick={handleThreadClick}
      data-state={isActive ? "active" : null}
      {...props}
    />
  );
};

export const ThreadPanel = forwardRef<HTMLDivElement, ThreadPanelProps>(
  ({ components, /* overrides, */ className, ...props }, forwardedRef) => {
    // const $ = useOverrides(overrides);
    const { threads } = useThreads();
    const threadToNodes = useThreadToNodes();

    const Thread = components?.Thread ?? DefaultThread;

    return (
      <div
        className={classNames(className, "lb-root lb-lexical-thread-panel")}
        ref={forwardedRef}
        {...props}
      >
        {threads && threads.length > 0 ? (
          threads.map((thread) => {
            // Check if the thread has any nodes associated with it, if not, we do not render the thread
            const nodes = threadToNodes.get(thread.id);
            if (nodes === undefined || nodes.size === 0) return null;

            return (
              <ThreadWrapper
                Thread={Thread}
                key={thread.id}
                thread={thread}
                className="lb-lexical-thread-panel-thread"
              />
            );
          })
        ) : (
          <div className="lb-lexical-thread-panel-empty">No threads yet.</div>
        )}
      </div>
    );
  }
);

function useThreadToNodes(): ThreadToNodesMap {
  const threadToNodes = React.useContext(ThreadToNodesContext);
  if (threadToNodes === null) {
    throw new Error(
      "ThreadPanel component must be used within a LiveblocksPlugin"
    );
  }
  return threadToNodes;
}
