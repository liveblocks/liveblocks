import React, { useMemo } from "react";
import { Avatar } from "../components/Avatar";
import Button from "../components/Button";
import { RoomProvider, useOthers, useSelf } from "../liveblocks.config";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { getServerSession } from "./api/auth/getServerSession";
import { signOut } from "next-auth/react";
import styles from "./index.module.css";

function Example() {
  const users = useOthers();
  const currentUser = useSelf();
  const hasMoreUsers = users.length > 3;

  return (
    <div className="flex flex-col place-items-center place-content-center h-screen space-y-5 > * + *">
      <div className="flex place-items-center place-content-center w-full  select-none">
        <div className="flex pl-3">
          {users.slice(0, 3).map(({ connectionId, info }) => {
            return (
              <Avatar
                key={connectionId}
                picture={info.picture}
                name={info.name}
              />
            );
          })}

          {hasMoreUsers && (
            <div className={styles.more}>+{users.length - 3}</div>
          )}

          {currentUser && (
            <div className="relative ml-8 first:ml-0">
              <Avatar picture={currentUser.info.picture} name="You" />
            </div>
          )}
        </div>
      </div>
      <div>
        <Button
          className="flex gap-2 select none"
          appearance="secondary"
          onClick={() => signOut()}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-live-avatars");

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <Example />
    </RoomProvider>
  );
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

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-block-text-editor-advanced#codesandbox.`
    : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-block-text-editor-advanced#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }
  const session = await getServerSession(req, res);

  if (!session) {
    return {
      redirect: {
        permanent: false,
        destination: "/signin",
      },
    };
  }

  return {
    props: {},
  };
};
