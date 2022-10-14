import { createContext, useEffect, useState, useContext } from "react";
import { onMessageFromClient, sendMessageToClient } from "../port";
import type {
  BaseUserMeta,
  FullClientToPanelMessage,
  ImmutableDataObject,
  JsonObject,
  User,
} from "@liveblocks/core";
import type { ReactNode } from "react";

type ConnectedRoom = {
  readonly roomId: string;
  readonly storage?: ImmutableDataObject;
  readonly me?: User<JsonObject, BaseUserMeta>;
  readonly others?: readonly User<JsonObject, BaseUserMeta>[];

  // onMessage
  // sendMessage
};

const ConnectedRoomContext = createContext<ConnectedRoom | null>(null);

type Props = {
  children?: ReactNode;
};

export function ConnectedRoomProvider(props: Props) {
  const [room, setRoom] = useState<ConnectedRoom | null>(null);

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
        case "connected-to-room": {
          setRoom((currRoom) => ({ ...currRoom, roomId: msg.roomId }));
          break;
        }

        // When the client disconnects from the room, erase it
        case "disconnected-from-room": {
          setRoom(null);
          break;
        }

        // Storage or presence got updated
        case "sync-state": {
          setRoom((currRoom) => ({
            ...currRoom,
            roomId: msg.roomId,
            storage: msg.storage !== undefined ? msg.storage : currRoom.storage,
            me: msg.me !== undefined ? msg.me : currRoom.me,
            others: msg.others !== undefined ? msg.others : currRoom.others,
          }));
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

  return (
    <ConnectedRoomContext.Provider value={room}>
      {props.children}
    </ConnectedRoomContext.Provider>
  );
}

export function useConnectedRoomOrNull(): ConnectedRoom | null {
  return useContext(ConnectedRoomContext);
}

export function useConnectedRoom(): ConnectedRoom {
  const room = useConnectedRoomOrNull();
  if (room === null) {
    throw new Error("Haven't found a connected Liveblocks room yet");
  }
  return room;
}
