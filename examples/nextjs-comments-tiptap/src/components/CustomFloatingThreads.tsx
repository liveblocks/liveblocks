"use client";

import React from "react";
import { FloatingThreads } from "@liveblocks/react-tiptap";
import { useAddReaction, useRemoveReaction } from "@liveblocks/react/suspense";
import { Editor as TEditor } from "@tiptap/react";
import { ThreadData } from "@liveblocks/client";
import { useScenario } from "@/hooks/useScenario";

interface CustomFloatingThreadsProps {
  threads: ThreadData[];
  editor: TEditor | null;
}

export function CustomFloatingThreads({ threads, editor }: CustomFloatingThreadsProps) {
  const { scenario } = useScenario();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  const handleUpvote = (threadId: string, commentId: string) => {
    addReaction({ threadId, commentId, emoji: '▲' });
  };

  if (scenario === 'auth-hidden') {
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-floating-threads .lb-comment-reactions {
            display: none !important;
          }
          .custom-floating-threads .lb-comment-body {
            position: relative;
          }
          .custom-floating-threads .lb-comment-body::after {
            content: '';
            position: absolute;
            bottom: -30px;
            left: 0;
            right: 0;
            height: 30px;
          }
          .upvote-button {
            position: absolute;
            bottom: -25px;
            left: 0;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-xs);
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
            transition: var(--transition);
          }
          .upvote-button:hover {
            background: var(--color-surface-hover);
          }
        `
      }} />
      <div className="custom-floating-threads">
        <FloatingThreads threads={threads} editor={editor} />
        {threads.map((thread) =>
          thread.comments.map((comment) => (
            <div key={`upvote-${comment.id}`} style={{ display: 'none' }}>
              <button
                className="upvote-button"
                onClick={() => handleUpvote(thread.id, comment.id)}
              >
                ▲ Upvote
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
