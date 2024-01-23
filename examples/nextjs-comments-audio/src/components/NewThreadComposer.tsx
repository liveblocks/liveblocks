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
import { FormEvent, KeyboardEvent, useCallback } from "react";
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

  // Prevent multiple lines with `shift` + `enter`
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.shiftKey && event.key === "Enter") {
      event.preventDefault();
    }
  }, []);

  return (
    <Composer.Form onComposerSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3 items-center">
        {currentUser && (
          <img
            className="shrink-0 rounded-full size-9"
            width={40}
            height={40}
            src={currentUser.info.avatar}
            alt={currentUser.info.name}
          />
        )}
        <Composer.Editor
          className={cx(
            styles.composerEditor,
            "h-10 text-sm w-full px-3 bg-white/10 data-[focused]:bg-white/15 hover:bg-white/15 transition-colors duration-150 ease-out rounded-lg outline-none !whitespace-pre overflow-hidden flex justify-start items-center"
          )}
          placeholder="Write a comment…"
          onKeyDown={handleKeyDown}
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
          <CircularButton appearance="primary" size="md">
            <SendIcon className="size-4 text-inverse" />
          </CircularButton>
        </Composer.Submit>
      </div>
    </Composer.Form>
  );
}
