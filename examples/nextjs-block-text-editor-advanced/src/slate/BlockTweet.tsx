import styles from "../../styles/BlockTweet.module.css";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, TweetElement } from "./types";
import { Transforms } from "slate";
import { TwitterTweetEmbed } from "react-twitter-embed";
import ImageIcon from "../icons/image.svg";
import Placeholder from "./Placeholder";

type Props = {
  element: TweetElement;
};

const tweetLinkPattern = "^https:\\/\\/(?:[\\w\\.-]+\\.)?twitter\\.com\\/.*\\/status(?:es)?\\/([^\\/\\?]+)?$";

export default function BlockTweet({ element }: Props) {
  const editor = useSlate();

  return (
    <div className={styles.block_tweet}>
      {element.tweetId ? (
        <div className={styles.tweet_embed}>
          <TwitterTweetEmbed
            tweetId={element.tweetId}
          />
        </div>
      ) : (
        <Placeholder
          inputs={{
            tweetId: {
              type: "url",
              icon: ImageIcon,
              placeholder: "Paste Tweet link…",
              title: "Please enter a valid Tweet link",
              required: true,
            },
          }}
          onSet={({ tweetId }) => {
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
