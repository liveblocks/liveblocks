import React from "react";
import { Avatar } from "../components/Avatar";
import { RoomProvider, useOthers, useSelf } from "@liveblocks/react";
import styles from "./index.module.css";

export async function getStaticProps() {
  return {
    props: {
      isRunningOnCodeSandbox: process.env.CODESANDBOX_SSE != null,
      hasSetupLiveblocksKey: process.env.LIVEBLOCKS_SECRET_KEY != null,
    },
  };
}

type Props = {
  hasSetupLiveblocksKey: boolean;
  isRunningOnCodeSandbox: boolean;
};

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

export default function Page({
  hasSetupLiveblocksKey,
  isRunningOnCodeSandbox,
}: Props) {
  return (
    <RoomProvider id="nextjs-live-avatars">
      <Example />
    </RoomProvider>
  );
}
