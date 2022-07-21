import {
  RoomProvider,
  useUpdateMyPresence,
  useOthers,
} from "../liveblocks.config";
import { useRouter } from "next/router";
import React, { useEffect, useMemo } from "react";
import Cursor from "../components/Cursor";

/**
 * This file shows how to add live cursors on a scrollable page (on the vertical axis).
 *
 * The "x" coordinate is calculated as a percentage of the width of the window. Works well when the content of the page is centered.
 * The "y" coordinate is absolute and take the scroll position into account
 */

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

function useLiveCursors() {
  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    let scroll = {
      x: window.scrollX,
      y: window.scrollY,
    };

    let lastPosition: { x: number; y: number } | null = null;

    function transformPosition(cursor: { x: number; y: number }) {
      return {
        x: cursor.x / window.innerWidth,
        y: cursor.y,
      };
    }

    function onPointerMove(event: PointerEvent) {
      event.preventDefault();
      const position = {
        x: event.pageX,
        y: event.pageY,
      };
      lastPosition = position;
      updateMyPresence({
        cursor: transformPosition(position),
      });
    }

    function onPointerLeave() {
      lastPosition = null;
      updateMyPresence({ cursor: null });
    }

    function onDocumentScroll() {
      if (lastPosition) {
        const offsetX = window.scrollX - scroll.x;
        const offsetY = window.scrollY - scroll.y;
        const position = {
          x: lastPosition.x + offsetX,
          y: lastPosition.y + offsetY,
        };
        lastPosition = position;
        updateMyPresence({
          cursor: transformPosition(position),
        });
      }
      scroll.x = window.scrollX;
      scroll.y = window.scrollY;
    }

    document.addEventListener("scroll", onDocumentScroll);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerleave", onPointerLeave);

    return () => {
      document.removeEventListener("scroll", onDocumentScroll);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [updateMyPresence]);

  const others = useOthers();

  const cursors = [];

  for (const { connectionId, presence } of others) {
    if (presence?.cursor) {
      cursors.push({
        x: presence.cursor.x * window.innerWidth,
        y: presence.cursor.y,
        connectionId,
      });
    }
  }

  return cursors;
}

function Example() {
  const cursors = useLiveCursors();

  return (
    <>
      <main>
        <div className="mx-auto max-w-xl py-32 px-6 font-serif text-lg leading-loose">
          <h2 className="text-4xl font-bold">Hello world</h2>
          <p className="mt-10">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. In non odio
            at sapien sollicitudin molestie. Interdum et malesuada fames ac ante
            ipsum primis in faucibus. Integer suscipit dolor eget odio interdum,
            a ultrices elit feugiat. Suspendisse nec mauris pharetra, auctor
            ante vel.
          </p>
          <p className="mt-6">
            Donec eu lectus tristique, semper dolor at, laoreet urna. Nullam at
            pulvinar ligula. Sed luctus eu enim quis sagittis. Quisque justo
            sem, finibus eu mauris sit amet, venenatis egestas velit. Donec
            consequat porta gravida. Nunc egestas, ipsum a rhoncus semper, magna
            nulla accumsan odio, et rutrum neque diam id erat. Nulla sit amet
            sodales est.
          </p>
          <p className="mt-6">
            Fusce venenatis arcu a dolor dapibus, non placerat leo egestas.
            Fusce ultrices ligula vel nunc sodales, a condimentum arcu placerat.
            Nulla pretium nunc a nunc egestas egestas. Duis vel hendrerit elit,
            vel malesuada tellus. Integer posuere, metus quis blandit suscipit,
            lacus purus gravida neque, faucibus condimentum arcu magna in quam.
            Donec a augue nec neque sagittis luctus. Nunc lobortis nunc sit amet
            ligula sollicitudin, non euismod augue vestibulum. Sed ut mollis
            mauris, nec vestibulum.
          </p>
          <p className="mt-6">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. In non odio
            at sapien sollicitudin molestie. Interdum et malesuada fames ac ante
            ipsum primis in faucibus. Integer suscipit dolor eget odio interdum,
            a ultrices elit feugiat. Suspendisse nec mauris pharetra, auctor
            ante vel.
          </p>
          <p className="mt-6">
            Donec eu lectus tristique, semper dolor at, laoreet urna. Nullam at
            pulvinar ligula. Sed luctus eu enim quis sagittis. Quisque justo
            sem, finibus eu mauris sit amet, venenatis egestas velit. Donec
            consequat porta gravida. Nunc egestas, ipsum a rhoncus semper, magna
            nulla accumsan odio, et rutrum neque diam id erat. Nulla sit amet
            sodales est.
          </p>
          <p className="mt-6">
            Fusce venenatis arcu a dolor dapibus, non placerat leo egestas.
            Fusce ultrices ligula vel nunc sodales, a condimentum arcu placerat.
            Nulla pretium nunc a nunc egestas egestas. Duis vel hendrerit elit,
            vel malesuada tellus. Integer posuere, metus quis blandit suscipit,
            lacus purus gravida neque, faucibus condimentum arcu magna in quam.
            Donec a augue nec neque sagittis luctus. Nunc lobortis nunc sit amet
            ligula sollicitudin, non euismod augue vestibulum. Sed ut mollis
            mauris, nec vestibulum.
          </p>
        </div>
      </main>

      {cursors.map(({ x, y, connectionId }) => (
        <Cursor
          key={connectionId}
          color={COLORS[connectionId % COLORS.length]}
          x={x}
          y={y}
        />
      ))}
    </>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-live-cursors-scroll");

  return (
    <RoomProvider
      id={roomId}
      /**
       * Initialize the cursor position to null when joining the room
       */
      initialPresence={{
        cursor: null,
      }}
    >
      <Example />
    </RoomProvider>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors-scroll#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors-scroll#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useOverrideRoomId(roomId: string) {
  const { query } = useRouter();
  const overrideRoomId = useMemo(() => {
    return query?.roomId ? `${roomId}-${query.roomId}` : roomId;
  }, [query, roomId]);

  return overrideRoomId;
}
