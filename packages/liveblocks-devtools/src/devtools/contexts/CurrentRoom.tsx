import type { DevTools, DevToolsMsg, Status } from "@liveblocks/core";
import { Base64 } from "js-base64";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import * as Y from "yjs";
import type { DeleteSet, Skip } from "yjs/dist/src/internals";

import { assertNever } from "../../lib/assert";
import type { EventSource, Observable } from "../../lib/EventSource";
import { makeEventSource } from "../../lib/EventSource";
import { onMessage, sendMessage } from "../port";
import type { FullBackgroundToPanelMessage } from "../protocol";

// Old/legacy connection statuses sent by old clients, prior to Liveblocks 1.1.
// These will be removed from a future version of Liveblocks, but DevTools will
// have to support these status codes to remain backward compatible with old
// clients.
type OldConnectionStatus =
  | "closed"
  | "authenticating"
  | "connecting"
  | "open"
  | "unavailable"
  | "failed";

export type YUpdate = {
  ds: DeleteSet;
  structs: (Y.Item | Y.GC | Skip)[];
};

type Room = {
  readonly roomId: string;
  status: Status | OldConnectionStatus | null;
  storage: readonly DevTools.LsonTreeNode[] | null;
  me: DevTools.UserTreeNode | null;
  others: readonly DevTools.UserTreeNode[];
  customEvents: DevTools.CustomEventTreeNode[];
  clearCustomEvents(): void;
  ydoc: Y.Doc;
  yupdates: YUpdate[];
};

type EventHub = {
  readonly onStatus: EventSource<void>;
  readonly onMe: EventSource<void>;
  readonly onOthers: EventSource<void>;
  readonly onStorage: EventSource<void>;
  readonly onCustomEvent: EventSource<void>;
  readonly onYdoc: EventSource<void>;
};

/**
 * An "event hub" is a set of event sources that can happen for a given Room,
 * for example, "its storage updated", or "its connection status updated". Each
 * room has a corresponding event hub, and this lookup table tracks all of
 * them, keyed by their room IDs.
 *
 * Once an event hub is created for a room, it will never be released, and
 * gets reused next time the room becomes known again.
 */
const _eventHubsByRoomId: Map<string, EventHub> = new Map();

function makeEventHub(roomId: string): EventHub {
  const newEventHub: EventHub = {
    onStatus: makeEventSource(),
    onMe: makeEventSource(),
    onOthers: makeEventSource(),
    onStorage: makeEventSource(),
    onCustomEvent: makeEventSource(),
    onYdoc: makeEventSource(),
  };
  _eventHubsByRoomId.set(roomId, newEventHub);
  return newEventHub;
}

function getOrCreateEventHubForRoomId(roomId: string): EventHub {
  return _eventHubsByRoomId.get(roomId) ?? makeEventHub(roomId);
}

function getRoomHub(roomId: null): null;
function getRoomHub(roomId: string): EventHub;
function getRoomHub(roomId: string | null): EventHub | null {
  return roomId ? getOrCreateEventHubForRoomId(roomId) : null;
}

type SubscribeFn = Observable<void>["subscribe"];

function getSubscribe(
  roomId: string | null,
  eventName: keyof EventHub
): SubscribeFn | undefined {
  if (roomId) {
    const hub = getOrCreateEventHubForRoomId(roomId);
    return hub[eventName].subscribe;
  } else {
    return undefined;
  }
}

/**
 * Global lookup table for rooms, by their IDs. Rooms get added here when they
 * become known (i.e. when a client announces that that room is available).
 * They are removed when the client announces that the room has been left.
 *
 * While receiving updates, the rooms (i.e. the values of this lookup table)
 * are mutated in-place, and events are emitted through the "event hub" for
 * that roomId.
 */
const roomsById: Map<string, Room> = new Map();

/**
 * Global list of all room IDs that are currently known. The UI uses this to
 * allow picking another current room.
 *
 * Derived value, basically always equivalent to Array.from(roomsById.keys()).
 * The reason this is not computed on the fly, is that this is used in
 * useSyncExternalStore's getSnapshot function, which must always return
 * a stable value.
 */
let allRoomIds: string[] = [];

/**
 * Event sent whenever a new room becomes known to the devtool panel, or when
 * a room disappears (because the client enters or leaves rooms).
 */
const onRoomCountChanged: EventSource<void> = makeEventSource();

function makeRoom(roomId: string): Room {
  const newRoom = {
    roomId,
    status: null,
    storage: null,
    me: null,
    others: [],
    customEvents: [],
    clearCustomEvents() {
      this.customEvents = [];
    },
    ydoc: new Y.Doc(),
    yupdates: [],
  };

  roomsById.set(roomId, newRoom);
  allRoomIds = Array.from(roomsById.keys());
  onRoomCountChanged.notify();
  return newRoom;
}

