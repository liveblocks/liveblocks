"use client";

import { ClientSideSuspense, useFeedMessages } from "@liveblocks/react";
import { useUser } from "@liveblocks/react/suspense";
import { Comment, type CommentProps } from "@liveblocks/react-ui";
import { Comment as CommentPrimitive } from "@liveblocks/react-ui/primitives";
import { Markdown } from "@liveblocks/react-ui/_private";
import Link from "next/link";
import { type ComponentProps, useState } from "react";

export function FlowchartThreadComment(props: CommentProps) {
  const rawFeedId = props.comment.metadata?.feedId;
  const feedId = typeof rawFeedId === "string" ? rawFeedId : undefined;

  if (feedId) {
    return <AiComment feedId={feedId} commentProps={props} />;
  }

  return <Comment {...props} />;
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
          className="flowchart-ai-comment-details"
          open={open}
          onToggle={() => setOpen(!open)}
        >
          <summary className="flowchart-ai-comment-summary">
            <span className="flowchart-ai-comment-summary-icon">
              <BrainIcon />
            </span>
            <span className="lb-ai-chat-pending flowchart-ai-comment-title">
              {title}
            </span>
            <span className="flowchart-ai-comment-summary-chevron">
              <ChevronIcon rotate={open} />
            </span>
            <span className="lb-comment-body flowchart-ai-comment-preview">
              {trimmedResponsePart.length ? `…${trimmedResponsePart}` : ""}
            </span>
          </summary>
          <div className="flowchart-ai-comment-expanded">{response}</div>
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
  const hasReasoning = reasoning.trim().length > 0;

  return (
    <Comment
      {...commentProps}
      body={
        <>
          {hasReasoning ? (
            <details
              className="flowchart-ai-comment-details"
              open={open}
              onToggle={() => setOpen(!open)}
            >
              <summary className="flowchart-ai-comment-summary">
                <span className="flowchart-ai-comment-thought-time">
                  Thought for {Number(thinkingTime).toFixed(0)} seconds
                </span>
                <span className="flowchart-ai-comment-summary-chevron flowchart-ai-comment-summary-chevron-muted">
                  <ChevronIcon rotate={open} size={14} />
                </span>
              </summary>
              <div className="lb-comment-body flowchart-ai-comment-reasoning">
                <div className="flowchart-ai-comment-expanded">{reasoning}</div>
              </div>
            </details>
          ) : null}
          {commentProps.comment.metadata.feedComplete ? (
            <CommentPrimitive.Body
              body={commentProps.comment.body}
              components={{
                Mention: ({ mention }) => (
                  <span className="font-medium text-accent">
                    @
                    <ClientSideSuspense fallback="…">
                      <User userId={mention.id} />
                    </ClientSideSuspense>
                  </span>
                ),
                Link: ({ href, children }) => (
                  <Link href={href}>{children}</Link>
                ),
              }}
            />
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

function ChevronIcon({
  rotate = false,
  size = 17,
}: {
  rotate?: boolean;
  size?: number;
}) {
  return (
    <svg
      className={
        rotate
          ? "flowchart-ai-comment-chevron flowchart-ai-comment-chevron--open"
          : "flowchart-ai-comment-chevron"
      }
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="presentation"
    >
      <path d="M14.5 8.5 10 13 5.5 8.5" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg
      className="flowchart-ai-comment-brain-icon"
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 18V5M15 13a4.17 4.17 0 01-3-4 4.17 4.17 0 01-3 4M17.598 6.5A3 3 0 1012 5a3 3 0 10-5.598 1.5M17.997 5.125a4 4 0 012.526 5.77M18 18a4 4 0 002-7.464" />
      <path d="M19.967 17.483A4 4 0 1112 18a4 4 0 11-7.967-.517M6 18a4 4 0 01-2-7.464M6.003 5.125a4 4 0 00-2.526 5.77" />
    </svg>
  );
}

interface UserProps extends ComponentProps<"span"> {
  userId: string;
}

function User({ userId, ...props }: UserProps) {
  const { user } = useUser(userId);

  return <span {...props}>{user?.name ?? userId}</span>;
}
