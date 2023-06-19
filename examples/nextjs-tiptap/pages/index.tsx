'use client'

import { useEffect, useMemo, useState } from "react";
import {
  RoomProvider,
  useOthers,
  useRoom,
} from "../liveblocks.config";
import "@liveblocks/react";
import { useRouter } from "next/router";
import { ClientSideSuspense } from "@liveblocks/react";
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import LiveblocksProvider from "@liveblocks/yjs";

function WhoIsHere() {
  const userCount = useOthers((others) => others.length);

  return (
    <div className="who_is_here">There are {userCount} other users online</div>
  );
}

type EditorProps = {
  doc: Y.Doc,
  provider: any;
}

function Editor({ doc, provider }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The Collaboration extension comes with its own history handling
        history: false,
      }),
      // Register the document with Tiptap
      Collaboration.configure({
        document: doc,
      }),
      CollaborationCursor.configure({
        provider: provider,
      }),
    ],
  })
  return <EditorContent editor={editor} />
}


function Example() {
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<any>();

  useEffect(() => {
    const thisDoc = new Y.Doc();
    const thisProvider = new LiveblocksProvider(room, thisDoc);
    setDoc(thisDoc);
    setProvider(thisProvider)
    return () => {
      if (thisDoc) thisDoc.destroy();
      if (thisProvider) thisProvider.destroy();
    }
  }, [room]);

  return (
    <div className="container">
      <WhoIsHere />
      {doc && provider &&
        <Editor doc={doc} provider={provider} ></Editor>
      }
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
    <RoomProvider
      id={roomId}
      initialPresence={{}}
    >
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
