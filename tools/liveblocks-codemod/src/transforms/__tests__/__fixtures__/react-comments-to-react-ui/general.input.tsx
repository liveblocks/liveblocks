/* eslint-disable */
// @ts-nocheck
import React from "react";
import { createRoomContext } from "@liveblocks/react";
import { CommentsConfig } from "@liveblocks/react-comments";
import * as Liveblocks from "@liveblocks/react-comments";
import { Thread } from "@liveblocks/react-comments";
import type { ThreadProps } from "@liveblocks/react-comments";
import { type InboxNotificationProps } from "@liveblocks/react-comments";
import type { ThreadProps as LiveblocksThreadProps } from "@liveblocks/react-comments";
import { type InboxNotificationProps as LiveblocksInboxNotificationProps } from "@liveblocks/react-comments";
import { Composer } from "@liveblocks/react-comments/primitives";
import type { CommentMentionProps } from "@liveblocks/react-comments/primitives";
import { type ComposerLinkProps } from "@liveblocks/react-comments/primitives";
import type { CommentMentionProps as LiveblocksCommentMentionProps } from "@liveblocks/react-comments/primitives";
import { type ComposerLinkProps as LiveblocksComposerLinkProps } from "@liveblocks/react-comments/primitives";
import "@liveblocks/react-comments/styles.css";
import "@liveblocks/react-comments/styles/dark/attributes.css";
import "@liveblocks/react-comments/styles/dark/media-query.css";
import "./liveblocks-react-comments.css";

export default function Home() {
  return (
    <div>
      <CommentsConfig overrides={{ locale: "fr", USER_UNKNOWN: "Anonyme" }}>
        <Thread thread={null} />
        <CommentsConfig />
        <Composer.Form>
          <Composer.Editor />
          <Composer.Submit>Submit</Composer.Submit>
        </Composer.Form>
      </CommentsConfig>
    </div>
  );
}
