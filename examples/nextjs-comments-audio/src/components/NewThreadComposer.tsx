"use client";

import { CircularButton } from "@/components/CircularButton";
import { Link } from "@/components/Link";
import { Mention } from "@/components/Mention";
import { MentionSuggestions } from "@/components/MentionSuggestions";
import { useCreateThread, useSelf } from "@/liveblocks.config";
import {
  Composer,
  ComposerSubmitComment,
} from "@liveblocks/react-comments/primitives";
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
          resolved: false,
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
      <div className="flex gap-4 items-end">
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
            "!min-h-10 px-3 py-2 w-full bg-secondary border border-primary rounded-md outline-none shadow"
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
          <CircularButton size="md">
            <SendIcon className="size-4 text-inverse" />
          </CircularButton>
        </Composer.Submit>
      </div>
    </Composer.Form>
  );
}
