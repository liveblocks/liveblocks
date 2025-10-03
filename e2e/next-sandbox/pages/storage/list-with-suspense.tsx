import { LiveList } from "@liveblocks/client";
import { LiveblocksProvider } from "@liveblocks/react";
import { RoomProvider, useStorage } from "@liveblocks/react/suspense";
import { type PropsWithChildren, Suspense } from "react";
import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <LiveblocksProvider authEndpoint="/api/auth/access-token">
      {mounted ? (
        <Room>
          <Sandbox />
        </Room>
      ) : (
        <div>Loading...</div>
      )}
    </LiveblocksProvider>
  );
}

function Room(props: PropsWithChildren) {
  return (
    <RoomProvider
      id="e2e-room-a"
      initialStorage={{ items: new LiveList([]) }}
      autoConnect
    >
      <Suspense fallback={<div>Loading...</div>}>{props.children}</Suspense>
    </RoomProvider>
  );
}

function Sandbox() {
  const storage = useStorage((root) => root);

  return <div>Storage: {storage.items.length}</div>;
}
