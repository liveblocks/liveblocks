import React, { useMemo } from "react";
import { Avatar } from "../components/Avatar";
import { RoomProvider, useOthers, useSelf } from "@liveblocks/react";
import { useRouter } from "next/router";
import styles from "./index.module.css";

function Example() {
  const users = useOthers().toArray();
  const currentUser = useSelf();
  const hasMoreUsers = users.length > 3;

  return (
    <main className="flex place-items-center place-content-center w-full h-screen select-none">
      <div className="flex pl-3">
        {users.slice(0, 3).map(({ connectionId, info }) => {
          return (
            <Avatar
              key={connectionId}
              picture={info?.picture}
              name={info?.name}
            />
          );
        })}

        {hasMoreUsers && <div className={styles.more}>+{users.length - 3}</div>}

        {currentUser && (
          <div className="relative ml-8">
            <Avatar picture={currentUser.info?.picture} name="You" />
          </div>
        )}
      </div>
    </main>
  );
}

const defaultRoomId = "nextjs-live-avatars";

export default function Page() {
  const { query } = useRouter();
  const roomId = useMemo(() => {
    /**
     * Add a suffix to the room ID using a query parameter.
     * Used for coordinating rooms from outside (e.g. https://liveblocks.io/examples).
     *
     * http://localhost:3000/?room=1234 → nextjs-live-avatars-1234
     */
    return query?.room ? `${defaultRoomId}-${query.room}` : defaultRoomId;
  }, [query]);

  return (
    <RoomProvider id={roomId}>
      <Example />
    </RoomProvider>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-avatars#codesandbox.`
    : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-avatars#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}
