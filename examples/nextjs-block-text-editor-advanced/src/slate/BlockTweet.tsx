import styles from "../../styles/BlockTweet.module.css";
import VideoIcon from "../icons/video.svg";
import { useState } from "react";
import { ReactEditor, useSlate } from "slate-react";
import { CustomElement, TweetElement } from "./types";
import { Transforms } from "slate";
import Placeholder from "./Placeholder";
import BlockTweetToolbar from "./BlockTweetToolbar";
import { TwitterTweetEmbed } from "react-twitter-embed";

type Props = {
  element: TweetElement;
};

export default function BlockTweet({ element }: Props) {
  const [showToolbar, setShowToolbar] = useState(false);
  const editor = useSlate();

  return (
    <div className={styles.block_tweet}>
      {element.url ? (
        <div className={styles.tweet_embed}>
          <TwitterTweetEmbed
            tweetId={'933354946111705097'}
          />
        </div>
      ) : (
        <Placeholder
          onClick={() => setShowToolbar(true)}
          icon={VideoIcon}
        >
          Embed Tweet here…
        </Placeholder>
      )}
      {showToolbar && (
        <BlockTweetToolbar
          url={element.url}
          setUrl={(url) => {
            const path = ReactEditor.findPath(editor, element);
            const newProperties: Partial<CustomElement> = {
              url,
            };
            Transforms.setNodes<CustomElement>(editor, newProperties, {
              at: path,
            });
          }}
          onClose={() => setShowToolbar(false)}
        />
      )}
    </div>
  );
}
