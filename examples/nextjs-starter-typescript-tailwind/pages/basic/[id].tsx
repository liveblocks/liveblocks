import { RoomProvider } from "@liveblocks/react";
import { useRouter } from "next/router";
import Link from "next/link";
import LiveCursors from "../../components/LiveCursors";
import LiveAvatars from "../../components/LiveAvatars";
import { useRef } from "react";

/*
const roomId = typeof window !==  "undefined"
  ? new URL(window.location.href).pathname.split('/room/')[1]
  : "";
 */

export default function MultiplayerRoom() {
  const cursorPanel = useRef(null);
  const router = useRouter();

  if (!router.query.id || Array.isArray(router.query.id)) {
    return null;
  }

  let roomId = router.query.id;
  return (
    <RoomProvider id={roomId}>
      <nav className="fixed left-5 top-5 flex space-x-3 z-10">
        <Link href="/" aria-label="Back">
          <a className="w-10 h-10 flex items-center justify-center border border-black/5 rounded-lg ease-out duration-300 shadow-sm hover:border-black/10">
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="M21 11H6.83l3.58-3.59L9 6l-6 6 6 6 1.41-1.42L6.83 13H21v-2Z" />
            </svg>
          </a>
        </Link>
      </nav>
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-10">
        <div className="flex space-x-2">
          <button
            className="w-10 h-10 flex items-center justify-center border border-black/5 rounded-lg ease-out duration-300 shadow-sm hover:border-black/10"
            aria-label="Undo"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              aria-hidden={true}
              focusable={false}
            >
              <path d="M20 13.5a6.5 6.5 0 0 1-6.5 6.5H6v-2h7.5c2.5 0 4.5-2 4.5-4.5S16 9 13.5 9H7.83l3.08 3.09L9.5 13.5 4 8l5.5-5.5 1.42 1.41L7.83 7h5.67a6.5 6.5 0 0 1 6.5 6.5Z" />
            </svg>
          </button>
          <button
            className="border border-black/5 rounded-lg relative w-10 h-10 flex items-center justify-center ease-out duration-300 shadow-sm hover:border-black/10"
            aria-label="Redo"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              aria-hidden={true}
              focusable={false}
            >
              <path d="M10.5 18H18v2h-7.5a6.5 6.5 0 1 1 0-13h5.67l-3.09-3.09L14.5 2.5 20 8l-5.5 5.5-1.41-1.41L16.17 9H10.5C8 9 6 11 6 13.5S8 18 10.5 18Z" />
            </svg>
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center border border-black/5 rounded-lg ease-out duration-300 shadow-sm hover:border-black/10"
            aria-label="Add note"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              aria-hidden={true}
              focusable={false}
            >
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z" />
            </svg>
          </button>
        </div>
      </div>
      <main
        ref={cursorPanel}
        className="flex justify-center items-center absolute inset-0 overflow-hidden"
      >
        <LiveAvatars />
        <LiveCursors cursorPanel={cursorPanel} />
      </main>
    </RoomProvider>
  );
}
