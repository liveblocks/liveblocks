import { Composer } from "@liveblocks/react-comments";
import { ComposerSubmitComment } from "@liveblocks/react-comments/primitives";
import { FormEvent, useCallback } from "react";
import { useCreateThread } from "@/liveblocks.config";
import { formatTime } from "@/components/Duration";

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

  const handleSubmit = useCallback(
    ({ body }: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      console.log(body);

      createThread({
        body,
        metadata: {
          resolved: false,
          timePercentage: getCurrentPercentage(),
        },
      });
    },
    [getCurrentPercentage]
  );

  const handleFocus = useCallback(() => {
    setPlaying(false);
  }, []);

  return (
    <Composer
      onFocus={handleFocus}
      onComposerSubmit={handleSubmit}
      overrides={{
        COMPOSER_PLACEHOLDER: `Create comment at ${formatTime(time)}`,
      }}
    />
  );
}
