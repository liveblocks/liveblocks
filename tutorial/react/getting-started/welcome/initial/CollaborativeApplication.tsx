import React, { useRef } from "react";
import {
  ClientSideSuspense,
  RoomProvider,
  useClient,
} from "@liveblocks/react/suspense";
import { ErrorBoundary } from "react-error-boundary";
import Avatars from "./components/Avatars";
import Connected from "./components/Connected";
import Cursors from "./components/Cursors";

// export function CollaborativeApplication() {
//   const roomId = "{% ROOM_ID %}";
//   const cursorPanel = useRef(null);
//
//   try {
//     return (
//       <ErrorBoundary fallback={<Connected connected={false} />}>
//         <ClientSideSuspense fallback={<Connected connected={false} />}>
//           <Child />
//         </ClientSideSuspense>
//       </ErrorBoundary>
//     );
//   } catch (err) {
//     return <div>hey</div>;
//   }
// }

export function CollaborativeApplication() {
  const roomId = "{% ROOM_ID %}";
  const cursorPanel = useRef(null);

  try {
    return (
      <RoomProvider
        id={roomId}
        initialPresence={{
          cursor: null,
        }}
      >
        <ErrorBoundary fallback={<Connected connected={false} />}>
          <ClientSideSuspense fallback={<Connected connected={false} />}>
            <div className="liveblocksDemo" ref={cursorPanel}>
              <Avatars />
              <Connected connected={true} />
              <Cursors cursorPanel={cursorPanel} />
            </div>
          </ClientSideSuspense>
        </ErrorBoundary>
      </RoomProvider>
    );
  } catch (err) {
    return <div>hey</div>;
  }
}

function Child() {
  const client = useClient();

  console.log(client);

  return <div>client</div>;
}
