/* eslint-disable */
// @ts-nocheck
import React from "react";
import { createRoomContext } from "@liveblocks/react";
import * as Liveblocks from "@liveblocks/react-ui";
import { Thread } from "@liveblocks/react-ui";
import type { ThreadProps } from "@liveblocks/react-ui";
import { type InboxNotificationProps } from "@liveblocks/react-ui";
import type { ThreadProps as LiveblocksThreadProps } from "@liveblocks/react-ui";
import { type InboxNotificationProps as LiveblocksInboxNotificationProps } from "@liveblocks/react-ui";
import { Composer } from "@liveblocks/react-ui/primitives";
import type { CommentMentionProps } from "@liveblocks/react-ui/primitives";
import { type ComposerLinkProps } from "@liveblocks/react-ui/primitives";
import type { CommentMentionProps as LiveblocksCommentMentionProps } from "@liveblocks/react-ui/primitives";
import { type ComposerLinkProps as LiveblocksComposerLinkProps } from "@liveblocks/react-ui/primitives";

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
