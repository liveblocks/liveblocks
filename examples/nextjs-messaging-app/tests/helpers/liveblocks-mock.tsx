import { LiveList, LiveObject } from "@liveblocks/client";
import { vi } from "vitest";
import {
  Suspense,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getUser } from "@/lib/database";

type FeedMetadata = Liveblocks["FeedMetadata"];
type FeedMessageData = Liveblocks["FeedMessageData"];
type Presence = Liveblocks["Presence"];

export type MockFeed = {
  feedId: string;
  metadata: FeedMetadata;
  createdAt: number;
  updatedAt: number;
};

export type MockFeedMessage<D extends FeedMessageData = FeedMessageData> = {
  id: string;
  createdAt: number;
  updatedAt: number;
  data: D;
};

export type MockOther = {
  connectionId: number;
  id: string;
  presence: Presence;
};

export type MockState = {
  roomId: string;
  selfId: string;
  selfPresence: Presence;
  others: MockOther[];
  channels: { id: string; name: string }[];
  feeds: Record<string, MockFeed>;
  messages: Record<string, MockFeedMessage[]>;
  hasFetchedAll: Record<string, boolean>;
  isLoading: Record<string, boolean>;
  errors: Record<string, Error>;
};

function createInitialState(): MockState {
  return {
    roomId: "liveblocks:examples:nextjs-messaging-app:acme",
    selfId: "charlie.layne@example.com",
    selfPresence: { typingIn: null },
    others: [],
    channels: [
      { id: "general", name: "general" },
      { id: "random", name: "random" },
    ],
    feeds: {},
    messages: {},
    hasFetchedAll: {},
    isLoading: {},
    errors: {},
  };
}

let state: MockState = createInitialState();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getMockState(): MockState {
  return state;
}

export function setMockState(patch: Partial<MockState>) {
  state = { ...state, ...patch };
  notify();
}

export function resetMockState(patch: Partial<MockState> = {}) {
  state = { ...createInitialState(), ...patch };
  for (const fn of Object.values(liveblocksMocks)) {
    fn.mockClear();
  }
  idCounter = 0;
  notify();
}