function deleteRoom(roomId: string): void {
  if (roomsById.delete(roomId)) {
    allRoomIds = Array.from(roomsById.keys());
    onRoomCountChanged.notify();
  }
}

function getOrCreateRoom(roomId: string): Room {
  return roomsById.get(roomId) ?? makeRoom(roomId);
}

type CurrentRoomContextT = {
  currentRoomId: string | null;
  setCurrentRoomId: (currentRoomId: string | null) => void;
};

const CurrentRoomContext = createContext<CurrentRoomContextT | null>(null);

type Props = {
  children?: ReactNode;
};

export function CurrentRoomProvider(props: Props) {
  const [currentRoomId, _setCurrentRoomId] = useState<string | null>(null);

  /**
   * Can be used by the panel UI to "switch" between currently visible room.
   * This will validate the given room ID and only change the current room ID
   * to a value that is legal, otherwise, this will be a no-op.
   */
  const setCurrentRoomId = useCallback((roomId: string | null): void => {
    if (roomId === null || roomsById.has(roomId)) {
      _setCurrentRoomId(roomId);
    }
  }, []);

  /**
   * Sets the current room ID, but only if there currently isn't a room
   * selected already.
   */
  const softSetCurrentRoomId = useCallback(
    (newRoomId: string | null): void =>
      _setCurrentRoomId((currentRoomId) =>
        currentRoomId === null ||
        (!roomsById.has(currentRoomId) &&
          (newRoomId === null || roomsById.has(newRoomId)))
          ? newRoomId
          : currentRoomId
      ),
    []
  );

  const handleMessage = useCallback(
    (
      msg: DevToolsMsg.FullClientToPanelMessage | FullBackgroundToPanelMessage
    ) => {
      switch (msg.msg) {
        // The inspected window was reloaded, so we should reload the panel.
        // Ideally, we should reconnect instead of performing a full reload.
        case "reload":
          window.location.reload();
          break;

        // A new client just announced itself! Let's connect to it, by sending
        // it the connect message, so it knows it should start broadcasting
        // internal updates to the devtools.
        case "wake-up-devtools": {
          sendMessage({ msg: "connect" });
          break;
        }

        // The client just connected to a room - we don't know anything yet,
        // except the room's ID
        case "room::available": {
          getOrCreateRoom(msg.roomId);
          softSetCurrentRoomId(msg.roomId);
          break;
        }

        // When the client leaves a room, it won't track it any longer, so we
        // can destroy it
        case "room::unavailable": {
          deleteRoom(msg.roomId);
          softSetCurrentRoomId(allRoomIds[0] ?? null);
          break;
        }

        case "room::sync::ydoc": {
          const currRoom = getOrCreateRoom(msg.roomId);
          const update = Base64.toUint8Array(msg.update.update);
          Y.applyUpdate(currRoom.ydoc, update, "backend");
          const decodedUpdate = Y.decodeUpdate(update);
          currRoom.yupdates = [decodedUpdate, ...currRoom.yupdates];
          const hub = getRoomHub(msg.roomId);
          hub.onYdoc.notify();
          break;
        }

        case "room::events::custom-event": {
          const currRoom = getOrCreateRoom(msg.roomId);
          currRoom.customEvents = [msg.event, ...currRoom.customEvents];
          const hub = getRoomHub(msg.roomId);
          hub.onCustomEvent.notify();
          break;
        }

        // Storage or presence got updated
        case "room::sync::full":
        case "room::sync::partial": {
          const currRoom = getOrCreateRoom(msg.roomId);

          const hub = getRoomHub(msg.roomId);
          if (msg.status !== undefined) {
            currRoom.status = msg.status;
            hub.onStatus.notify();
          }

          if (msg.storage !== undefined) {
            currRoom.storage = msg.storage;
            hub.onStorage.notify();
          }

          if (msg.me !== undefined) {
            currRoom.me = msg.me;
            hub.onMe.notify();
          }

          if (msg.others !== undefined) {
            currRoom.others = msg.others;
            hub.onOthers.notify();
          }

          _setCurrentRoomId((currentRoomId) => currentRoomId ?? msg.roomId);
          break;
        }

        default: {
          // Ensure that we exhaustively handle all messages
          if (process.env.NODE_ENV === "production") {
            // Ignore these errors in production
          } else {
            // Ensure we exhaustively handle all possible messages
            assertNever(msg, "Unknown message type");
          }
          break;
        }
      }
    },
    [softSetCurrentRoomId]
  );

  useEffect(() => {
    // When loading the app, try to connect. This can get acknowledged when an
    // active Liveblocks app is already connected. Or it can not get
    // acknowledged, in which case the dev panel will remain idle until we
    // receive an "wake-up-devtools" message.
    sendMessage({ msg: "connect" });

    onMessage.addListener(handleMessage);
    return () => {
      onMessage.removeListener(handleMessage);
    };
  }, [handleMessage]);

  useEffect(() => {
    const roomId = currentRoomId;
    if (!roomId) {
      return;
    }
    sendMessage({ msg: "room::subscribe", roomId });
    return () => {
      sendMessage({ msg: "room::unsubscribe", roomId });
    };
  }, [currentRoomId]);

  // By memoizing this, we ensure that the context won't be updated on every
  // render, just because `value` is a new object every time
  const value = useMemo(
    () => ({ currentRoomId, setCurrentRoomId }),
    [currentRoomId, setCurrentRoomId]
  );

  return (
    <CurrentRoomContext.Provider value={value}>
      {props.children}
    </CurrentRoomContext.Provider>
  );
}

