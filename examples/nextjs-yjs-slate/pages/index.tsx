import { useMemo } from "react";
import { RoomProvider } from "@/liveblocks.config";
import { useRouter } from "next/router";
import { ClientSideSuspense } from "@liveblocks/react";
import Editor from "@/src/Editor";
import styles from "@/src/Editor.module.css";

export function Loading() {
  return (
    <div className="loading">
      <img src="https://liveblocks.io/loading.svg" alt="Loading" />
    </div>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-yjs-slate");

  return (
    <main>
      <div className={styles.container}>
        <div className={styles.editorContainer}>
          <RoomProvider id={roomId} initialPresence={{}}>
            <ClientSideSuspense fallback={<Loading />}>
              {() => <Editor />}
            </ClientSideSuspense>
          </RoomProvider>
        </div>
      </div>{" "}
    </main>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-yjs-slate#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-yjs-slate#getting-started.`;

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
