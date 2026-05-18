"use client";

import { useFeedMessages, useUser } from "@liveblocks/react";
import { useThreads } from "@liveblocks/react/suspense";
import { Composer, Thread, Comment, CommentProps } from "@liveblocks/react-ui";
import { Markdown } from "@liveblocks/react-ui/_private";
import {
  Comment as CommentPrimitive,
  type CommentBodyLinkProps,
  type CommentBodyMentionProps,
} from "@liveblocks/react-ui/primitives";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function ThreadsPanel() {
  const { threads } = useThreads();
  const pathname = usePathname();

  const commentsCardClass =
    "shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950";

  return (
    <div className="comments-threads flex w-full max-w-none flex-col gap-3 p-3">
      <Composer
        className={`composer ${commentsCardClass}`}
        metadata={{ pathname }}
        commentMetadata={{ pathname }}
      />
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          className={`thread ${commentsCardClass}`}
          components={{
            Comment: (commentProps) => {
              const feedId = commentProps.comment.metadata?.feedId;

              if (feedId) {
                return (
                  <AiComment feedId={feedId} commentProps={commentProps} />
                );
              }

              return <Comment {...commentProps} />;
            },
          }}
        />
      ))}
    </div>
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

  return (
    <StreamedComment
      commentProps={commentProps}
      reasoning={lastMessage.data.reasoning}
      response={lastMessage.data.response}
      thinkingTime={lastMessage.data.thinkingTime}
    />
  );
}

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
    <Comment
      {...commentProps}
      body={
        <details
          className="m-0 p-0"
          open={open}
          onToggle={() => setOpen(!open)}
        >
          <summary className="mb-1 flex cursor-pointer list-none items-center ps-0 [&::-webkit-details-marker]:hidden">
            <span className="mr-1 shrink-0">
              <BrainIcon className="size-4 opacity-50" aria-hidden />
            </span>
            <span className="lb-ai-chat-pending">{title}</span>
            <span className="mx-1 shrink-0">
              <ChevronDownIcon
                className={`size-4 opacity-70 transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden
              />
            </span>
            <span className="lb-comment-body shrink grow truncate text-sm opacity-40">
              {trimmedResponsePart.length ? `…${trimmedResponsePart}` : ""}
            </span>
          </summary>
          <div className="rounded-lg border border-neutral-500/10 px-3 py-2.5 text-sm dark:border-neutral-500/15">
            {response}
          </div>
        </details>
      }
    />
  );
}

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
    <Comment
      {...commentProps}
      body={
        <>
          <details
            className="m-0 p-0"
            open={open}
            onToggle={() => setOpen(!open)}
          >
            <summary className="mb-1 flex cursor-pointer list-none items-center ps-0 [&::-webkit-details-marker]:hidden">
              <span className="text-sm opacity-50">
                Thought for {Number(thinkingTime).toFixed(0)} seconds
              </span>
              <span className="mx-0.5 shrink-0 opacity-60">
                <ChevronDownIcon
                  className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </span>
            </summary>
            <div className="lb-comment-body mb-3">
              <div className="rounded-lg border border-neutral-500/10 px-3 py-2.5 text-sm dark:border-neutral-500/15">
                {reasoning}
              </div>
            </div>
          </details>
          {commentProps.comment.metadata.feedComplete ? (
            <div className="lb-comment-body">
              <CommentPrimitive.Body
                body={commentProps.comment.body}
                components={{
                  Mention: CommentMarkdownMention,
                  Link: CommentMarkdownLink,
                }}
              />
            </div>
          ) : (
            <div className="whitespace-break-spaces">
              <Markdown content={response} />
            </div>
          )}
        </>
      }
    />
  );
}

function CommentMarkdownLink({ href, children }: CommentBodyLinkProps) {
  return (
    <a href={href} className="font-medium">
      {children}
    </a>
  );
}

function CommentMarkdownMention({ mention }: CommentBodyMentionProps) {
  return (
    <span className="lb-mention lb-comment-mention font-medium">
      @
      <ResolvedMarkdownMentionName userId={mention.id} />
    </span>
  );
}

function ResolvedMarkdownMentionName({ userId }: { userId: string }) {
  const { user, isLoading } = useUser(userId);

  if (isLoading) {
    return <>…</>;
  }

  return <>{user?.name ?? userId}</>;
}
