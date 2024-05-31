/* eslint-disable */
// @ts-nocheck
const React = require("react");
const { createRoomContext } = require("@liveblocks/react");
const Liveblocks = require("@liveblocks/react-comments");
const { Thread } = require("@liveblocks/react-comments");
const { Composer } = require("@liveblocks/react-comments/primitives");

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
