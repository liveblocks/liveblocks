"use client";

import { useEffect, useMemo, useState } from "react";
import { RoomProvider, useOthers, useRoom } from "../liveblocks.config";
import "@liveblocks/react";
import { useRouter } from "next/router";
import { ClientSideSuspense } from "@liveblocks/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import MenuBar from "@/components/MenuBar";
import 'remixicon/fonts/remixicon.css';

const USER_INFO = [
  {
    name: "Charlie Layne",
    color: "#D583F0",
    avatar: "https://liveblocks.io/avatars/avatar-1.png",
  },
  {
    name: "Mislav Abha",
    color: "#F08385",
    avatar: "https://liveblocks.io/avatars/avatar-2.png",
  },
  {
    name: "Tatum Paolo",
    color: "#F0D885",
    avatar: "https://liveblocks.io/avatars/avatar-3.png",
  },
  {
    name: "Anjali Wanda",
    color: "#85EED6",
    avatar: "https://liveblocks.io/avatars/avatar-4.png",
  },
  {
    name: "Jody Hekla",
    color: "#85BBF0",
    avatar: "https://liveblocks.io/avatars/avatar-5.png",
  },
  {
    name: "Emil Joyce",
    color: "#8594F0",
    avatar: "https://liveblocks.io/avatars/avatar-6.png",
  },
  {
    name: "Jory Quispe",
    color: "#85DBF0",
    avatar: "https://liveblocks.io/avatars/avatar-7.png",
  },
  {
    name: "Quinn Elton",
    color: "#87EE85",
    avatar: "https://liveblocks.io/avatars/avatar-8.png",
  },
];

function WhoIsHere() {
  const userCount = useOthers((others) => others.length);

  return (
    <div className="who_is_here">There are {userCount} other users online</div>
  );
}

type EditorProps = {
  doc: Y.Doc;
  provider: any;
};

function Editor({ doc, provider }: EditorProps) {
  const [currentUser, setCurrentUser] = useState(USER_INFO[Math.floor(Math.random() * USER_INFO.length)])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The Collaboration extension comes with its own history handling
        history: false,
      }),
      Highlight,
      TaskList,
      TaskItem,
      CharacterCount.configure({
        limit: 10000,
      }),
      // Register the document with Tiptap
      Collaboration.configure({
        document: doc,
      }),
      CollaborationCursor.configure({
        provider: provider,
      }),
    ],
  });

  useEffect(() => {
    if (editor && currentUser) {
      editor.chain().focus().updateUser(currentUser).run()
    }
  }, [editor, currentUser])
  return (
    <>
      {editor && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </>
  );
}

function Example() {
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<any>();

  useEffect(() => {
    const _doc = new Y.Doc();
    const _provider = new LiveblocksProvider(room, _doc);
    setDoc(_doc);
    setProvider(_provider);
    return () => {
      _doc.destroy();
      _provider?.destroy();
    };
  }, [room]);

  return (
    <div className="container">
      <div className="editor">
        {doc && provider && <Editor doc={doc} provider={provider}></Editor>}
        <div className="editor__footer">
          <div className={`editor__status editor__status--${status}`}>
            <WhoIsHere />
          </div>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="loading">
      <img src="https://liveblocks.io/loading.svg" alt="Loading" />
    </div>
  );
}

export default function Page() {
  const roomId = useOverrideRoomId("nextjs-todo-list-v2");

  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <ClientSideSuspense fallback={<Loading />}>
        {() => <Example />}
      </ClientSideSuspense>
    </RoomProvider>
  );
}

export async function getStaticProps() {
  const API_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` secret in CodeSandbox.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors#codesandbox.`
    : `Create an \`.env.local\` file and add your public key from https://liveblocks.io/dashboard/apikeys as the \`NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY\` environment variable.\n` +
    `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-cursors#getting-started.`;

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
