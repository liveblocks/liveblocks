"use client";

import {
  useThreads,
  useRoom,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { useOthers, useSelf, useRoomInfo } from "@liveblocks/react";
import { ThreadData } from "@liveblocks/client";
import {
  Composer,
  Thread,
  Comment,
  Icon,
  CommentProps,
} from "@liveblocks/react-ui";
import { useFeedMessages } from "@liveblocks/react";
import { type ComponentPropsWithoutRef, type ReactNode, useState } from "react";
import Link from "next/link";
import { getIssueId, getRoomId, type ProgressState } from "@/config";
import { AiBrainIcon } from "@/icons/AiBrainIcon";
import { AiCommentChevronIcon } from "@/icons/AiCommentChevronIcon";
import { IssueThreadBranchIcon } from "@/icons/IssueThreadBranchIcon";
import { ProgressDoneIcon } from "@/icons/ProgressDoneIcon";
import { ProgressInProgressIcon } from "@/icons/ProgressInProgressIcon";
import { ProgressInReviewIcon } from "@/icons/ProgressInReviewIcon";
import { ProgressTodoIcon } from "@/icons/ProgressTodoIcon";

function useUserIdPresence(userId: string) {
  const isSelf = useSelf((self) => self.id === userId) ?? false;
  const isOther =
    useOthers((others) => others.some((other) => other.id === userId)) ?? false;
  return isSelf || isOther;
}

function CommentAvatarWithPresence({ userId }: { userId: string }) {
  const isPresent = useUserIdPresence(userId);

  return (
    <div className="relative isolate">
      <Comment.Avatar userId={userId} />
      {isPresent && (
        <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 z-10 ring-2 ring-[var(--lb-dynamic-background)]" />
      )}
    </div>
  );
}

function CommentWithPresence({
  comment,
  ...props
}: ComponentPropsWithoutRef<typeof Comment>) {
  return (
    <Comment
      {...props}
      comment={comment}
      avatar={<CommentAvatarWithPresence userId={comment.userId} />}
    />
  );
}

function ThreadCommentRenderer(
  props: ComponentPropsWithoutRef<typeof Comment>
) {
  const rawFeedId = props.comment.metadata?.feedId;
  const feedId = typeof rawFeedId === "string" ? rawFeedId : undefined;

  if (feedId) {
    return (
      <AiComment
        feedId={feedId}
        commentProps={props as CommentProps}
        avatar={<CommentAvatarWithPresence userId={props.comment.userId} />}
      />
    );
  }

  return <CommentWithPresence {...props} />;
}

export function Comments() {
  return (
    <>
      <div className="font-medium">Comments</div>
      <ClientSideSuspense
        fallback={
          <>
            <div className="bg-gray-100/80 animate-pulse h-[130px] rounded-lg my-6" />
          </>
        }
      >
        <ThreadList />
        <Composer className="border border-neutral-200 !my-4 rounded-lg overflow-hidden shadow-sm bg-white" />
      </ClientSideSuspense>
    </>
  );
}

function ThreadList() {
  const { threads } = useThreads();

  if (threads.length === 0) {
    return null;
  }

  return (
    <div className="">
      {threads.map((thread) => (
        <CustomThread key={thread.id} thread={thread} />
      ))}
    </div>
  );
}

function CustomThread({ thread }: { thread: ThreadData }) {
  const [open, setOpen] = useState(!thread.resolved);
  const room = useRoom();
  const issueId = getIssueId(room.id);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border border-neutral-200 my-4 rounded-lg overflow-hidden shadow-sm bg-white w-full text-sm text-left flex items-center h-10 px-3"
      >
        <Icon.Check className="mr-1.5" /> Thread resolved
      </button>
    );
  }

  return (
    <Thread
      key={thread.id}
      thread={thread}
      className="border border-neutral-200 my-4 rounded-lg overflow-hidden shadow-sm bg-white"
      onResolvedChange={(resolved) => {
        if (resolved) {
          setOpen(false);
        }
      }}
      components={{ Comment: ThreadCommentRenderer }}
      commentDropdownItems={({ children, comment }) => (
        <>
          <Comment.DropdownItem
            onSelect={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/issue/${issueId}#${comment.id}`
              );
            }}
            icon={<Icon.Copy className="m-[0.5px] mt-px mb-0" />}
          >
            Copy link
          </Comment.DropdownItem>
          {children}
        </>
      )}
    />
  );
}

function AiComment({
  feedId,
  commentProps,
  avatar,
}: {
  feedId: string;
  commentProps: CommentProps;
  avatar: ReactNode;
}) {
  const { messages } = useFeedMessages(feedId);
  const lastMessage = messages?.[messages.length - 1];

  if (!messages || !lastMessage) {
    return (
      <StreamingComment
        commentProps={commentProps}
        avatar={avatar}
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
        avatar={avatar}
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
        avatar={avatar}
        title="Writing…"
        responsePart={lastMessage.data.responsePart}
        response={lastMessage.data.response}
      />
    );
  }

  const createdIssueId = commentProps.comment.metadata?.createdIssueId;

  return (
    <StreamedComment
      commentProps={commentProps}
      avatar={avatar}
      reasoning={lastMessage.data.reasoning}
      response={lastMessage.data.response}
      thinkingTime={lastMessage.data.thinkingTime}
      createdIssueId={createdIssueId}
    />
  );
}

