/* eslint-disable */
// @ts-nocheck

export default async function Home() {
  const React = await import("react");
  const { createRoomContext } = await import("@liveblocks/react");
  const Liveblocks = await import("@liveblocks/react-ui");
  const { Thread } = await import("@liveblocks/react-ui");
  const { Composer } = await import("@liveblocks/react-ui/primitives");

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
