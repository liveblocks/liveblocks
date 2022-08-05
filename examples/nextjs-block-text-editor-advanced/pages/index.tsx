import { LiveList } from "@liveblocks/client";
import { nanoid } from "nanoid";
import { useRouter } from "next/router";
import { useMemo } from "react";
import Editor from "../src/Editor";
import { RoomProvider } from "../src/liveblocks.config";
import { BlockType, CustomElement } from "../src/types";

const initialValue: CustomElement[] = [
  {
    id: nanoid(),
    type: BlockType.Title,
    children: [
      {
        text: "Hello",
      },
    ],
  },
];

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-block-text-editor-advanced");

  return (
    <RoomProvider
      id={roomId}
      initialStorage={{
        blocks: new LiveList(initialValue),
      }}
      initialPresence={{
        selectedBlockId: null,
      }}
    >
      <Editor />
    </RoomProvider>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-whiteboard#codesandbox.`
    : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-whiteboard#getting-started.`;

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
