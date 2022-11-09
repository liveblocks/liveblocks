import type {
  BaseUserMeta,
  FullClientToPanelMessage,
  ImmutableDataObject,
  JsonObject,
  User,
} from "@liveblocks/core";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { onMessageFromClient, sendMessageToClient } from "../port";

type RoomMirror = {
  readonly roomId: string;
  readonly storage?: ImmutableDataObject;
  readonly me?: User<JsonObject, BaseUserMeta>;
  readonly others?: readonly User<JsonObject, BaseUserMeta>[];

  // onMessage
  // sendMessage
};

type InternalRoomsContext = {
  readonly currentRoomId: string | null;
  readonly allRooms: ReadonlyMap</* roomId */ string, RoomMirror>;
};

type RoomsContext = InternalRoomsContext & {
  setCurrentRoomId: (currentRoomId: string | null) => void;
};

const RoomMirrorContext = createContext<RoomsContext | null>(null);

type Props = {
  children?: ReactNode;
};

export function RoomMirrorProvider(props: Props) {
  const [ctx, setCtx] = useState<InternalRoomsContext>(() => ({
    currentRoomId: null,
    allRooms: new Map(),
  }));

  useEffect(() => {
    // Listen for new handshakes/connections!

    function onClientMessage(msg: FullClientToPanelMessage) {
      switch (msg.name) {
        // A new client just announced itself! Let's connect to it, by sending
        // it the connect message, so it knows it should start broadcasting
        // internal updates to the devtools.
        case "wake-up-devtools": {
          sendMessageToClient({ name: "connect" });
          break;
        }

        // The client just connected to a room - we don't know anything yet,
        // except the room's ID
        case "spawn-room": {
          setCtx((ctx) => {
            const currRoom = ctx.allRooms.get(msg.roomId) ?? ({} as RoomMirror);
            const allRooms = new Map(ctx.allRooms);
            allRooms.set(msg.roomId, { ...currRoom, roomId: msg.roomId });
            return {
              currentRoomId: ctx.currentRoomId ?? msg.roomId,
              allRooms,
            };
          });
          break;
        }

        // When the client disconnects from the room, erase it
        case "destroy-room": {
          setCtx((ctx) => {
            const allRooms = new Map(ctx.allRooms);
            allRooms.delete(msg.roomId);
            return {
              currentRoomId:
                ctx.currentRoomId === msg.roomId || allRooms.size === 0
                  ? null
                  : ctx.currentRoomId,
              allRooms,
            };
          });
          break;
        }

        // Storage or presence got updated
        case "sync-state": {
          setCtx((ctx) => {
            const currRoom = ctx.allRooms.get(msg.roomId) ?? ({} as RoomMirror);
            const allRooms = new Map(ctx.allRooms);
            allRooms.set(msg.roomId, {
              ...currRoom,
              roomId: msg.roomId,
              storage:
                msg.storage !== undefined ? msg.storage : currRoom.storage,
              me: msg.me !== undefined ? msg.me : currRoom.me,
              others: msg.others !== undefined ? msg.others : currRoom.others,
            });
            return {
              currentRoomId: ctx.currentRoomId ?? msg.roomId,
              allRooms,
            };
          });
          break;
        }

        default:
        // Ignore any other messages here. We'll be listening for these
        // messages elsewhere.
      }
    }

    onMessageFromClient.addListener(onClientMessage);
    return () => {
      onMessageFromClient.removeListener(onClientMessage);
    };
  }, []);

  // When loading the app, try to connect. This can get acknowledged when an
  // active Liveblocks app is already connected. Or it can not get
  // acknowledged, in which case the dev panel will remain idle until we
  // receive an "wake-up-devtools" message.
  useEffect(() => {
    sendMessageToClient({ name: "connect" });
  }, []);

  /**
   * Can be used by the panel UI to "switch" between currently visible room.
   */
  const setCurrentRoomId = useCallback((roomId: string | null): void => {
    if (roomId === null || ctx.allRooms.has(roomId)) {
      setCtx((ctx) => ({ ...ctx, currentRoomId: roomId }));
    }
  }, []);

  const value = useMemo(
    () => ({ ...ctx, setCurrentRoomId }),
    [ctx, setCurrentRoomId]
  );

  return (
    <RoomMirrorContext.Provider value={value}>
      {props.children}
    </RoomMirrorContext.Provider>
  );
}

export function useRoomsContext(): RoomsContext {
  const ctx = useContext(RoomMirrorContext);
  if (ctx === null) {
    throw new Error(
      "Please use a <RoomMirrorProvider> up the component tree to use useRoomsContext()"
    );
  }
  return ctx;
}

export function useCurrentRoomOrNull(): RoomMirror | null {
  const ctx = useRoomsContext();
  if (ctx.currentRoomId === null) {
    return null;
  } else {
    return ctx.allRooms.get(ctx.currentRoomId);
  }
}

export function useCurrentRoom(): RoomMirror {
  const room = useCurrentRoomOrNull();
  if (room === null) {
    throw new Error("Please select a room to view first");
  }
  return room;
}
