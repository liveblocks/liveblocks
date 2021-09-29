/**
 * This file shows how to add live cursors on a scrollable (on the vertical axis).
 *
 * The "x" coordinate is calculated as a percentage of the width of the window. Works well when the content of the page is centered.
 * The "y" coordinate is absolute and take the scroll position into account
 */

import {
  RoomProvider,
  useUpdateMyPresence,
  useOthers,
} from "@liveblocks/react";
import React, { useEffect } from "react";
import ExampleInfo from "../components/ExampleInfo";

function Demo() {
  const cursors = useWindowLiveCursors();

  return (
    <>
      <main>
        <div
          style={{ fontFamily: "Merriweather, serif" }}
          className="font-mono text-lg max-w-lg mx-auto leading-loose py-32"
        >
          <h2 className="text-4xl">Hello world</h2>
          <p className="mt-10">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. In non odio
            at sapien sollicitudin molestie. Interdum et malesuada fames ac ante
            ipsum primis in faucibus. Integer suscipit dolor eget odio interdum,
            a ultrices elit feugiat. Suspendisse nec mauris pharetra, auctor
            ante vel, auctor leo.
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
            mauris, nec vestibulum libero.
          </p>
          <p className="mt-6">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. In non odio
            at sapien sollicitudin molestie. Interdum et malesuada fames ac ante
            ipsum primis in faucibus. Integer suscipit dolor eget odio interdum,
            a ultrices elit feugiat. Suspendisse nec mauris pharetra, auctor
            ante vel, auctor leo.
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
            mauris, nec vestibulum libero.
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

function useWindowLiveCursors() {
  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    let scroll = {
      x: window.scrollX,
      y: window.scrollY,
    };

    let lastPosition = null;

    function transformPosition(point) {
      return {
        x: point.x / window.innerWidth,
        y: point.y,
      };
    }

    function onPointerMove(event) {
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

  return others
    .toArray()
    .filter((user) => user.presence?.cursor != null)
    .map(({ connectionId, presence, id, info }) => {
      return {
        x: presence.cursor.x * window.innerWidth,
        y: presence.cursor.y,
        connectionId,
        id,
        info,
        presence,
      };
    });
}

function Cursor({ color, x, y }) {
  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transition: "transform 0.5s cubic-bezier(.17,.93,.38,1)",
        transform: `translateX(${x}px) translateY(${y}px)`,
      }}
      width="24"
      height="36"
      viewBox="0 0 24 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
        fill={color}
      />
    </svg>
  );
}

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

export default function Root() {
  return (
    <RoomProvider id="example-window-live-cursors">
      <Demo />
      <ExampleInfo
        title="Live Cursors Scrollable Page"
        description="Open this page in multiple windows to see the live cursors."
        githubHref="https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors"
        codeSandboxHref="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors"
      />
    </RoomProvider>
  );
}
