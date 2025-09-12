import type {
  BaseUserMeta,
  BroadcastOptions,
  History,
  Json,
  JsonObject,
  LiveObject,
  LostConnectionEvent,
  LsonObject,
  OthersEvent,
  Room,
  RoomSubscriptionSettings,
  Status,
  User,
} from "@liveblocks/client";
import type {
  AiChat,
  AiChatMessage,
  AiChatsQuery,
  AiKnowledgeSource,
  AiUserMessage,
  AsyncError,
  AsyncLoading,
  AsyncResult,
  AsyncSuccess,
  BaseMetadata,
  Client,
  CommentAttachment,
  CommentBody,
  CommentData,
  DGI,
  DRI,
  GroupData,
  HistoryVersion,
  InboxNotificationData,
  LiveblocksError,
  NotificationSettings,
  PartialNotificationSettings,
  PartialUnless,
  Patchable,
  QueryMetadata,
  Relax,
  Resolve,
  RoomEventMessage,
  SyncStatus,
  ThreadData,
  ToImmutable,
  WithNavigation,
  WithRequired,
} from "@liveblocks/core";
import type {
  ComponentType,
  Context,
  PropsWithChildren,
  ReactNode,
} from "react";

import type { RegisterAiKnowledgeProps, RegisterAiToolProps } from "./ai";

type UiChatMessage = WithNavigation<AiChatMessage>;

export type UseSyncStatusOptions = {
  /**
   * When setting smooth, the hook will not update immediately as status
   * changes. This is because in typical applications, these states can change
   * quickly between synchronizing and synchronized. If you use this hook to
   * build a "Saving changes..." style UI, prefer setting `smooth: true`.
   */
  smooth?: boolean;
};

export type UseSendAiMessageOptions = {
  /**
   * The ID of the copilot to use to send the message.
   */
  copilotId?: string;

  /**
   * Stream the response as it is being generated. Defaults to true.
   */
  stream?: boolean;

  /**
   * The maximum timeout for the answer to be generated.
   */
  timeout?: number;

  /**
   * @internal
   */
  knowledge?: AiKnowledgeSource[];
};

export type SendAiMessageOptions = UseSendAiMessageOptions & {
  /**
   * The ID of the chat to send the message to.
   */
  chatId?: string;

  /**
   * The text of the message to send.
   */
  text: string;
};

export type CreateAiChatOptions = {
  id: string;
  title?: string;
  metadata?: Record<string, string | string[]>;
};

export type UseAiChatsOptions = {
  /**
   * The query (including metadata) to filter the chats by. If provided, only chats
   * that match the query will be returned. If not provided, all chats will be returned.
   */
  query?: AiChatsQuery;
};

export type ThreadsQuery<M extends BaseMetadata> = {
  /**
   * Whether to only return threads marked as resolved or unresolved. If not provided,
   * all threads will be returned.
   */
  resolved?: boolean;
  /**
   * The metadata to filter the threads by. If provided, only threads with metadata that matches
   * the provided metadata will be returned. If not provided, all threads will be returned.
   */
  metadata?: Partial<QueryMetadata<M>>;
};

export type UseUserThreadsOptions<M extends BaseMetadata> = {
  /**
   * The query (including metadata) to filter the threads by. If provided, only threads
   * that match the query will be returned. If not provided, all threads will be returned.
   */
  query?: ThreadsQuery<M>;
};

export type UseThreadsOptions<M extends BaseMetadata> = {
  /**
   * The query (including metadata) to filter the threads by. If provided, only threads
   * that match the query will be returned. If not provided, all threads will be returned.
   */
  query?: ThreadsQuery<M>;

  /**
   * Whether to scroll to a comment on load based on the URL hash. Defaults to `true`.
   *
   * @example
   * Given the URL `https://example.com/my-room#cm_xxx`, the `cm_xxx` comment will be
   * scrolled to on load if it exists in the page.
   */
  scrollOnLoad?: boolean;
};

export type InboxNotificationsQuery = {
  /**
   * Whether to only return inbox notifications for a specific room.
   */
  roomId?: string;

  /**
   * Whether to only return inbox notifications for a specific kind.
   */
  kind?: string;
};

export type UseInboxNotificationsOptions = {
  /**
   * The query to filter the inbox notifications by. If provided, only inbox notifications
   * that match the query will be returned. If not provided, all inbox notifications will be returned.
   */
  query?: InboxNotificationsQuery;
};

export type UserAsyncResult<T> = AsyncResult<T, "user">;
export type UserAsyncSuccess<T> = AsyncSuccess<T, "user">;

export type RoomInfoAsyncResult = AsyncResult<DRI, "info">;
export type RoomInfoAsyncSuccess = AsyncSuccess<DRI, "info">;

export type GroupInfoAsyncResult = AsyncResult<DGI, "info">;
export type GroupInfoAsyncSuccess = AsyncSuccess<DGI, "info">;

export type AttachmentUrlAsyncResult = AsyncResult<string, "url">;
export type AttachmentUrlAsyncSuccess = AsyncSuccess<string, "url">;

export type GroupAsyncResult = AsyncResult<GroupData | undefined, "group">;
export type GroupAsyncSuccess = AsyncSuccess<GroupData | undefined, "group">;

// prettier-ignore
export type CreateThreadOptions<M extends BaseMetadata> =
  Resolve<
    { body: CommentBody, attachments?: CommentAttachment[]; }
    & PartialUnless<M, { metadata: M }>
  >;

export type EditThreadMetadataOptions<M extends BaseMetadata> = {
  threadId: string;
  metadata: Patchable<M>;
};

export type CreateCommentOptions = {
  threadId: string;
  body: CommentBody;
  attachments?: CommentAttachment[];
};

export type EditCommentOptions = {
  threadId: string;
  commentId: string;
  body: CommentBody;
  attachments?: CommentAttachment[];
};

export type DeleteCommentOptions = {
  threadId: string;
  commentId: string;
};