function useCurrentRoomContext(): CurrentRoomContextT {
  const context = useContext(CurrentRoomContext);
  if (context === null) {
    throw new Error(
      "Please use a <CurrentRoomProvider> up the component tree to use useRoomsContext()"
    );
  }
  return context;
}

export function useCurrentRoomId(): string | null {
  return useCurrentRoomContext().currentRoomId;
}

export function getRoom(roomId: string | null): Room | null {
  return roomId ? roomsById.get(roomId) ?? null : null;
}

export function useSetCurrentRoomId(): (roomId: string) => void {
  return useCurrentRoomContext().setCurrentRoomId;
}

// Helper "no-op" subscription
const nosub: SubscribeFn = () => () => {};

export function useRoomIds(): string[] {
  return useSyncExternalStore(onRoomCountChanged.subscribe, () => allRoomIds);
}

export function useStatus(): Status | OldConnectionStatus | null {
  const currentRoomId = useCurrentRoomId();
  return useSyncExternalStore(
    getSubscribe(currentRoomId, "onStatus") ?? nosub,
    () => getRoom(currentRoomId)?.status ?? null
  );
}

export function useMe(): DevTools.UserTreeNode | null {
  const currentRoomId = useCurrentRoomId();
  return useSyncExternalStore(
    getSubscribe(currentRoomId, "onMe") ?? nosub,
    () => getRoom(currentRoomId)?.me ?? null
  );
}

const emptyOthers: readonly DevTools.UserTreeNode[] = [];

export function useOthers(): readonly DevTools.UserTreeNode[] {
  const currentRoomId = useCurrentRoomId();
  return useSyncExternalStore(
    getSubscribe(currentRoomId, "onOthers") ?? nosub,
    () => getRoom(currentRoomId)?.others ?? emptyOthers
  );
}

export function usePresence(): readonly DevTools.UserTreeNode[] {
  const me = useMe();
  const others = useOthers();
  const presence = useMemo(() => (me ? [me, ...others] : others), [me, others]);
  return presence;
}

export function useCustomEvents(): [
  customEvents: readonly DevTools.CustomEventTreeNode[],
  clearCustomEvents: () => void,
] {
  const currentRoomId = useCurrentRoomId();
  const events = useSyncExternalStore(
    getSubscribe(currentRoomId, "onCustomEvent") ?? nosub,
    () => getRoom(currentRoomId)?.customEvents ?? []
  );
  const clearEvents = useCallback(() => {
    getRoom(currentRoomId)?.clearCustomEvents();
    getRoomHub(currentRoomId)?.onCustomEvent.notify();
  }, []);
  return [events, clearEvents];
}

export function useCustomEventCount(): number {
  const currentRoomId = useCurrentRoomId();
  return useSyncExternalStore(
    getSubscribe(currentRoomId, "onCustomEvent") ?? nosub,
    () => getRoom(currentRoomId)?.customEvents.length ?? 0
  );
}

const emptyStorage: readonly DevTools.LsonTreeNode[] = [];

export function useStorage(): readonly DevTools.LsonTreeNode[] {
  const currentRoomId = useCurrentRoomId();
  return useSyncExternalStore(
    getSubscribe(currentRoomId, "onStorage") ?? nosub,
    () => getRoom(currentRoomId)?.storage ?? emptyStorage
  );
}

export function useYUpdates(): YUpdate[] {
  const currentRoomId = useCurrentRoomId();
  return useSyncExternalStore(
    getSubscribe(currentRoomId, "onYdoc") ?? nosub,
    () => getRoom(currentRoomId)?.yupdates ?? []
  );
}

export function useYdoc(): Y.Doc {
  const currentRoomId = useCurrentRoomId();
  return useSyncExternalStore(
    getSubscribe(currentRoomId, "onYdoc") ?? nosub,
    () => getRoom(currentRoomId)?.ydoc ?? new Y.Doc()
  );
}
