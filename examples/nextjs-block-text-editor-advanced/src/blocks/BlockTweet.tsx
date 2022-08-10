import styles from "./BlockTweet.module.css";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, TweetElement } from "../types";
import { Transforms } from "slate";
import { TwitterTweetEmbed } from "react-twitter-embed";
import TwitterIcon from "../icons/twitter.svg";
import Placeholder from "../components/Placeholder";

type Props = {
  element: TweetElement;
};

const tweetLinkPattern =
  "^https:\\/\\/(?:[\\w\\.-]+\\.)?twitter\\.com\\/.*\\/status(?:es)?\\/([^\\/\\?]+)?$";

export default function BlockTweet({ element }: Props) {
  const editor = useSlate();

  return (
    <div className={styles.block_tweet}>
      {element.tweetId ? (
        <div className={styles.tweet_embed}>
          <TwitterTweetEmbed tweetId={element.tweetId} />
        </div>
      ) : (
        <Placeholder
          icon={TwitterIcon}
          text="Embed a Tweet"
          inputs={{
            tweetId: {
              type: "url",
              label: "URL",
              placeholder: "Paste Tweet link…",
              title: "Please enter a valid Tweet link",
              required: true,
            },
          }}
          onSubmit={({ tweetId }) => {
            const match = tweetId.match(new RegExp(tweetLinkPattern));
            if (!match?.[1]) {
              return;
            }
            tweetId = match[1];

            const path = ReactEditor.findPath(editor, element);
            const newProperties: Partial<CustomElement> = {
              tweetId,
            };
            Transforms.setNodes<CustomElement>(editor, newProperties, {
              at: path,
            });
          }}
        />
      )}
    </div>
  );
}