function StreamingComment({
  commentProps,
  avatar,
  title,
  responsePart,
  response,
}: {
  commentProps: CommentProps;
  avatar: ReactNode;
  title: string;
  responsePart: string;
  response: string;
}) {
  const [open, setOpen] = useState(false);
  const trimmedResponsePart = responsePart.trim();

  return (
    <Comment
      {...commentProps}
      avatar={avatar}
      body={
        <details open={open} onToggle={() => setOpen(!open)}>
          <summary className="flex items-baseline cursor-pointer mb-1">
            <span className="shrink-0 mr-1">
              <AiBrainIcon />
            </span>
            <span className="lb-ai-chat-pending">{title}</span>
            <span className="shrink-0 mx-1">
              {open ? (
                <AiCommentChevronIcon rotate />
              ) : (
                <AiCommentChevronIcon />
              )}
            </span>
            <span className="lb-comment-body opacity-40 shrink grow text-sm truncate">
              {trimmedResponsePart.length ? `…${trimmedResponsePart}` : ""}
            </span>
          </summary>
          <div className="border border-gray-500/10 rounded-lg py-2.5 px-3 text-sm">
            {response}
          </div>
        </details>
      }
    />
  );
}

function StreamedComment({
  commentProps,
  avatar,
  reasoning,
  response,
  thinkingTime,
  createdIssueId,
}: {
  commentProps: CommentProps;
  avatar: ReactNode;
  reasoning: string;
  response: string;
  thinkingTime: number;
  createdIssueId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Comment
      {...commentProps}
      avatar={avatar}
      body={
        <>
          <details open={open} onToggle={() => setOpen(!open)}>
            <summary className="flex items-baseline cursor-pointer mb-1">
              <span className="opacity-50 text-sm">
                Thought for {Number(thinkingTime).toFixed(0)} seconds
              </span>
              <span className="shrink-0 mx-0.5 opacity-60">
                {open ? (
                  <AiCommentChevronIcon rotate size={14} />
                ) : (
                  <AiCommentChevronIcon size={14} />
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
          {createdIssueId ? (
            <div className="mt-2">
              <ClientSideSuspense
                fallback={
                  <div className="ml-1 flex items-start gap-1.5 pl-0.5">
                    <IssueInlinePreviewLead />
                    <span
                      className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-dashed border-neutral-300"
                      aria-hidden
                    />
                    <span className="text-[13px] text-neutral-400">
                      Loading issue…
                    </span>
                  </div>
                }
              >
                <CreatedIssueInlineRef issueId={createdIssueId} />
              </ClientSideSuspense>
            </div>
          ) : null}
        </>
      }
    />
  );
}

function IssueInlinePreviewLead({
  progress,
}: {
  progress?: ProgressState | string;
}) {
  return (
    <span className="inline-flex shrink-0 items-start gap-0.5">
      <IssueThreadBranchIcon className="shrink-0 -mt-1 opacity-40" />
      <IssueInlinePreviewProgressIcon progress={progress} />
    </span>
  );
}

function IssueInlinePreviewProgressIcon({
  progress,
}: {
  progress?: ProgressState | string;
}) {
  const p = progress ?? "none";
  if (p === "none") {
    return null;
  }
  switch (p) {
    case "todo":
      return <ProgressTodoIcon className="h-4 w-4 shrink-0 text-neutral-500" />;
    case "progress":
      return (
        <ProgressInProgressIcon className="h-4 w-4 shrink-0 text-yellow-500" />
      );
    case "review":
      return (
        <ProgressInReviewIcon className="h-4 w-4 shrink-0 text-emerald-500" />
      );
    case "done":
      return <ProgressDoneIcon className="h-4 w-4 shrink-0 text-indigo-500" />;
    default:
      return null;
  }
}

function CreatedIssueInlineRef({ issueId }: { issueId: string }) {
  const roomId = getRoomId(issueId);
  const { info, error, isLoading } = useRoomInfo(roomId);

  if (isLoading) {
    return (
      <div className="ml-1 flex items-start gap-1.5 pl-0.5">
        <IssueInlinePreviewLead />
        <span
          className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-dashed border-neutral-300 animate-pulse"
          aria-hidden
        />
        <span className="text-[13px] text-neutral-400">Loading issue…</span>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="ml-1 flex items-start gap-1.5 pl-0.5 text-[13px] text-neutral-400">
        <IssueInlinePreviewLead />
        <span>Could not load issue.</span>
      </div>
    );
  }

  return (
    <div className="ml-1 flex items-start gap-1.5 pl-0.5">
      <IssueInlinePreviewLead progress={info.metadata.progress} />
      <Link
        href={`/issue/${issueId}`}
        className="min-w-0 flex-1 text-left text-[13px] leading-snug text-neutral-700 hover:text-neutral-950 hover:underline underline-offset-2"
      >
        <span className="text-neutral-800">{info.metadata.title}</span>
      </Link>
    </div>
  );
}
