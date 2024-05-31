/* eslint-disable */
// @ts-nocheck

export default async function Home() {
  const React = await import("react");
  const { createRoomContext } = await import("@liveblocks/react");
  const Liveblocks = await import("@liveblocks/react-comments");
  const { Thread } = await import("@liveblocks/react-comments");
  const { Composer } = await import("@liveblocks/react-comments/primitives");

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
