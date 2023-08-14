"use client";

import clsx from "clsx";
import React, { ComponentProps, Suspense } from "react";
import {
  RoomProvider,
  useCreateComment,
  useCreateThread,
  useThreads,
  useUser,
} from "../../liveblocks.config";
import { Loading } from "../components/Loading";
import { CommentData, ThreadData } from "@liveblocks/client";
import {
  Comment as CommentPrimitive,
  Composer as ComposerPrimitive,
  Timestamp,
} from "@liveblocks/react-comments/primitives";
import { ComposerFormProps } from "@liveblocks/react-comments/primitives";

interface AvatarProps extends ComponentProps<"div"> {
  userId: string;
}

interface UserProps extends ComponentProps<"span"> {
  userId: string;
}

interface ComposerProps extends ComposerFormProps {
  placeholder?: string;
  submit?: string;
}

interface CommentProps extends ComponentProps<"div"> {
  comment: CommentData;
}

interface ThreadProps extends ComponentProps<"div"> {
  thread: ThreadData;
}

function Button({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      className={clsx(
        className,
        "flex h-9 items-center rounded-md bg-blue-500 px-4 text-sm font-semibold text-white outline-none ring-blue-300 ring-offset-2 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
      )}
      {...props}
    />
  );
}

function Avatar({ userId, className, ...props }: AvatarProps) {
  const { user } = useUser(userId);

  return (
    <div
      className={clsx(
        className,
        "relative aspect-square overflow-hidden rounded-full bg-gray-100"
      )}
      {...props}
    >
      {user && (
        <img
          src={user?.avatar}
          alt={user?.name}
          className="absolute inset-0 object-cover"
        />
      )}
    </div>
  );
}

function User({ userId, className, ...props }: UserProps) {
  const { user } = useUser(userId);

  return (
    <span className={clsx(className, "")} {...props}>
      {user?.name ?? userId}
    </span>
  );
}

function Composer({
  className,
  placeholder = "Write a comment…",
  submit = "Send",
  ...props
}: ComposerProps) {
  return (
    <ComposerPrimitive.Form
      className={clsx(className, "flex gap-4 p-4")}
      {...props}
    >
      <ComposerPrimitive.Editor
        placeholder={placeholder}
        className="prose prose-sm min-h-[theme(spacing.9)] flex-1 rounded-md px-3 py-1.5 outline outline-1 -outline-offset-1 outline-gray-200 ring-blue-300 ring-offset-2 focus-visible:ring-2"
        renderMention={({ userId }) => {
          return (
            <ComposerPrimitive.Mention className="rounded bg-blue-50 px-1 py-0.5 font-semibold text-blue-500 data-[selected]:bg-blue-500 data-[selected]:text-white">
              @
              <Suspense fallback={userId}>
                <User userId={userId} />
              </Suspense>
            </ComposerPrimitive.Mention>
          );
        }}
        renderMentionSuggestions={({ userIds }) => {
          return (
            <ComposerPrimitive.Suggestions className="rounded-lg bg-white p-1 shadow-xl">
              <ComposerPrimitive.SuggestionsList>
                {userIds.map((userId) => (
                  <ComposerPrimitive.SuggestionsListItem
                    key={userId}
                    value={userId}
                    className="flex cursor-pointer gap-2 rounded-md px-2 py-1.5 data-[selected]:bg-gray-100"
                  >
                    <Suspense
                      fallback={
                        <div className="relative aspect-square w-6 flex-none animate-pulse rounded-full bg-gray-100" />
                      }
                    >
                      <Avatar userId={userId} className="w-6 flex-none" />
                    </Suspense>
                    <Suspense fallback={userId}>
                      <User userId={userId} />
                    </Suspense>
                  </ComposerPrimitive.SuggestionsListItem>
                ))}
              </ComposerPrimitive.SuggestionsList>
            </ComposerPrimitive.Suggestions>
          );
        }}
      />
      <ComposerPrimitive.Submit className="self-end" asChild>
        <Button>{submit}</Button>
      </ComposerPrimitive.Submit>
    </ComposerPrimitive.Form>
  );
}

function Comment({ comment, className, ...props }: CommentProps) {
  if (!comment.body) {
    return null;
  }

  return (
    <div className={clsx(className, "p-4")} {...props}>
      <div className="flex items-center gap-3">
        <Suspense
          fallback={
            <div className="relative aspect-square w-8 flex-none animate-pulse rounded-full bg-gray-100" />
          }
        >
          <Avatar userId={comment.userId} className="w-8 flex-none" />
        </Suspense>
        <div className="flex min-w-0 items-baseline gap-2">
          <Suspense fallback={comment.userId}>
            <User userId={comment.userId} className="truncate font-semibold" />
          </Suspense>
          <Timestamp
            date={comment.createdAt}
            className="truncate text-sm text-gray-500"
          />
        </div>
      </div>
      <CommentPrimitive.Body
        body={comment.body}
        className="prose mt-3"
        renderMention={({ userId }) => {
          return (
            <CommentPrimitive.Mention className="font-semibold text-blue-500">
              @
              <Suspense fallback={userId}>
                <User userId={userId} />
              </Suspense>
            </CommentPrimitive.Mention>
          );
        }}
      />
    </div>
  );
}

function Thread({ thread, className, ...props }: ThreadProps) {
  const createComment = useCreateComment();

  return (
    <div className={clsx(className, "")} {...props}>
      <div className="-space-y-4">
        {thread.comments.map((comment) => (
          <Comment key={comment.id} comment={comment} />
        ))}
      </div>
      <Composer
        className="border-t border-gray-200"
        placeholder="Reply to thread…"
        submit="Reply"
        onComposerSubmit={({ body }) => {
          createComment({
            threadId: thread.id,
            body,
          });
        }}
      />
    </div>
  );
}

function Example() {
  const threads = useThreads();
  const createThread = useCreateThread();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          className="rounded-xl bg-white shadow-md"
        />
      ))}
      <Composer
        onComposerSubmit={({ body }) => {
          createThread({ body });
        }}
        className="rounded-xl bg-white shadow-md"
      />
    </main>
  );
}

export default function Page() {
  return (
    <RoomProvider id="nextjs-comments-primitives" initialPresence={{}}>
      <Suspense fallback={<Loading />}>
        <Example />
      </Suspense>
    </RoomProvider>
  );
}
