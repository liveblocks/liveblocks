import {
  Composer as ComposerPrimitive,
  ComposerFormProps,
} from "@liveblocks/react-comments/primitives";
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

export function Composer({
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
        className="prose prose-sm min-h-[theme(spacing.9)] flex-1 rounded-md px-3 py-1.5 outline outline-1 -outline-offset-1 outline-gray-200 ring-blue-300 ring-offset-2 focus-visible:ring-2 [&_[data-placeholder]]:opacity-50"
        components={{
          Mention: ({ userId }) => {
            return (
              <ComposerPrimitive.Mention className="rounded bg-blue-50 px-1 py-0.5 font-semibold text-blue-500 data-[selected]:bg-blue-500 data-[selected]:text-white">
                @
                <Suspense fallback={userId}>
                  <User userId={userId} />
                </Suspense>
              </ComposerPrimitive.Mention>
            );
          },
          MentionSuggestions: ({ userIds }) => {
            return (
              <ComposerPrimitive.Suggestions className="rounded-lg bg-white p-1 shadow-xl">
                <ComposerPrimitive.SuggestionsList>
                  {userIds.map((userId) => (
                    <ComposerPrimitive.SuggestionsListItem
                      key={userId}
                      value={userId}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[selected]:bg-gray-100"
                    >
                      <Suspense
                        fallback={
                          <div className="relative aspect-square w-6 flex-none animate-pulse rounded-full bg-gray-100" />
                        }
                      >
                        <Avatar userId={userId} className="w-5 flex-none" />
                      </Suspense>
                      <Suspense fallback={userId}>
                        <User userId={userId} />
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
      <ComposerPrimitive.Submit className="self-end" asChild>
        <Button>{submit}</Button>
      </ComposerPrimitive.Submit>
    </ComposerPrimitive.Form>
  );
}