let idCounter = 0;
export function nextMockId(prefix = "msg") {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

export function mockFeed(
  feedId: string,
  metadata: FeedMetadata,
  timestamps: { createdAt?: number; updatedAt?: number } = {}
): MockFeed {
  const createdAt = timestamps.createdAt ?? Date.now();
  return {
    feedId,
    metadata,
    createdAt,
    updatedAt: timestamps.updatedAt ?? createdAt,
  };
}

export function mockMessage<D extends FeedMessageData>(
  data: D,
  options: { id?: string; createdAt?: number; updatedAt?: number } = {}
): MockFeedMessage<D> {
  const createdAt = options.createdAt ?? Date.now();
  return {
    id: options.id ?? nextMockId(),
    createdAt,
    updatedAt: options.updatedAt ?? createdAt,
    data,
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useMockState(): MockState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}

function matchesMetadata(
  metadata: FeedMetadata,
  query: Partial<FeedMetadata> | undefined
) {
  if (!query) {
    return true;
  }
  return Object.entries(query).every(
    ([key, value]) => metadata[key as keyof FeedMetadata] === value
  );
}

export const liveblocksMocks = {
  createFeed: vi.fn(),
  deleteFeed: vi.fn(),
  updateFeedMetadata: vi.fn(),
  createFeedMessage: vi.fn(),
  updateFeedMessage: vi.fn(),
  deleteFeedMessage: vi.fn(),
  updateMyPresence: vi.fn(),
  fetchMore: vi.fn(),
};

async function createFeedImpl(
  feedId: string,
  options: { metadata?: FeedMetadata } = {}
) {
  liveblocksMocks.createFeed(feedId, options);
  if (state.feeds[feedId]) {
    throw new Error(`Feed "${feedId}" already exists`);
  }
  const feed = mockFeed(feedId, options.metadata ?? {});
  setMockState({ feeds: { ...state.feeds, [feedId]: feed } });
  return feed;
}

async function deleteFeedImpl(feedId: string) {
  liveblocksMocks.deleteFeed(feedId);
  if (!state.feeds[feedId]) {
    throw new Error(`Feed "${feedId}" does not exist`);
  }
  const feeds = { ...state.feeds };
  delete feeds[feedId];
  const messages = { ...state.messages };
  delete messages[feedId];
  setMockState({ feeds, messages });
}

async function updateFeedMetadataImpl(feedId: string, metadata: FeedMetadata) {
  liveblocksMocks.updateFeedMetadata(feedId, metadata);
  const existing = state.feeds[feedId];
  if (!existing) {
    throw new Error(`Feed "${feedId}" does not exist`);
  }
  setMockState({
    feeds: {
      ...state.feeds,
      [feedId]: { ...existing, metadata, updatedAt: Date.now() },
    },
  });
}

async function createFeedMessageImpl(
  feedId: string,
  data: FeedMessageData,
  options: { id?: string } = {}
) {
  liveblocksMocks.createFeedMessage(feedId, data, options);
  if (!state.feeds[feedId]) {
    throw new Error(`Feed "${feedId}" does not exist`);
  }
  const message = mockMessage(data, { id: options.id });
  setMockState({
    messages: {
      ...state.messages,
      [feedId]: [...(state.messages[feedId] ?? []), message],
    },
  });
  return message;
}

async function updateFeedMessageImpl(
  feedId: string,
  messageId: string,
  data: FeedMessageData
) {
  liveblocksMocks.updateFeedMessage(feedId, messageId, data);
  const existing = (state.messages[feedId] ?? []).find(
    (message) => message.id === messageId
  );
  if (!existing) {
    throw new Error(`Message "${messageId}" does not exist in "${feedId}"`);
  }
  const updated = { ...existing, data, updatedAt: Date.now() };
  setMockState({
    messages: {
      ...state.messages,
      [feedId]: state.messages[feedId].map((message) =>
        message.id === messageId ? updated : message
      ),
    },
  });
  return updated;
}

async function deleteFeedMessageImpl(feedId: string, messageId: string) {
  liveblocksMocks.deleteFeedMessage(feedId, messageId);
  const list = state.messages[feedId] ?? [];
  if (!list.some((message) => message.id === messageId)) {
    throw new Error(`Message "${messageId}" does not exist in "${feedId}"`);
  }
  setMockState({
    messages: {
      ...state.messages,
      [feedId]: list.filter((message) => message.id !== messageId),
    },
  });
}

export function ClientSideSuspense({
  children,
  fallback,
}: {
  children: ReactNode | (() => ReactNode);
  fallback: ReactNode;
}) {
  return (
    <Suspense fallback={fallback}>
      {typeof children === "function" ? children() : children}
    </Suspense>
  );
}

export function LiveblocksProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function RoomProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useRoom() {
  const { roomId } = useMockState();
  return { id: roomId };
}

type Self = {
  connectionId: number;
  id: string;
  info: Liveblocks["UserMeta"]["info"];
  presence: Presence;
};

function buildSelf(current: MockState): Self {
  const user = getUser(current.selfId);
  return {
    connectionId: 0,
    id: current.selfId,
    info: user?.info ?? { name: current.selfId, avatar: "", color: "#000" },
    presence: current.selfPresence,
  };
}

export function useSelf(): Self;
export function useSelf<T>(selector: (me: Self) => T): T;
export function useSelf<T>(selector?: (me: Self) => T) {
  const current = useMockState();
  const self = buildSelf(current);
  return selector ? selector(self) : self;
}

type Other = MockOther & { info: Liveblocks["UserMeta"]["info"] };

function buildOthers(current: MockState): Other[] {
  return current.others.map((other) => ({
    ...other,
    info: getUser(other.id)?.info ?? {
      name: other.id,
      avatar: "",
      color: "#000",
    },
  }));
}

export function useOthers(): Other[];
export function useOthers<T>(selector: (others: Other[]) => T): T;
export function useOthers<T>(selector?: (others: Other[]) => T) {
  const current = useMockState();
  const others = buildOthers(current);
  return selector ? selector(others) : others;
}

export function useOthersMapped<T>(mapper: (other: Other) => T): [number, T][] {
  const current = useMockState();
  return buildOthers(current).map((other) => [
    other.connectionId,
    mapper(other),
  ]);
}

export function useUpdateMyPresence() {
  return useCallback((patch: Partial<Presence>) => {
    liveblocksMocks.updateMyPresence(patch);
    state = { ...state, selfPresence: { ...state.selfPresence, ...patch } };
    notify();
  }, []);
}

type StorageRoot = { channels: { id: string; name: string }[] };

export function useStorage<T>(selector: (root: StorageRoot) => T): T {
  const current = useMockState();
  return selector({ channels: current.channels });
}

type LiveStorage = {
  get(key: "channels"): LiveList<LiveObject<{ id: string; name: string }>>;
};

export function useMutation<Args extends unknown[], R>(
  callback: (context: { storage: LiveStorage }, ...args: Args) => R,
  _deps: unknown[]
): (...args: Args) => R {
  return useCallback(
    (...args: Args) => {
      const list = new LiveList(
        state.channels.map((channel) => new LiveObject({ ...channel }))
      );
      const storage: LiveStorage = { get: () => list };
      const result = callback({ storage }, ...args);
      setMockState({
        channels: [...list].map((channel) => ({
          id: channel.get("id"),
          name: channel.get("name"),
        })),
      });
      return result;
    },
    [callback]
  );
}

export function useFeeds(options: { metadata?: Partial<FeedMetadata> } = {}) {
  const current = useMockState();
  const feeds = Object.values(current.feeds).filter((feed) =>
    matchesMetadata(feed.metadata, options.metadata)
  );
  return {
    feeds,
    hasFetchedAll: true,
    isFetchingMore: false,
    fetchMore: liveblocksMocks.fetchMore,
  };
}

export function useFeedMessages(feedId: string) {
  const current = useMockState();
  const error = current.errors[feedId];
  const isLoading = current.isLoading[feedId] ?? false;
  return {
    messages: isLoading || error ? undefined : (current.messages[feedId] ?? []),
    isLoading,
    error,
    hasFetchedAll: current.hasFetchedAll[feedId] ?? true,
    isFetchingMore: false,
    fetchMore: liveblocksMocks.fetchMore,
  };
}

export function useCreateFeed() {
  return createFeedImpl;
}

export function useDeleteFeed() {
  return deleteFeedImpl;
}

export function useUpdateFeedMetadata() {
  return updateFeedMetadataImpl;
}

export function useCreateFeedMessage() {
  return createFeedMessageImpl;
}

export function useUpdateFeedMessage() {
  return updateFeedMessageImpl;
}

export function useDeleteFeedMessage() {
  return deleteFeedMessageImpl;
}
