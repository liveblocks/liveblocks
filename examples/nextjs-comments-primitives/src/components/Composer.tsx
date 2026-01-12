import {
  Composer as ComposerPrimitive,
  ComposerFormProps,
  useComposer,
  FileSize,
} from "@liveblocks/react-ui/primitives";
import clsx from "clsx";
import React, { Suspense } from "react";
import { User } from "./User";
import { Avatar } from "./Avatar";
import { Button } from "./Button";

/**
 * Custom composer that allows you to create new comments/threads.
 */

interface ComposerProps extends ComposerFormProps {
  placeholder?: string;
  submit?: string;
}

function ComposerAttachments() {
  const { attachments, removeAttachment } = useComposer();

  if (!attachments.length) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="flex items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            <span className="truncate font-semibold">
              {attachment.name} (<FileSize size={attachment.size} />)
            </span>
            <span className="flex-none text-gray-500">
              {attachment.type === "attachment" ||
              attachment.status === "uploaded"
                ? "Uploaded"
                : attachment.status === "error"
                  ? "Error"
                  : attachment.status === "uploading"
                    ? "Uploading…"
                    : null}
            </span>
          </div>
          <Button
            className="self-end"
            variant="destructive"
            onClick={() => {
              removeAttachment(attachment.id);
            }}
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}

export function Composer({
  className,
  placeholder = "Write a comment…",
  submit = "Send",
  ...props
}: ComposerProps) {
  return (
    <ComposerPrimitive.Form
      className={clsx(className, "flex flex-col gap-4 p-4")}
      {...props}
    >
      <ComposerPrimitive.Editor
        placeholder={placeholder}
        className="prose prose-sm min-h-9 max-w-none flex-1 rounded-md px-3 py-1.5 outline-solid outline-1 -outline-offset-1 outline-gray-200 ring-blue-300 ring-offset-2 focus-visible:ring-2 **:data-placeholder:opacity-50"
        components={{
          Mention: ({ mention }) => {
            return (
              <ComposerPrimitive.Mention className="rounded-sm bg-blue-50 px-1 py-0.5 font-semibold text-blue-500 data-selected:bg-blue-500 data-selected:text-white">
                @
                <Suspense fallback={mention.id}>
                  <User userId={mention.id} />
                </Suspense>
              </ComposerPrimitive.Mention>
            );
          },
          MentionSuggestions: ({ mentions }) => {
            return (
              <ComposerPrimitive.Suggestions className="rounded-lg bg-white p-1 shadow-xl">
                <ComposerPrimitive.SuggestionsList>
                  {mentions.map((mention) => (
                    <ComposerPrimitive.SuggestionsListItem
                      key={mention.id}
                      value={mention.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-selected:bg-gray-100"
                    >
                      <Suspense
                        fallback={
                          <div className="relative aspect-square w-6 flex-none animate-pulse rounded-full bg-gray-100" />
                        }
                      >
                        <Avatar userId={mention.id} className="w-5 flex-none" />
                      </Suspense>
                      <Suspense fallback={mention.id}>
                        <User userId={mention.id} />
                      </Suspense>
                    </ComposerPrimitive.SuggestionsListItem>
                  ))}
                </ComposerPrimitive.SuggestionsList>
              </ComposerPrimitive.Suggestions>
            );
          },
          // Other components can be provided:
          //
          // Link: ({ href, children }) => {
          //   return (
          //     <ComposerPrimitive.Link
          //       href={href}
          //       className="text-blue-500 underline"
          //     >
          //       {children}
          //     </ComposerPrimitive.Link>
          //   );
          // },
        }}
      />
      <ComposerAttachments />
      <div className="flex gap-4 self-end">
        <ComposerPrimitive.AttachFiles asChild>
          <Button variant="secondary">Attach files</Button>
        </ComposerPrimitive.AttachFiles>
        <ComposerPrimitive.Submit asChild>
          <Button>{submit}</Button>
        </ComposerPrimitive.Submit>
      </div>
    </ComposerPrimitive.Form>
  );
}
