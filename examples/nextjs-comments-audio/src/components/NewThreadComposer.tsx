"use client";

import {
  Composer,
  ComposerSubmitComment,
} from "@liveblocks/react-comments/primitives";
import React, { FormEvent, KeyboardEvent, useCallback } from "react";
import { useCreateThread, useSelf } from "@/liveblocks.config";
import { Mention } from "@/components/Mention";
import { MentionSuggestions } from "@/components/MentionSuggestions";
import { Link } from "@/components/Link";
import styles from "./NewThreadComposer.module.css";
import { CircularButton } from "@/components/CircularButton";
import { SendIcon } from "@/icons/Send";

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
    <Composer.Form onComposerSubmit={handleSubmit} className={styles.wrapper}>
      <div className={styles.composer}>
        {currentUser && (
          <img
            className={styles.composerAvatar}
            width={42}
            height={42}
            src={currentUser.info.avatar}
            alt={currentUser.info.name}
          />
        )}
        <Composer.Editor
          className={styles.composerEditor}
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
          <CircularButton appearance="secondary">
            <SendIcon />
          </CircularButton>
        </Composer.Submit>
      </div>
    </Composer.Form>
  );
}
