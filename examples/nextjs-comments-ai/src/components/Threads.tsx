"use client";

import { useState } from "react";
import { useThreads } from "@liveblocks/react/suspense";
import { useFeedMessages } from "@liveblocks/react";
import {
  AvatarStack,
  Composer,
  Thread,
  Comment,
  CommentProps,
} from "@liveblocks/react-ui";
import { BrainIcon, ChevronIcon } from "./icons";

/**
 * Displays a list of threads, along with a composer for creating
 * new threads. AI respionds when tagged, and comments are displayed
 * using a custom component.
 */

export function Threads() {
  const { threads } = useThreads();

  return (
    <main>
      <header>
        <AvatarStack size={36} />
      </header>
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          className="thread"
          components={{
            // Overrides the default comment component
            Comment: (commentProps) => {
              const feedId = commentProps.comment.metadata.feedId;

              // This app's AI workflow creates a placeholder comment for AI respones
              // These comments have a `feedId`, so if we detect it, we use a custom component
              if (feedId) {
                return (
                  <AiComment feedId={feedId} commentProps={commentProps} />
                );
              }

              // If not AI feed, use the default comment component
              return <Comment {...commentProps} />;
            },
          }}
        />
      ))}
      <Composer className="composer" />
    </main>
  );
}

function AiComment({
  feedId,
  commentProps,
}: {
  feedId: string;
  commentProps: CommentProps;
}) {
  const { messages } = useFeedMessages(feedId);
  const lastMessage = messages?.[messages.length - 1];

  if (!messages || !lastMessage) {
    return (
      <StreamingComment
        commentProps={commentProps}
        title="Running…"
        responsePart=""
        response=""
      />
    );
  }

  // Thinking stage, writing up reasoning
  if (lastMessage.data.stage === "thinking") {
    return (
      <StreamingComment
        commentProps={commentProps}
        title="Thinking…"
        responsePart={lastMessage.data.responsePart}
        response={lastMessage.data.response}
      />
    );
  }

  // Writing stage, generating the actual response
  if (lastMessage.data.stage === "writing") {
    return (
      <StreamingComment
        commentProps={commentProps}
        title="Writing…"
        responsePart={lastMessage.data.responsePart}
        response={lastMessage.data.response}
      />
    );
  }

  // Complete stage, showing the full response and reasoning
  return (
    <StreamedComment
      commentProps={commentProps}
      reasoning={lastMessage.data.reasoning}
      response={lastMessage.data.response}
      thinkingTime={lastMessage.data.thinkingTime}
    />
  );
}

// Shows an AI comment in a streaming state, restricted to one line with loading text
function StreamingComment({
  commentProps,
  title,
  responsePart,
  response,
}: {
  commentProps: CommentProps;
  title: string;
  responsePart: string;
  response: string;
}) {
  const [open, setOpen] = useState(false);
  const trimmedResponsePart = responsePart.trim();

  return (
    <Comment {...commentProps}>
      <details className="" open={open} onToggle={() => setOpen(!open)}>
        <summary className="flex items-baseline cursor-pointer mb-1">
          <span className="flex-shrink-0 mr-1">
            <BrainIcon />
          </span>
          <span className="lb-ai-chat-pending">{title}</span>
          <span className="flex-shrink-0 mx-1">
            {open ? <ChevronIcon rotate /> : <ChevronIcon />}
          </span>
          <span className="lb-comment-body opacity-40 flex-shrink flex-grow text-sm truncate">
            {trimmedResponsePart.length ? `…${trimmedResponsePart}` : ""}
          </span>
        </summary>
        <div className="border border-gray-500/10 rounded-lg py-2.5 px-3 text-sm">
          {response}
        </div>
      </details>
    </Comment>
  );
}

// Shows an AI comment in a streamed state, with the full response and reasoning
function StreamedComment({
  commentProps,
  reasoning,
  response,
  thinkingTime,
}: {
  commentProps: CommentProps;
  reasoning: string;
  response: string;
  thinkingTime: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Comment {...commentProps}>
      <details className="" open={open} onToggle={() => setOpen(!open)}>
        <summary className="flex items-baseline cursor-pointer mb-1">
          <span className="opacity-50 text-sm">
            Thought for {Number(thinkingTime).toFixed(0)} seconds
          </span>
          <span className="flex-shrink-0 mx-0.5 opacity-60">
            {open ? (
              <ChevronIcon rotate size={14} />
            ) : (
              <ChevronIcon size={14} />
            )}
          </span>
        </summary>
        <div className="lb-comment-body mb-3">
          <div className="border border-gray-500/10 rounded-lg py-2.5 px-3 text-sm">
            {reasoning}
          </div>
        </div>
      </details>
      <div className="lb-comment-body whitespace-pre-wrap">{response}</div>
    </Comment>
  );
}
