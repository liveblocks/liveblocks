import {
  Composer,
  ComposerSubmitComment,
} from "@liveblocks/react-comments/primitives";
import { ChangeEvent, FormEvent, useCallback, useState } from "react";
import { useCreateThread, useSelf } from "@/liveblocks.config";
import { formatTime } from "@/components/Duration";
import { Mention } from "@/components/Mention";
import { MentionSuggestions } from "@/components/MentionSuggestions";
import { Link } from "@/components/Link";
import styles from "./NewThreadComposer.module.css";
import { TimeIcon } from "@/icons/Time";

type Props = {
  getCurrentPercentage: () => number;
  setPlaying: (vale: boolean) => void;
  time: number;
};

export function NewThreadComposer({
  getCurrentPercentage,
  setPlaying,
  time,
}: Props) {
  const currentUser = useSelf();
  const createThread = useCreateThread();
  const [attachTime, setAttachTime] = useState(true);

  // Submit thread with current time
  const handleSubmit = useCallback(
    ({ body }: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      createThread({
        body,
        metadata: {
          resolved: false,
          time: attachTime ? time : -1,
          timePercentage: attachTime ? getCurrentPercentage() : -1,
        },
      });
    },
    [attachTime, getCurrentPercentage, time]
  );

  // Pause video on focus
  const handleFocus = useCallback(() => {
    setPlaying(false);
  }, []);

  // Stop keyboard events firing on window when typing (i.e. prevent fullscreen with `f`)
  const handleKeyDown = useCallback((event: FormEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const handleCheckboxChecked = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setAttachTime(event.target.checked);
    },
    []
  );

  return (
    <>
      <Composer.Form onComposerSubmit={handleSubmit} className={styles.wrapper}>
        <div className={styles.composer}>
          {currentUser && (
            <img
              className={styles.composerAvatar}
              width={24}
              height={24}
              src={currentUser.info.avatar}
              alt={currentUser.info.name}
            />
          )}
          <Composer.Editor
            className={styles.composerEditor}
            placeholder="Add comment…"
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            components={{
              Mention,
              MentionSuggestions,
              Link,
            }}
          />
        </div>
        <div className={styles.options}>
          <div className={styles.optionsTime}>
            <label htmlFor="attach-time">
              <TimeIcon />
              {formatTime(time)}
            </label>
            <input
              id="attach-time"
              className={styles.checkbox}
              type="checkbox"
              checked={attachTime}
              onChange={handleCheckboxChecked}
            />
          </div>
          <Composer.Submit className="button">Comment</Composer.Submit>
        </div>
      </Composer.Form>
    </>
  );
}