export type CommentReactionOptions = {
  threadId: string;
  commentId: string;
  emoji: string;
};

// -----------------------------------------------------------------------

type PaginationFields = {
  hasFetchedAll: boolean;
  isFetchingMore: boolean;
  fetchMore: () => void;
  fetchMoreError?: Error;
};

export type PagedAsyncSuccess<T, F extends string> = Resolve<
  AsyncSuccess<T, F> & PaginationFields
>;

export type PagedAsyncResult<T, F extends string> = Relax<
  AsyncLoading<F> | AsyncError<F> | PagedAsyncSuccess<T, F>
>;

// -----------------------------------------------------------------------

export type ThreadsAsyncSuccess<M extends BaseMetadata> = PagedAsyncSuccess<ThreadData<M>[], "threads">; // prettier-ignore
export type ThreadsAsyncResult<M extends BaseMetadata> = PagedAsyncResult<ThreadData<M>[], "threads">; // prettier-ignore

export type InboxNotificationsAsyncSuccess = PagedAsyncSuccess<InboxNotificationData[], "inboxNotifications">; // prettier-ignore
export type InboxNotificationsAsyncResult = PagedAsyncResult<InboxNotificationData[], "inboxNotifications">; // prettier-ignore

export type UnreadInboxNotificationsCountAsyncSuccess = AsyncSuccess<number, "count">; // prettier-ignore
export type UnreadInboxNotificationsCountAsyncResult = AsyncResult<number, "count">; // prettier-ignore

export type NotificationSettingsAsyncResult = AsyncResult<NotificationSettings, "settings"> // prettier-ignore
export type NotificationSettingsAsyncSuccess = AsyncSuccess<NotificationSettings, "settings">; // prettier-ignore

export type RoomSubscriptionSettingsAsyncSuccess = AsyncSuccess<RoomSubscriptionSettings, "settings">; // prettier-ignore
export type RoomSubscriptionSettingsAsyncResult = AsyncResult<RoomSubscriptionSettings, "settings">; // prettier-ignore

export type HistoryVersionDataAsyncResult = AsyncResult<Uint8Array>;

export type HistoryVersionsAsyncSuccess = AsyncSuccess<HistoryVersion[], "versions">; // prettier-ignore
export type HistoryVersionsAsyncResult = AsyncResult<HistoryVersion[], "versions">; // prettier-ignore

export type AiChatsAsyncSuccess = PagedAsyncSuccess<AiChat[], "chats">; // prettier-ignore
export type AiChatsAsyncResult = PagedAsyncResult<AiChat[], "chats">; // prettier-ignore

export type AiChatAsyncSuccess = AsyncSuccess<AiChat, "chat">; // prettier-ignore
export type AiChatAsyncResult = AsyncResult<AiChat, "chat">; // prettier-ignore

export type AiChatMessagesAsyncSuccess = AsyncSuccess<readonly UiChatMessage[], "messages">; // prettier-ignore
export type AiChatMessagesAsyncResult = AsyncResult<readonly UiChatMessage[], "messages">; // prettier-ignore

export type RoomProviderProps<P extends JsonObject, S extends LsonObject> =
  // prettier-ignore
  Resolve<
  {
    /**
     * The id of the room you want to connect to
     */
    id: string;
    children: ReactNode;

    /**
     * Whether or not the room should connect to Liveblocks servers
     * when the RoomProvider is rendered.
     *
     * By default equals to `typeof window !== "undefined"`,
     * meaning the RoomProvider tries to connect to Liveblocks servers
     * only on the client side.
     */
    autoConnect?: boolean;
  }

  // Initial presence is only mandatory if the custom type requires it to be
  & PartialUnless<
    P,
    {
      /**
       * The initial Presence to use and announce when you enter the Room. The
       * Presence is available on all users in the Room (me & others).
       */
      initialPresence: P | ((roomId: string) => P);
    }
  >

  // Initial storage is only mandatory if the custom type requires it to be
  & PartialUnless<
    S,
    {
      /**
       * The initial Storage to use when entering a new Room.
       */
      initialStorage: S | ((roomId: string) => S);
    }
  >
>;

/**
 * For any function type, returns a similar function type, but without the
 * first argument.
 */
export type OmitFirstArg<F> = F extends (
  first: any,
  ...rest: infer A
) => infer R
  ? (...args: A) => R
  : never;

export type MutationContext<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
> = {
  storage: LiveObject<S>;
  self: User<P, U>;
  others: readonly User<P, U>[];
  setMyPresence: (
    patch: Partial<P>,
    options?: { addToHistory: boolean }
  ) => void;
};

export type ThreadSubscription = Relax<
  // The user is not subscribed to the thread
  | { status: "not-subscribed"; subscribe: () => void; unsubscribe: () => void }
  // The user is subscribed to the thread but has never read it
  | {
      status: "subscribed";
      unreadSince: null;
      subscribe: () => void;
      unsubscribe: () => void;
    }
  // The user is subscribed to the thread and has read it
  | {
      status: "subscribed";
      unreadSince: Date;
      subscribe: () => void;
      unsubscribe: () => void;
    }
>;

