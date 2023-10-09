import { Composer as DefaultComposer } from "@liveblocks/react-comments";
import {
  Composer,
  ComposerSubmitComment,
} from "@liveblocks/react-comments/primitives";
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
    <>
      <Composer.Form onComposerSubmit={handleSubmit}>
        <Composer.Editor
          components={{
            // Mention: () => <Composer.Mention />,
            // MentionSuggestions: ({ userIds, selectedUserId }) => (
            //   <Composer.Suggestions>
            //     <Composer.SuggestionsList>
            //       <Composer.SuggestionsListItem value="" />
            //     </Composer.SuggestionsList>
            //   </Composer.Suggestions>
            // ),
            Link: ({ href, children }) => (
              <Composer.Link>{children}</Composer.Link>
            ),
          }}
        />
        <Composer.Submit>Create comment at {formatTime(time)}</Composer.Submit>
      </Composer.Form>
      <DefaultComposer
        onFocus={handleFocus}
        onComposerSubmit={handleSubmit}
        overrides={{
          COMPOSER_PLACEHOLDER: `Create comment at ${formatTime(time)}`,
        }}
      />
    </>
  );

  // return (
  //   <Composer
  //     onFocus={handleFocus}
  //     onComposerSubmit={handleSubmit}
  //     overrides={{
  //       COMPOSER_PLACEHOLDER: `Create comment at ${formatTime(time)}`,
  //     }}
  //   />
  // );
}
