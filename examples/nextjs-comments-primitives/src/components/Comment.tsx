import React, { ComponentProps, Suspense } from "react";
import { CommentData } from "@liveblocks/client";
import clsx from "clsx";
import { Avatar } from "./Avatar";
import { User } from "./User";
import {
  Comment as CommentPrimitive,
  Timestamp,
} from "@liveblocks/react-comments/primitives";

/**
 * Custom comment component.
 */

interface CommentProps extends ComponentProps<"div"> {
  comment: CommentData;
}

export function Comment({ comment, className, ...props }: CommentProps) {
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
        // A renderLink prop is also available to customize how links are rendered on a comment.
        // Here's an example of how you can customize the link component:
        //
        // renderLink={({ url }) => {
        //   const href = url.startsWith("http") ? url : `https://${url}`;
        //   return (
        //     <CommentPrimitive.Link
        //       href={href}
        //       target="_blank"
        //       rel="noopener noreferrer nofollow"
        //       className="text-blue-500 underline"
        //     >
        //       {url}
        //     </CommentPrimitive.Link>
        //   )
        // }}
      />
    </div>
  );
}