export type SharedContextBundle<U extends BaseUserMeta> = {
  classic: {
    /**
     * Obtains a reference to the current Liveblocks client.
     */
    useClient(): Client<U>;

    /**
     * Returns user info from a given user ID.
     *
     * @example
     * const { user, error, isLoading } = useUser("user-id");
     */
    useUser(userId: string): UserAsyncResult<U["info"]>;

    /**
     * Returns room info from a given room ID.
     *
     * @example
     * const { info, error, isLoading } = useRoomInfo("room-id");
     */
    useRoomInfo(roomId: string): RoomInfoAsyncResult;

    /**
     * Returns group info from a given group ID.
     *
     * @example
     * const { info, error, isLoading } = useGroupInfo("group-id");
     */
    useGroupInfo(groupId: string): GroupInfoAsyncResult;

    /**
     * Returns whether the hook is called within a RoomProvider context.
     *
     * @example
     * const isInsideRoom = useIsInsideRoom();
     */
    useIsInsideRoom(): boolean;

    /**
     * useErrorListener is a React hook that allows you to respond to any
     * Liveblocks error, for example room connection errors, errors
     * creating/editing/deleting threads, etc.
     *
     * @example
     * useErrorListener(err => {
     *   console.error(err);
     * })
     */
    useErrorListener(callback: (err: LiveblocksError) => void): void;

    /**
     * Returns the current Liveblocks sync status, and triggers a re-render
     * whenever it changes. Can be used to render a "Saving..." indicator, or for
     * preventing that a browser tab can be closed until all changes have been
     * synchronized with the server.
     *
     * @example
     * const syncStatus = useSyncStatus();  // "synchronizing" | "synchronized"
     * const syncStatus = useSyncStatus({ smooth: true });
     */
    useSyncStatus(options?: UseSyncStatusOptions): SyncStatus;

    /**
     * Make knowledge about your application state available to any AI used in
     * a chat or a one-off request.
     *
     * For example:
     *
     *     <RegisterAiKnowledge
     *        description="The current mode of my application"
     *        value="dark" />
     *
     *     <RegisterAiKnowledge
     *        description="The current list of todos"
     *        value={todos} />
     *
     * By mounting this component, the AI will get access to this knwoledge.
     * By unmounting this component, the AI will no longer have access to it.
     * It can choose to use or ignore this knowledge in its responses.
     */
    RegisterAiKnowledge: ComponentType<RegisterAiKnowledgeProps>;

    RegisterAiTool: ComponentType<RegisterAiToolProps>;
  };

  suspense: {
    /**
     * Obtains a reference to the current Liveblocks client.
     */
    useClient(): Client<U>;

    /**
     * Returns user info from a given user ID.
     *
     * @example
     * const { user } = useUser("user-id");
     */
    useUser(userId: string): UserAsyncSuccess<U["info"]>;

    /**
     * Returns room info from a given room ID.
     *
     * @example
     * const { info } = useRoomInfo("room-id");
     */
    useRoomInfo(roomId: string): RoomInfoAsyncSuccess;

    /**
     * Returns group info from a given group ID.
     *
     * @example
     * const { info } = useGroupInfo("group-id");
     */
    useGroupInfo(groupId: string): GroupInfoAsyncSuccess;

    /**
     * Returns whether the hook is called within a RoomProvider context.
     *
     * @example
     * const isInsideRoom = useIsInsideRoom();
     */
    useIsInsideRoom(): boolean;

    /**
     * useErrorListener is a React hook that allows you to respond to any
     * Liveblocks error, for example room connection errors, errors
     * creating/editing/deleting threads, etc.
     *
     * @example
     * useErrorListener(err => {
     *   console.error(err);
     * })
     */
    useErrorListener(callback: (err: LiveblocksError) => void): void;

    /**
     * Returns the current Liveblocks sync status, and triggers a re-render
     * whenever it changes. Can be used to render a "Saving..." indicator, or for
     * preventing that a browser tab can be closed until all changes have been
     * synchronized with the server.
     *
     * @example
     * const syncStatus = useSyncStatus();  // "synchronizing" | "synchronized"
     * const syncStatus = useSyncStatus({ smooth: true });
     */
    useSyncStatus(options?: UseSyncStatusOptions): SyncStatus;

    /**
     * Make knowledge about your application state available to any AI used in
     * a chat or a one-off request.
     *
     * For example:
     *
     *     <RegisterAiKnowledge
     *        description="The current mode of my application"
     *        value="dark" />
     *
     *     <RegisterAiKnowledge
     *        description="The current list of todos"
     *        value={todos} />
     *
     * By mounting this component, the AI will get access to this knwoledge.
     * By unmounting this component, the AI will no longer have access to it.
     * It can choose to use or ignore this knowledge in its responses.
     */
    RegisterAiKnowledge: ComponentType<RegisterAiKnowledgeProps>;

    RegisterAiTool: ComponentType<RegisterAiToolProps>;
  };
};

/**
 * Properties that are the same in RoomContext and RoomContext["suspense"].
 */
