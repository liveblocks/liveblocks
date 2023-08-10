"use client";

import React, { ComponentProps, Suspense } from "react";
import { RoomProvider, useThreads, useUser } from "../../liveblocks.config";
import { Loading } from "../components/Loading";
import { CommentData, ThreadData } from "@liveblocks/client";
import clsx from "clsx";
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

interface CommentProps extends ComponentProps<"div"> {
  comment: CommentData;
}

interface ThreadProps extends ComponentProps<"div"> {
  thread: ThreadData;
}

function FallbackAvatar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={clsx(
        className,
        "relative aspect-square rounded-full bg-gray-50 animate-pulse"
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
        "relative aspect-square rounded-full overflow-hidden bg-gray-50"
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

function Composer({ className, ...props }: ComposerFormProps) {
  return (
    <ComposerPrimitive.Form
      className={clsx(className, "")}
      {...props}
    ></ComposerPrimitive.Form>
  );
}

function Comment({ comment, className, ...props }: CommentProps) {
  return (
    <div className={clsx(className, "p-4")} {...props}>
      <div className="flex gap-3 items-center">
        <Suspense fallback={<FallbackAvatar className="w-8" />}>
          <Avatar userId={comment.userId} className="w-8" />
        </Suspense>
        <div className="flex gap-2 items-baseline">
          <Suspense fallback={comment.userId}>
            <User userId={comment.userId} />
          </Suspense>
          <Timestamp
            date={comment.createdAt}
            className="text-sm text-gray-600"
          />
        </div>
      </div>
      <div className="mt-3">
        {comment.body ? (
          <CommentPrimitive.Body body={comment.body} />
        ) : (
          <p className="text-sm text-gray-500">
            This comment has been deleted.
          </p>
        )}
      </div>
    </div>
  );
}

function Thread({ thread, className, ...props }: ThreadProps) {
  return (
    <div
      className={clsx(
        className,
        "bg-white rounded-lg shadow-lg -space-y-2 py-1"
      )}
      {...props}
    >
      {thread.comments.map((comment) => (
        <Comment key={comment.id} comment={comment} />
      ))}
      <Composer onComposerSubmit={(comment) => {}} />
    </div>
  );
}

function Example() {
  const threads = useThreads();

  return (
    <main className="max-w-lg mx-auto py-16 flex flex-col gap-4">
      {threads.map((thread) => (
        <Thread key={thread.id} thread={thread} />
      ))}
      <Composer />
    </main>
  );
}

export default function Page() {
  // TODO: Change roomId to nextjs-comments-primitives
  return (
    <RoomProvider id="nextjs-comments" initialPresence={{}}>
      <Suspense fallback={<Loading />}>
        <Example />
      </Suspense>
    </RoomProvider>
  );
}
