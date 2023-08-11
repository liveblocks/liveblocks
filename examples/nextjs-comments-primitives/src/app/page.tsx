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
        "h-9 flex items-center px-4 font-semibold text-sm text-white bg-indigo-500 outline-none focus-visible:ring-2 ring-offset-2 ring-indigo-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
        "relative aspect-square rounded-full overflow-hidden bg-gray-100"
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
      className={clsx(className, "p-4 flex gap-4")}
      {...props}
    >
      <ComposerPrimitive.Editor
        placeholder={placeholder}
        className="bg-gray-50 outline-none focus-visible:ring-2 ring-offset-2 ring-indigo-300 prose prose-sm flex-1 px-3 py-2 min-h-[theme(spacing.9)] rounded-md"
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
      <div className="flex gap-3 items-center">
        <Suspense
          fallback={
            <div className="relative aspect-square rounded-full bg-gray-100 animate-pulse flex-none w-8" />
          }
        >
          <Avatar userId={comment.userId} className="flex-none w-8" />
        </Suspense>
        <div className="flex gap-2 items-baseline min-w-0">
          <Suspense fallback={comment.userId}>
            <User userId={comment.userId} className="truncate" />
          </Suspense>
          <Timestamp
            date={comment.createdAt}
            className="text-sm text-gray-500 truncate"
          />
        </div>
      </div>
      <CommentPrimitive.Body body={comment.body} className="prose mt-3" />
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
        className="border-gray-100 border-t"
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
    <main className="max-w-2xl mx-auto px-4 py-16 flex flex-col gap-4">
      {threads.map((thread) => (
        <Thread
          key={thread.id}
          thread={thread}
          className="bg-white rounded-xl shadow-md"
        />
      ))}
      <Composer
        onComposerSubmit={({ body }) => {
          createThread({ body });
        }}
        className="bg-white rounded-xl shadow-md"
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
