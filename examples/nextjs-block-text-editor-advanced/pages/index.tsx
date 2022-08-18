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
        text: "Collaborative Block Text Editor",
      },
    ],
  },
  {
    id: nanoid(),
    type: BlockType.Paragraph,
    children: [
      {
        text: "An open-source collaborative block-based text editor built with Slate, Liveblocks, and Next.js. People can write and embed all kinds of content types together in real-time.",
      },
    ],
  },
  {
    id: nanoid(),
    type: BlockType.H2,
    children: [
      {
        text: "More than just text…",
      },
    ],
  },
  {
    id: nanoid(),
    type: BlockType.Paragraph,
    children: [
      {
        text: "You can add tasks, embed videos, and more. And because it's open-source, you can easily extend this to support pretty much anything you want.",
      },
    ],
  },
  {
    id: nanoid(),
    type: BlockType.Paragraph,
    children: [
      {
        text: "",
      },
    ],
  },
  {
    id: nanoid(),
    type: BlockType.ToDo,
    children: [
      {
        text: "Open block text editor",
      },
    ],
    checked: true,
  },
  {
    id: nanoid(),
    type: BlockType.ToDo,
    children: [
      {
        text: "Invite people to this document",
      },
    ],
    checked: false,
  },
  {
    id: nanoid(),
    type: BlockType.ToDo,
    children: [
      {
        text: "Try dark mode",
      },
    ],
    checked: false,
  },
  {
    id: nanoid(),
    type: BlockType.ToDo,
    checked: false,
    children: [
      {
        text: "Add new blocks",
      },
    ],
  },
  {
    id: nanoid(),
    type: BlockType.ToDo,
    children: [
      {
        text: "Reorder blocks",
      },
    ],
    checked: false,
  },
  {
    id: nanoid(),
    type: BlockType.ToDo,
    children: [
      {
        text: "Watch video below",
      },
    ],
    checked: false,
  },
  {
    id: nanoid(),
    type: BlockType.Paragraph,
    children: [
      {
        text: "",
      },
    ],
  },
  {
    id: nanoid(),
    type: BlockType.Video,
    url: "https://youtube.com/embed/ejJT4XhmFPU",
    children: [
      {
        text: "",
      },
    ],
  },
  {
    id: nanoid(),
    type: BlockType.Image,
    url: "https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-wordmark-light.svg",
    alt: "Liveblocks",
    children: [
      {
        text: "",
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
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-block-text-editor-advanced#codesandbox.`
    : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-block-text-editor-advanced#getting-started.`;

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
