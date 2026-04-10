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
import { Tooltip } from "radix-ui";

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

/**
 * Custom comment component.
 */
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
              <div className="flex items-center gap-1.5">
                <Timestamp
                  date={comment.createdAt}
                  className="truncate text-sm text-gray-500"
                />
                <Tooltip.Root>
                  <Tooltip.Trigger className="h-4 w-4 cursor-help">
                    <Icon.Code className="h-4 w-4 text-gray-500 hover:text-gray-700 focus:text-gray-700" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      sideOffset={8}
                      className="max-w-[300px] rounded-lg bg-white px-2 py-1.5 text-sm text-gray-600 shadow-xl"
                    >
                      {comment.metadata.userAgent}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </div>
            </div>
          </div>
        </div>
        <div>
          <AddReaction comment={comment}>
            <Button variant="ghost" className="p-0! w-9">
              <Icon.Emoji />
            </Button>
          </AddReaction>
        </div>
      </div>
      <CommentPrimitive.Body
        body={comment.body}
        className="prose mt-1.5"
        components={{
          Mention: ({ mention }) => {
            return (
              <CommentPrimitive.Mention className="font-semibold text-blue-500">
                @
                <Suspense fallback={mention.id}>
                  <User userId={mention.id} />
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
