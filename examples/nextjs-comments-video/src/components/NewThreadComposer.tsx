import { Composer as DefaultComposer } from "@liveblocks/react-comments";
import {
  Composer,
  ComposerSubmitComment,
} from "@liveblocks/react-comments/primitives";
import { ChangeEvent, FormEvent, useCallback, useState } from "react";
import { useCreateThread } from "@/liveblocks.config";
import { formatTime } from "@/components/Duration";
import { Mention } from "@/components/Mention";
import { MentionSuggestions } from "@/components/MentionSuggestions";
import { Link } from "@/components/Link";

type Props = {
  getCurrentPercentage: () => number;
  setPlaying: (vale: boolean) => void;
  time: number;
};

// TODO show an overlay over the video when writing a comment?
// TODO place the composer over the video?

export function NewThreadComposer({
  getCurrentPercentage,
  setPlaying,
  time,
}: Props) {
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
          time: attachTime ? time : null,
          timePercentage: attachTime ? getCurrentPercentage() : null,
        },
      });
    },
    [attachTime, getCurrentPercentage, time]
  );

  // Pause video on focus
  const handleFocus = useCallback(() => {
    setPlaying(false);
  }, []);

  // Stop keyboard events firing on window when typing
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
      <Composer.Form onComposerSubmit={handleSubmit}>
        <Composer.Editor
          placeholder="Add comment"
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          components={{
            // TODO add styles to three components below
            Mention,
            MentionSuggestions,
            Link,
          }}
        />
        <div>
          <label htmlFor="attach-time">Attach time</label>
          {/* TODO this must be checked while Comments team look at my feedback */}
          <input
            id="attach-time"
            type="checkbox"
            checked={attachTime}
            onChange={handleCheckboxChecked}
          />
        </div>
        <Composer.Submit>Create comment at {formatTime(time)}</Composer.Submit>
      </Composer.Form>
    </>
  );
}
