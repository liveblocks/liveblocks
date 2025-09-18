/* eslint-disable */
// @ts-nocheck
import React from "react";
import { LiveblocksUIConfig } from "@liveblocks/react-ui";

export default function Home() {
  return (
    <div>
      <LiveblocksUIConfig overrides={{ locale: "fr", USER_UNKNOWN: "Anonyme" }}>
        <Thread thread={null} />
        <CommentsConfig />
        <Composer.Form>
          <Composer.Editor />
          <Composer.Submit>Submit</Composer.Submit>
        </Composer.Form>
      </LiveblocksUIConfig>
    </div>
  );
}
