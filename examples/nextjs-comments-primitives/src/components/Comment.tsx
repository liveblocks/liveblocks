import React, { ComponentProps, Suspense } from "react";
import { CommentAttachment, CommentData } from "@liveblocks/client";
import clsx from "clsx";
import { Avatar } from "./Avatar";
import { User } from "./User";
import {
  Comment as CommentPrimitive,
  FileSize,
  Timestamp,
} from "@liveblocks/react-ui/primitives";
import { useAttachmentUrl } from "@liveblocks/react";
import { Button, LinkButton } from "./Button";
import { AddReaction } from "./AddReaction";
import { Reactions } from "./Reactions";
import { Icon } from "@liveblocks/react-ui";

/**
 * Custom comment component.
 */

interface CommentProps extends ComponentProps<"div"> {
  comment: CommentData;
}

interface OpenAttachmentButtonProps extends ComponentProps<"div"> {
  attachment: CommentAttachment;
}

function OpenAttachmentButton({ attachment }: OpenAttachmentButtonProps) {
  const { url } = useAttachmentUrl(attachment.id);

  return (
    <LinkButton
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
    >
      Open
    </LinkButton>
  );
}

export function Comment({ comment, className, ...props }: CommentProps) {
  if (!comment.body) {
    return null;
  }

  return (
    <div className={clsx(className, "p-4")} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Suspense
            fallback={
              <div className="relative aspect-square w-8 flex-none animate-pulse rounded-full bg-gray-100" />
            }
          >
            <Avatar userId={comment.userId} className="w-8 flex-none" />
          </Suspense>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <Suspense fallback={comment.userId}>
                <User
                  userId={comment.userId}
                  className="truncate font-medium"
                />
              </Suspense>
              <Timestamp
                date={comment.createdAt}
                className="truncate text-sm text-gray-500"
              />
            </div>
          </div>
        </div>
        <div>
          <AddReaction comment={comment}>
            <Button variant="ghost" className="w-9 !p-0">
              <Icon.Emoji />
            </Button>
          </AddReaction>
        </div>
      </div>
      <CommentPrimitive.Body
        body={comment.body}
        className="prose mt-1.5"
        components={{
          Mention: ({ userId }) => {
            return (
              <CommentPrimitive.Mention className="font-semibold text-blue-500">
                @
                <Suspense fallback={userId}>
                  <User userId={userId} />
                </Suspense>
              </CommentPrimitive.Mention>
            );
          },
          // Other components can be provided:
          //
          // Link: ({ href, children }) => {
          //   return (
          //     <CommentPrimitive.Link
          //       href={href}
          //       className="text-blue-500 underline"
          //     >
          //       {children}
          //     </CommentPrimitive.Link>
          //   )
          // }
        }}
      />
      {comment.attachments.length > 0 ? (
        <div className="mt-4 flex flex-col">
          {comment.attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
                <span className="truncate font-semibold">
                  {attachment.name} (<FileSize size={attachment.size} />)
                </span>
              </div>
              <Suspense>
                <OpenAttachmentButton attachment={attachment} />
              </Suspense>
            </div>
          ))}
        </div>
      ) : null}
      <Suspense>
        {comment.reactions.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5">
            <Reactions comment={comment} />
          </div>
        ) : null}
      </Suspense>
    </div>
  );
}