type RoomContextBundleCommon<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
> = {
  /**
   * You normally don't need to directly interact with the RoomContext, but
   * it can be necessary if you're building an advanced app where you need to
   * set up a context bridge between two React renderers.
   */
  RoomContext: Context<Room<P, S, U, E, M> | null>;

  /**
   * Makes a Room available in the component hierarchy below.
   * Joins the room when the component is mounted, and automatically leaves
   * the room when the component is unmounted.
   */
  RoomProvider(props: RoomProviderProps<P, S>): JSX.Element;

  /**
   * Returns the Room of the nearest RoomProvider above in the React component
   * tree.
   */
  useRoom(options?: { allowOutsideRoom: false }): Room<P, S, U, E, M>;
  useRoom(options: { allowOutsideRoom: boolean }): Room<P, S, U, E, M> | null;

  /**
   * Returns the current connection status for the Room, and triggers
   * a re-render whenever it changes. Can be used to render a status badge.
   */
  useStatus(): Status;

  /**
   * Returns a callback that lets you broadcast custom events to other users in the room
   *
   * @example
   * const broadcast = useBroadcastEvent();
   *
   * broadcast({ type: "CUSTOM_EVENT", data: { x: 0, y: 0 } });
   */
  useBroadcastEvent(): (event: E, options?: BroadcastOptions) => void;

  /**
   * Get informed when users enter or leave the room, as an event.
   *
   * @example
   * useOthersListener({ type, user, others }) => {
   *   if (type === 'enter') {
   *     // `user` has joined the room
   *   } else if (type === 'leave') {
   *     // `user` has left the room
   *   }
   * })
   */
  useOthersListener(callback: (event: OthersEvent<P, U>) => void): void;

  /**
   * Get informed when reconnecting to the Liveblocks servers is taking
   * longer than usual. This typically is a sign of a client that has lost
   * internet connectivity.
   *
   * This isn't problematic (because the Liveblocks client is still trying to
   * reconnect), but it's typically a good idea to inform users about it if
   * the connection takes too long to recover.
   *
   * @example
   * useLostConnectionListener(event => {
   *   if (event === 'lost') {
   *     toast.warn('Reconnecting to the Liveblocks servers is taking longer than usual...')
   *   } else if (event === 'failed') {
   *     toast.warn('Reconnecting to the Liveblocks servers failed.')
   *   } else if (event === 'restored') {
   *     toast.clear();
   *   }
   * })
   */
  useLostConnectionListener(
    callback: (event: LostConnectionEvent) => void
  ): void;

  /**
   * useEventListener is a React hook that allows you to respond to events broadcast
   * by other users in the room.
   *
   * The `user` argument will indicate which `User` instance sent the message.
   * This will be equal to one of the others in the room, but it can be `null`
   * in case this event was broadcasted from the server.
   *
   * @example
   * useEventListener(({ event, user, connectionId }) => {
   * //                         ^^^^ Will be Client A
   *   if (event.type === "CUSTOM_EVENT") {
   *     // Do something
   *   }
   * });
   */
  useEventListener(callback: (data: RoomEventMessage<P, U, E>) => void): void;

  /**
   * Returns the room.history
   */
  useHistory(): History;

  /**
   * Returns a function that undoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   */
  useUndo(): () => void;

  /**
   * Returns a function that redoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   */
  useRedo(): () => void;

  /**
   * Returns whether there are any operations to undo.
   */
  useCanUndo(): boolean;

  /**
   * Returns whether there are any operations to redo.
   */
  useCanRedo(): boolean;

  /**
   * Returns the mutable (!) Storage root. This hook exists for
   * backward-compatible reasons.
   *
   * @example
   * const [root] = useStorageRoot();
   */
  useStorageRoot(): [root: LiveObject<S> | null];

  /**
   * Returns the presence of the current user of the current room, and a function to update it.
   * It is different from the setState function returned by the useState hook from React.
   * You don't need to pass the full presence object to update it.
   *
   * @example
   * const [myPresence, updateMyPresence] = useMyPresence();
   * updateMyPresence({ x: 0 });
   * updateMyPresence({ y: 0 });
   *
   * // At the next render, "myPresence" will be equal to "{ x: 0, y: 0 }"
   */
  useMyPresence(): [
    P,
    (patch: Partial<P>, options?: { addToHistory: boolean }) => void,
  ];

  /**
   * useUpdateMyPresence is similar to useMyPresence but it only returns the function to update the current user presence.
   * If you don't use the current user presence in your component, but you need to update it (e.g. live cursor), it's better to use useUpdateMyPresence to avoid unnecessary renders.
   *
   * @example
   * const updateMyPresence = useUpdateMyPresence();
   * updateMyPresence({ x: 0 });
   * updateMyPresence({ y: 0 });
   *
   * // At the next render, the presence of the current user will be equal to "{ x: 0, y: 0 }"
   */
  useUpdateMyPresence(): (
    patch: Partial<P>,
    options?: { addToHistory: boolean }
  ) => void;

  /**
   * Create a callback function that lets you mutate Liveblocks state.
   *
   * The first argument that gets passed into your callback will be
   * a "mutation context", which exposes the following:
   *
   *   - `storage` - The mutable Storage root.
   *                 You can mutate any Live structures with this, for example:
   *                 `storage.get('layers').get('layer1').set('fill', 'red')`
   *
   *   - `setMyPresence` - Call this with a new (partial) Presence value.
   *
   *   - `self` - A read-only version of the latest self, if you need it to
   *              compute the next state.
   *
   *   - `others` - A read-only version of the latest others list, if you
   *                need it to compute the next state.
   *
   * useMutation is like React's useCallback, except that the first argument
   * that gets passed into your callback will be a "mutation context".
   *
   * If you want get access to the immutable root somewhere in your mutation,
   * you can use `storage.ToImmutable()`.
   *
   * @example
   * const fillLayers = useMutation(
   *   ({ storage }, color: Color) => {
   *     ...
   *   },
   *   [],
   * );
   *
   * fillLayers('red');
   *
   * const deleteLayers = useMutation(
   *   ({ storage }) => {
   *     ...
   *   },
   *   [],
   * );
   *
   * deleteLayers();
   */
  useMutation<
    F extends (context: MutationContext<P, S, U>, ...args: any[]) => any,
  >(
    callback: F,
    deps: readonly unknown[]
  ): OmitFirstArg<F>;

  /**
   * Returns an array with information about all the users currently connected
   * in the room (except yourself).
   *
   * @example
   * const others = useOthers();
   *
   * // Example to map all cursors in JSX
   * return (
   *   <>
   *     {others.map((user) => {
   *        if (user.presence.cursor == null) {
   *          return null;
   *        }
   *        return <Cursor key={user.connectionId} cursor={user.presence.cursor} />
   *      })}
   *   </>
   * )
   */
  useOthers(): readonly User<P, U>[];

  /**
   * Extract arbitrary data based on all the users currently connected in the
   * room (except yourself).
   *
   * The selector function will get re-evaluated any time a user enters or
   * leaves the room, as well as whenever their presence data changes.
   *
   * The component that uses this hook will automatically re-render if your
   * selector function returns a different value from its previous run.
   *
   * By default `useOthers()` uses strict `===` to check for equality. Take
   * extra care when returning a computed object or list, for example when you
   * return the result of a .map() or .filter() call from the selector. In
   * those cases, you'll probably want to use a `shallow` comparison check.
   *
   * @example
   * const avatars = useOthers(users => users.map(u => u.info.avatar), shallow);
   * const cursors = useOthers(users => users.map(u => u.presence.cursor), shallow);
   * const someoneIsTyping = useOthers(users => users.some(u => u.presence.isTyping));
   *
   */
  useOthers<T>(
    selector: (others: readonly User<P, U>[]) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T;

  /**
   * Returns an array of connection IDs. This matches the values you'll get by
   * using the `useOthers()` hook.
   *
   * Roughly equivalent to:
   *   useOthers((others) => others.map(other => other.connectionId), shallow)
   *
   * This is useful in particular to implement efficiently rendering components
   * for each user in the room, e.g. cursors.
   *
   * @example
   * const ids = useOthersConnectionIds();
   * // [2, 4, 7]
   */
  useOthersConnectionIds(): readonly number[];

  /**
   * Related to useOthers(), but optimized for selecting only "subsets" of
   * others. This is useful for performance reasons in particular, because
   * selecting only a subset of users also means limiting the number of
   * re-renders that will be triggered.
   *
   * @example
   * const avatars = useOthersMapped(user => user.info.avatar);
   * //    ^^^^^^^
   * //    { connectionId: number; data: string }[]
   *
   * The selector function you pass to useOthersMapped() is called an "item
   * selector", and operates on a single user at a time. If you provide an
   * (optional) "item comparison" function, it will be used to compare each
   * item pairwise.
   *
   * For example, to select multiple properties:
   *
   * @example
   * const avatarsAndCursors = useOthersMapped(
   *   user => [u.info.avatar, u.presence.cursor],
   *   shallow,  // 👈
   * );
   */
  useOthersMapped<T>(
    itemSelector: (other: User<P, U>) => T,
    itemIsEqual?: (prev: T, curr: T) => boolean
  ): ReadonlyArray<readonly [connectionId: number, data: T]>;

  /**
   * Given a connection ID (as obtained by using `useOthersConnectionIds`), you
   * can call this selector deep down in your component stack to only have the
   * component re-render if properties for this particular user change.
   *
   * @example
   * // Returns only the selected values re-renders whenever that selection changes)
   * const { x, y } = useOther(2, user => user.presence.cursor);
   */
  useOther<T>(
    connectionId: number,
    selector: (other: User<P, U>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T;

  /**
   * Returns a function that creates a thread with an initial comment, and optionally some metadata.
   *
   * @example
   * const createThread = useCreateThread();
   * createThread({ body: {}, metadata: {} });
   */
  useCreateThread(): (options: CreateThreadOptions<M>) => ThreadData<M>;

  /**
   * Returns a function that deletes a thread and its associated comments.
   * Only the thread creator can delete a thread, it will throw otherwise.
   *
   * @example
   * const deleteThread = useDeleteThread();
   * deleteThread("th_xxx");
   */
  useDeleteThread(): (threadId: string) => void;

  /**
   * Returns a function that edits a thread's metadata.
   * To delete an existing metadata property, set its value to `null`.
   *
   * @example
   * const editThreadMetadata = useEditThreadMetadata();
   * editThreadMetadata({ threadId: "th_xxx", metadata: {} })
   */
  useEditThreadMetadata(): (options: EditThreadMetadataOptions<M>) => void;

  /**
   * Returns a function that marks a thread as resolved.
   *
   * @example
   * const markThreadAsResolved = useMarkThreadAsResolved();
   * markThreadAsResolved("th_xxx");
   */
  useMarkThreadAsResolved(): (threadId: string) => void;

  /**
   * Returns a function that marks a thread as unresolved.
   *
   * @example
   * const markThreadAsUnresolved = useMarkThreadAsUnresolved();
   * markThreadAsUnresolved("th_xxx");
   */
  useMarkThreadAsUnresolved(): (threadId: string) => void;

  /**
   * Returns a function that subscribes the user to a thread.
   *
   * @example
   * const subscribeToThread = useSubscribeToThread();
   * subscribeToThread("th_xxx");
   */
  useSubscribeToThread(): (threadId: string) => void;

  /**
   * Returns a function that unsubscribes the user from a thread.
   *
   * @example
   * const unsubscribeFromThread = useUnsubscribeFromThread();
   * unsubscribeFromThread("th_xxx");
   */
  useUnsubscribeFromThread(): (threadId: string) => void;

  /**
   * Returns a function that adds a comment to a thread.
   *
   * @example
   * const createComment = useCreateComment();
   * createComment({ threadId: "th_xxx", body: {} });
   */
  useCreateComment(): (options: CreateCommentOptions) => CommentData;

  /**
   * Returns a function that edits a comment's body.
   *
   * @example
   * const editComment = useEditComment()
   * editComment({ threadId: "th_xxx", commentId: "cm_xxx", body: {} })
   */
  useEditComment(): (options: EditCommentOptions) => void;

  /**
   * Returns a function that deletes a comment.
   * If it is the last non-deleted comment, the thread also gets deleted.
   *
   * @example
   * const deleteComment = useDeleteComment();
   * deleteComment({ threadId: "th_xxx", commentId: "cm_xxx" })
   */
  useDeleteComment(): (options: DeleteCommentOptions) => void;

  /**
   * Returns a function that adds a reaction from a comment.
   *
   * @example
   * const addReaction = useAddReaction();
   * addReaction({ threadId: "th_xxx", commentId: "cm_xxx", emoji: "👍" })
   */
  useAddReaction(): (options: CommentReactionOptions) => void;

  /**
   * Returns a function that removes a reaction on a comment.
   *
   * @example
   * const removeReaction = useRemoveReaction();
   * removeReaction({ threadId: "th_xxx", commentId: "cm_xxx", emoji: "👍" })
   */
  useRemoveReaction(): (options: CommentReactionOptions) => void;

  /**
   * Returns a function that updates the user's subscription settings
   * for the current room.
   *
   * @example
   * const updateRoomSubscriptionSettings = useUpdateRoomSubscriptionSettings();
   * updateRoomSubscriptionSettings({ threads: "all" });
   */
  useUpdateRoomSubscriptionSettings(): (
    settings: Partial<RoomSubscriptionSettings>
  ) => void;

  /**
   * Returns a function that marks a thread as read.
   *
   * @example
   * const markThreadAsRead = useMarkThreadAsRead();
   * markThreadAsRead("th_xxx");
   */
  useMarkThreadAsRead(): (threadId: string) => void;

  /**
   * Returns the subscription status of a thread, methods to update it, and when
   * the thread was last read.
   *
   * @example
   * const { status, subscribe, unsubscribe, unreadSince } = useThreadSubscription("th_xxx");
   */
  useThreadSubscription(threadId: string): ThreadSubscription;
};

export type RoomContextBundle<
  P extends JsonObject,
  S extends LsonObject,
  U extends BaseUserMeta,
  E extends Json,
  M extends BaseMetadata,
> = Resolve<
  RoomContextBundleCommon<P, S, U, E, M> &
    SharedContextBundle<U>["classic"] & {
      /**
       * Extract arbitrary data from the Liveblocks Storage state, using an
       * arbitrary selector function.
       *
       * The selector function will get re-evaluated any time something changes in
       * Storage. The value returned by your selector function will also be the
       * value returned by the hook.
       *
       * The `root` value that gets passed to your selector function is
       * a immutable/readonly version of your Liveblocks storage root.
       *
       * The component that uses this hook will automatically re-render if the
       * returned value changes.
       *
       * By default `useStorage()` uses strict `===` to check for equality. Take
       * extra care when returning a computed object or list, for example when you
       * return the result of a .map() or .filter() call from the selector. In
       * those cases, you'll probably want to use a `shallow` comparison check.
       */
      useStorage<T>(
        selector: (root: ToImmutable<S>) => T,
        isEqual?: (prev: T | null, curr: T | null) => boolean
      ): T | null;

      /**
       * Gets the current user once it is connected to the room.
       *
       * @example
       * const me = useSelf();
       * if (me !== null) {
       *   const { x, y } = me.presence.cursor;
       * }
       */
      useSelf(): User<P, U> | null;

      /**
       * Extract arbitrary data based on the current user.
       *
       * The selector function will get re-evaluated any time your presence data
       * changes.
       *
       * The component that uses this hook will automatically re-render if your
       * selector function returns a different value from its previous run.
       *
       * By default `useSelf()` uses strict `===` to check for equality. Take extra
       * care when returning a computed object or list, for example when you return
       * the result of a .map() or .filter() call from the selector. In those
       * cases, you'll probably want to use a `shallow` comparison check.
       *
       * Will return `null` while Liveblocks isn't connected to a room yet.
       *
       * @example
       * const cursor = useSelf(me => me.presence.cursor);
       * if (cursor !== null) {
       *   const { x, y } = cursor;
       * }
       *
       */
      useSelf<T>(
        selector: (me: User<P, U>) => T,
        isEqual?: (prev: T, curr: T) => boolean
      ): T | null;

      /**
       * Returns the threads within the current room.
       *
       * @example
       * const { threads, error, isLoading } = useThreads();
       */
      useThreads(options?: UseThreadsOptions<M>): ThreadsAsyncResult<M>;

      /**
       * Returns the user's subscription settings for the current room
       * and a function to update them.
       *
       * @example
       * const [{ settings }, updateSettings] = useRoomSubscriptionSettings();
       */
      useRoomSubscriptionSettings(): [
        RoomSubscriptionSettingsAsyncResult,
        (settings: Partial<RoomSubscriptionSettings>) => void,
      ];

      /**
       * Returns a presigned URL for an attachment by its ID.
       *
       * @example
       * const { url, error, isLoading } = useAttachmentUrl("at_xxx");
       */
      useAttachmentUrl(attachmentId: string): AttachmentUrlAsyncResult;

      /**
       * (Private beta)  Returns a history of versions of the current room.
       *
       * @example
       * const { versions, error, isLoading } = useHistoryVersions();
       */
      useHistoryVersions(): HistoryVersionsAsyncResult;

      /**
       * (Private beta) Returns the data of a specific version of the current room.
       *
       * @example
       * const { data, error, isLoading } = useHistoryVersionData(version.id);
       */
      useHistoryVersionData(id: string): HistoryVersionDataAsyncResult;

      suspense: Resolve<
        RoomContextBundleCommon<P, S, U, E, M> &
          SharedContextBundle<U>["suspense"] & {
            /**
             * Extract arbitrary data from the Liveblocks Storage state, using an
             * arbitrary selector function.
             *
             * The selector function will get re-evaluated any time something changes in
             * Storage. The value returned by your selector function will also be the
             * value returned by the hook.
             *
             * The `root` value that gets passed to your selector function is
             * a immutable/readonly version of your Liveblocks storage root.
             *
             * The component that uses this hook will automatically re-render if the
             * returned value changes.
             *
             * By default `useStorage()` uses strict `===` to check for equality. Take
             * extra care when returning a computed object or list, for example when you
             * return the result of a .map() or .filter() call from the selector. In
             * those cases, you'll probably want to use a `shallow` comparison check.
             */
            useStorage<T>(
              selector: (root: ToImmutable<S>) => T,
              isEqual?: (prev: T, curr: T) => boolean
            ): T;

            /**
             * Gets the current user once it is connected to the room.
             *
             * @example
             * const me = useSelf();
             * const { x, y } = me.presence.cursor;
             */
            useSelf(): User<P, U>;

            /**
             * Extract arbitrary data based on the current user.
             *
             * The selector function will get re-evaluated any time your presence data
             * changes.
             *
             * The component that uses this hook will automatically re-render if your
             * selector function returns a different value from its previous run.
             *
             * By default `useSelf()` uses strict `===` to check for equality. Take extra
             * care when returning a computed object or list, for example when you return
             * the result of a .map() or .filter() call from the selector. In those
             * cases, you'll probably want to use a `shallow` comparison check.
             *
             * @example
             * const cursor = useSelf(me => me.presence.cursor);
             * const { x, y } = cursor;
             *
             */
            useSelf<T>(
              selector: (me: User<P, U>) => T,
              isEqual?: (prev: T, curr: T) => boolean
            ): T;

            /**
             * Returns the threads within the current room.
             *
             * @example
             * const { threads } = useThreads();
             */
            useThreads(options?: UseThreadsOptions<M>): ThreadsAsyncSuccess<M>;

            /**
             * (Private beta) Returns a history of versions of the current room.
             *
             * @example
             * const { versions } = useHistoryVersions();
             */
            useHistoryVersions(): HistoryVersionsAsyncSuccess;

            // /**
            //  * Returns the data of a specific version of the current room's history.
            //  *
            //  * @example
            //  * const { data } = useHistoryVersionData(version.id);
            //  */
            // useHistoryVersionData(versionId: string): HistoryVersionDataState;

            /**
             * Returns the user's subscription settings for the current room
             * and a function to update them.
             *
             * @example
             * const [{ settings }, updateSettings] = useRoomSubscriptionSettings();
             */
            useRoomSubscriptionSettings(): [
              RoomSubscriptionSettingsAsyncSuccess,
              (settings: Partial<RoomSubscriptionSettings>) => void,
            ];

            /**
             * Returns a presigned URL for an attachment by its ID.
             *
             * @example
             * const { url } = useAttachmentUrl("at_xxx");
             */
            useAttachmentUrl(attachmentId: string): AttachmentUrlAsyncSuccess;
          }
      >;
    }
>;

/**
 * Properties that are the same in LiveblocksContext and LiveblocksContext["suspense"].
 */
type LiveblocksContextBundleCommon<M extends BaseMetadata> = {
  /**
   * Makes Liveblocks features outside of rooms (e.g. Notifications) available
   * in the component hierarchy below.
   */
  LiveblocksProvider(props: PropsWithChildren): JSX.Element;

  /**
   * Returns a function that marks an inbox notification as read for the current user.
   *
   * @example
   * const markInboxNotificationAsRead = useMarkInboxNotificationAsRead();
   * markInboxNotificationAsRead("in_xxx");
   */
  useMarkInboxNotificationAsRead(): (inboxNotificationId: string) => void;

  /**
   * Returns a function that marks all of the current user's inbox notifications as read.
   *
   * @example
   * const markAllInboxNotificationsAsRead = useMarkAllInboxNotificationsAsRead();
   * markAllInboxNotificationsAsRead();
   */
  useMarkAllInboxNotificationsAsRead(): () => void;

  /**
   * Returns a function that deletes an inbox notification for the current user.
   *
   * @example
   * const deleteInboxNotification = useDeleteInboxNotification();
   * deleteInboxNotification("in_xxx");
   */
  useDeleteInboxNotification(): (inboxNotificationId: string) => void;

  /**
   * Returns a function that deletes all of the current user's inbox notifications.
   *
   * @example
   * const deleteAllInboxNotifications = useDeleteAllInboxNotifications();
   * deleteAllInboxNotifications();
   */
  useDeleteAllInboxNotifications(): () => void;

  /**
   * Returns the thread associated with a `"thread"` inbox notification.
   *
   * It can **only** be called with IDs of `"thread"` inbox notifications,
   * so we recommend only using it when customizing the rendering or in other
   * situations where you can guarantee the kind of the notification.
   *
   * When `useInboxNotifications` returns `"thread"` inbox notifications,
   * it also receives the associated threads and caches them behind the scenes.
   * When you call `useInboxNotificationThread`, it simply returns the cached thread
   * for the inbox notification ID you passed to it, without any fetching or waterfalls.
   *
   * @example
   * const thread = useInboxNotificationThread("in_xxx");
   */
  useInboxNotificationThread(inboxNotificationId: string): ThreadData<M>;

  /**
   * Returns notification settings for the current user.
   *
   * @example
   * const [{ settings }, updateNotificationSettings] = useNotificationSettings()
   */
  useNotificationSettings(): [
    NotificationSettingsAsyncResult,
    (settings: PartialNotificationSettings) => void,
  ];

  /**
   * Returns a function that updates the user's notification
   * settings for a project.
   *
   * @example
   * const updateNotificationSettings = useUpdateNotificationSettings()
   */
  useUpdateNotificationSettings(): (
    settings: PartialNotificationSettings
  ) => void;

  /**
   * Returns the current Liveblocks sync status, and triggers a re-render
   * whenever it changes. Can be used to render a "Saving..." indicator, or for
   * preventing that a browser tab can be closed until all changes have been
   * synchronized with the server.
   *
   * @example
   * const syncStatus = useSyncStatus();  // "synchronizing" | "synchronized"
   * const syncStatus = useSyncStatus({ smooth: true });
   */
  useSyncStatus(options?: UseSyncStatusOptions): SyncStatus;

  /**
   * Returns a function that creates an AI chat.
   *
   * If you do not pass a title for the chat, it will be automatically computed
   * after the first AI response.
   *
   * @example
   * const createAiChat = useCreateAiChat();
   *
   * // Create a chat with an automatically generated title
   * createAiChat("ai-chat-id");
   *
   * // Create a chat with a custom title
   * createAiChat({ id: "ai-chat-id", title: "My AI chat" });
   */
  useCreateAiChat(): {
    (chatId: string): void;
    (options: CreateAiChatOptions): void;
  };

  /**
   * Returns a function that deletes the AI chat with the specified id.
   *
   * @example
   * const deleteAiChat = useDeleteAiChat();
   * deleteAiChat("ai-chat-id");
   */
  useDeleteAiChat(): (chatId: string) => void;

  /**
   * Returns a function to send a message in an AI chat.
   *
   * @example
   * const sendAiMessage = useSendAiMessage("chat-id");
   * sendAiMessage("Hello, Liveblocks AI!");
   *
   * You can set options related to the message being sent, such as the copilot ID to use.
   *
   * @example
   * const sendAiMessage = useSendAiMessage("chat-id", { copilotId: "co_xxx" });
   * sendAiMessage("Hello, Liveblocks AI!");
   *
   * @example
   * const sendAiMessage = useSendAiMessage("chat-id", { copilotId: "co_xxx" });
   * sendAiMessage({ text: "Hello, Liveblocks AI!", copilotId: "co_yyy" });
   */
  useSendAiMessage(
    chatId: string,
    options?: UseSendAiMessageOptions
  ): {
    (text: string): AiUserMessage;
    (options: SendAiMessageOptions): AiUserMessage;
  };

  /**
   * Returns a function to send a message in an AI chat.
   *
   * @example
   * const sendAiMessage = useSendAiMessage();
   * sendAiMessage({ chatId: "chat-id", text: "Hello, Liveblocks AI!" });
   *
   * You can set options related to the message being sent, such as the copilot ID to use.
   *
   * @example
   * const sendAiMessage = useSendAiMessage();
   * sendAiMessage({ chatId: "chat-id", text: "Hello, Liveblocks AI!", copilotId: "co_xxx" });
   */
  useSendAiMessage(): (
    message: WithRequired<SendAiMessageOptions, "chatId">
  ) => AiChatMessage;

  /**
   * Returns a function to send a message in an AI chat.
   *
   * @example
   * const sendAiMessage = useSendAiMessage(chatId);
   * sendAiMessage("Hello, Liveblocks AI!");
   *
   * You can set options related to the message being sent, such as the copilot ID to use.
   *
   * @example
   * const sendAiMessage = useSendAiMessage(chatId, { copilotId: "co_xxx" });
   * sendAiMessage("Hello, Liveblocks AI!");
   *
   * You can also pass the chat ID dynamically if it's not known when calling the hook.
   *
   * @example
   * const sendAiMessage = useSendAiMessage();
   * sendAiMessage({ chatId: "chat-id", text: "Hello, Liveblocks AI!" });
   *
   * @example
   * const sendAiMessage = useSendAiMessage();
   * sendAiMessage({ chatId: "chat-id", text: "Hello, Liveblocks AI!", copilotId: "co_xxx" });
   */
  useSendAiMessage(
    chatId?: string,
    options?: UseSendAiMessageOptions
  ): {
    (text: string): AiUserMessage;
    (options: SendAiMessageOptions): AiUserMessage;
    (options: WithRequired<SendAiMessageOptions, "chatId">): AiUserMessage;
  };
};

export type LiveblocksContextBundle<
  U extends BaseUserMeta,
  M extends BaseMetadata,
> = Resolve<
  LiveblocksContextBundleCommon<M> &
    SharedContextBundle<U>["classic"] & {
      /**
       * Returns the inbox notifications for the current user.
       *
       * @example
       * const { inboxNotifications, error, isLoading } = useInboxNotifications();
       */
      useInboxNotifications(
        options?: UseInboxNotificationsOptions
      ): InboxNotificationsAsyncResult;

      /**
       * Returns the number of unread inbox notifications for the current user.
       *
       * @example
       * const { count, error, isLoading } = useUnreadInboxNotificationsCount();
       */
      useUnreadInboxNotificationsCount(
        options?: UseInboxNotificationsOptions
      ): UnreadInboxNotificationsCountAsyncResult;

      /**
       * @experimental
       *
       * This hook is experimental and could be removed or changed at any time!
       * Do not use unless explicitly recommended by the Liveblocks team.
       */
      useUserThreads_experimental(
        options?: UseUserThreadsOptions<M>
      ): ThreadsAsyncResult<M>;

      /**
       * (Private beta)  Returns the chats for the current user.
       *
       * @example
       * const { chats, error, isLoading } = useAiChats();
       */
      useAiChats(options?: UseAiChatsOptions): AiChatsAsyncResult;

      /**
       * (Private beta)  Returns the messages in the given chat.
       *
       * @example
       * const { messages, error, isLoading } = useAiChatMessages("my-chat");
       */
      useAiChatMessages(chatId: string): AiChatMessagesAsyncResult;

      /**
       * (Private beta)  Returns the information of the given chat.
       *
       * @example
       * const { chat, error, isLoading } = useAiChat("my-chat");
       */
      useAiChat(chatId: string): AiChatAsyncResult;

      suspense: Resolve<
        LiveblocksContextBundleCommon<M> &
          SharedContextBundle<U>["suspense"] & {
            /**
             * Returns the inbox notifications for the current user.
             *
             * @example
             * const { inboxNotifications } = useInboxNotifications();
             */
            useInboxNotifications(
              options?: UseInboxNotificationsOptions
            ): InboxNotificationsAsyncSuccess;

            /**
             * Returns the number of unread inbox notifications for the current user.
             *
             * @example
             * const { count } = useUnreadInboxNotificationsCount();
             */
            useUnreadInboxNotificationsCount(
              options?: UseInboxNotificationsOptions
            ): UnreadInboxNotificationsCountAsyncSuccess;

            /**
             * Returns notification settings for the current user.
             *
             * @example
             * const [{ settings }, updateNotificationSettings] = useNotificationSettings()
             */
            useNotificationSettings(): [
              NotificationSettingsAsyncResult,
              (settings: PartialNotificationSettings) => void,
            ];

            /**
             * @experimental
             *
             * This hook is experimental and could be removed or changed at any time!
             * Do not use unless explicitly recommended by the Liveblocks team.
             */
            useUserThreads_experimental(
              options?: UseUserThreadsOptions<M>
            ): ThreadsAsyncSuccess<M>;

            /**
             * (Private beta)  Returns the chats for the current user.
             *
             * @example
             * const { chats } = useAiChats();
             */
            useAiChats(options?: UseAiChatsOptions): AiChatsAsyncSuccess;

            /**
             * (Private beta) Returns the messages in the given chat.
             *
             * @example
             * const { messages } = useAiChatMessages("my-chat");
             */
            useAiChatMessages(chatId: string): AiChatMessagesAsyncSuccess;

            /**
             * (Private beta)  Returns the information of the given chat.
             *
             * @example
             * const { chat, error, isLoading } = useAiChat("my-chat");
             */
            useAiChat(chatId: string): AiChatAsyncSuccess;
          }
      >;
    }
>;
