/* eslint-disable */
// @ts-nocheck
import React from "react";
import { createRoomContext } from "@liveblocks/react";
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

export default function Home() {
  return (
    <div>
      <Thread thread={null} />
      <Composer.Form>
        <Composer.Editor />
        <Composer.Submit>Submit</Composer.Submit>
      </Composer.Form>
    </div>
  );
}
