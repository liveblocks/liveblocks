import React from "react";
import { Avatar } from "../components/Avatar";
import { RoomProvider, useOthers, useSelf } from "@liveblocks/react";
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

export default function Page() {
  return (
    <RoomProvider id="nextjs-live-avatars">
      <Example />
    </RoomProvider>
  );
}

export async function getStaticProps() {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    if (process.env.CODESANDBOX_SSE) {
      throw new Error(
        `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
          `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-avatars#codesandbox.`
      );
    } else {
      throw new Error(
        `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
          `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-avatars#getting-started.`
      );
    }
  }
}
