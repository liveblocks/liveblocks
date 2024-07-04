"use client";

import { Link } from "@/components/Link";
import { Mention } from "@/components/Mention";
import { MentionSuggestions } from "@/components/MentionSuggestions";
import { useCreateThread, useSelf } from "@liveblocks/react/suspense";
import {
  Composer,
  ComposerSubmitComment,
} from "@liveblocks/react-ui/primitives";
import cx from "classnames";
import { FormEvent, useCallback } from "react";
import { Send as SendIcon } from "react-feather";
import { toast } from "sonner";
import styles from "./NewThreadComposer.module.css";

type Props = {
  duration: number;
  time: number;
};

export function NewThreadComposer({ duration, time }: Props) {
  const currentUser = useSelf();
  const createThread = useCreateThread();

  // Submit thread with current time
  const handleSubmit = useCallback(
    ({ body }: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      createThread({
        body,
        metadata: {
          time,
          timePercentage: (time / duration) * 100,
        },
      });

      toast.success("Comment added!");
    },
    [duration, time]
  );

  return (
    <Composer.Form onComposerSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3 items-end">
        {currentUser && (
          <div className="shrink-0 mb-0.5">
            <img
              className="rounded-full size-9"
              width={40}
              height={40}
              src={currentUser.info.avatar}
              alt={currentUser.info.name}
            />
          </div>
        )}
        <Composer.Editor
          className={cx(
            styles.composerEditor,
            "!min-h-10 px-3 py-2 w-full bg-white border border-neutral-200 rounded-lg shadow-sm outline-none"
          )}
          placeholder="Write a comment…"
          components={{
            Mention: (props) => (
              <Composer.Mention asChild>
                <Mention {...props} />
              </Composer.Mention>
            ),
            MentionSuggestions,
            Link: (props) => (
              <Composer.Link asChild>
                <Link {...props}>{props.children}</Link>
              </Composer.Link>
            ),
          }}
        />
        <Composer.Submit asChild>
          <button className="bg-neutral-900 shrink-0 size-10 rounded-full flex items-center justify-center disabled:bg-neutral-200 transition-colors duration-150 ease-out hover:bg-neutral-800 focus:bg-neutral-800">
            <SendIcon className="size-4 text-white" />
          </button>
        </Composer.Submit>
      </div>
    </Composer.Form>
  );
}
