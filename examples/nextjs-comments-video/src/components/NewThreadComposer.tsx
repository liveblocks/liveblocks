import { Composer } from "@liveblocks/react-comments";
import { ComposerSubmitComment } from "@liveblocks/react-comments/dist/primitives";
import { FormEvent, useCallback } from "react";
import { useCreateThread } from "@/liveblocks.config";

type Props = {
  getCurrentPercentage: () => number;
};

export function NewThreadComposer({ getCurrentPercentage }: Props) {
  const createThread = useCreateThread();

  const handleSubmit = useCallback(
    ({ body }: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      console.log("here", getCurrentPercentage());
      return;

      createThread({
        body,
        metadata: { time: getCurrentPercentage() },
      });
    },
    [getCurrentPercentage]
  );

  return <Composer onComposerSubmit={handleSubmit} />;
}
