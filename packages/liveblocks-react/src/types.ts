import type {
  BaseUserMeta,
  BroadcastOptions,
  History,
  Json,
  JsonObject,
  LiveObject,
  LostConnectionEvent,
  LsonObject,
  Others,
  Room,
  Status,
  User,
} from "@liveblocks/client";
import type {
  BaseMetadata,
  CommentData,
  Resolve,
  RoomInitializers,
  ThreadData,
  ToImmutable,
} from "@liveblocks/core";

import type {
  CreateCommentOptions,
  CreateThreadOptions,
  DeleteCommentOptions,
  EditCommentOptions,
  EditThreadMetadataOptions,
  RoomThreads,
} from "./comments/CommentsRoom";

export type UserState<T> =
  | {
      user?: never;
      isLoading: true;
      error?: never;
    }
  | {
      user?: T;
      isLoading: false;
      error?: never;
    }
  | {
      user?: never;
      isLoading: false;
      error: Error;
    };

export type UserStateSuspense<T> = Resolve<
  Extract<UserState<T>, { isLoading: false; error?: never }>
>;

export type RoomProviderProps<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
> = Resolve<
  {
    /**
     * The id of the room you want to connect to
     */
    id: string;
    children: React.ReactNode;

    /**
     * Whether or not the room should connect to Liveblocks servers
     * when the RoomProvider is rendered.
     *
     * By default equals to `typeof window !== "undefined"`,
     * meaning the RoomProvider tries to connect to Liveblocks servers
     * only on the client side.
     */
    shouldInitiallyConnect?: boolean;

    /**
     * If you're on React 17 or lower, pass in a reference to
     * `ReactDOM.unstable_batchedUpdates` or
     * `ReactNative.unstable_batchedUpdates` here.
     *
     * @example
     * import { unstable_batchedUpdates } from "react-dom";
     *
     * <RoomProvider ... unstable_batchedUpdates={unstable_batchedUpdates} />
     *
     * This will prevent you from running into the so-called "stale props"
     * and/or "zombie child" problem that React 17 and lower can suffer from.
     * Not necessary when you're on React v18 or later.
     */
    unstable_batchedUpdates?: (cb: () => void) => void;
  } & RoomInitializers<TPresence, TStorage>
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
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
> = {
  storage: LiveObject<TStorage>;
  self: User<TPresence, TUserMeta>;
  others: Others<TPresence, TUserMeta>;
  setMyPresence: (
    patch: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ) => void;
};

type RoomContextBundleShared<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json,
  TThreadMetadata extends BaseMetadata,
> = {
  /**
   * You normally don't need to directly interact with the RoomContext, but
   * it can be necessary if you're building an advanced app where you need to
   * set up a context bridge between two React renderers.
   */
  RoomContext: React.Context<Room<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  > | null>;

  /**
   * Makes a Room available in the component hierarchy below.
   * When this component is unmounted, the current user leave the room.
   * That means that you can't have 2 RoomProvider with the same room id in your react tree.
   */
  RoomProvider(props: RoomProviderProps<TPresence, TStorage>): JSX.Element;

  /**
   * Returns the Room of the nearest RoomProvider above in the React component
   * tree.
   */
  useRoom(): Room<TPresence, TStorage, TUserMeta, TRoomEvent>;

  /**
   * Returns the current connection status for the Room, and triggers
   * a re-render whenever it changes. Can be used to render a status badge.
   */
  useStatus(): Status;

  /**
   * Returns a function that batches modifications made during the given function.
   * All the modifications are sent to other clients in a single message.
   * All the modifications are merged in a single history item (undo/redo).
   * All the subscribers are called only after the batch is over.
   */
  useBatch<T>(): (callback: () => T) => T;

  /**
   * Returns a callback that lets you broadcast custom events to other users in the room
   *
   * @example
   * const broadcast = useBroadcastEvent();
   *
   * broadcast({ type: "CUSTOM_EVENT", data: { x: 0, y: 0 } });
   */
  useBroadcastEvent(): (event: TRoomEvent, options?: BroadcastOptions) => void;

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
   * useErrorListener is a react hook that lets you react to potential room connection errors.
   *
   * @example
   * useErrorListener(er => {
   *   console.error(er);
   * })
   */
  useErrorListener(callback: (err: Error) => void): void;

  /**
   * useEventListener is a react hook that lets you react to event broadcasted by other users in the room.
   *
   * @example
   * useEventListener(({ connectionId, event }) => {
   *   if (event.type === "CUSTOM_EVENT") {
   *     // Do something
   *   }
   * });
   */
  useEventListener(
    callback: (eventData: { connectionId: number; event: TRoomEvent }) => void
  ): void;

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
  useStorageRoot(): [root: LiveObject<TStorage> | null];

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
    TPresence,
    (patch: Partial<TPresence>, options?: { addToHistory: boolean }) => void,
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
    patch: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ) => void;

  /**
   * Create a callback function that lets you mutate Liveblocks state.
   *
   * The first argument that gets passed into your callback will be
   * a "mutation context", which exposes the following:
   *
   *   - `root` - The mutable Storage root.
   *              You can normal mutation on Live structures with this, for
   *              example: root.get('layers').get('layer1').set('fill',
   *              'red')
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
   * you can use `root.ToImmutable()`.
   *
   * @example
   * const fillLayers = useMutation(
   *   ({ root }, color: Color) => {
   *     ...
   *   },
   *   [],
   * );
   *
   * fillLayers('red');
   *
   * const deleteLayers = useMutation(
   *   ({ root }) => {
   *     ...
   *   },
   *   [],
   * );
   *
   * deleteLayers();
   */
  useMutation<
    F extends (
      context: MutationContext<TPresence, TStorage, TUserMeta>,
      ...args: any[]
    ) => any,
  >(
    callback: F,
    deps: readonly unknown[]
  ): OmitFirstArg<F>;

  /**
   * Returns an object that lets you get information about all the users
   * currently connected in the room.
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
  useOthers(): Others<TPresence, TUserMeta>;

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
    selector: (others: Others<TPresence, TUserMeta>) => T,
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
    itemSelector: (other: User<TPresence, TUserMeta>) => T,
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
    selector: (other: User<TPresence, TUserMeta>) => T,
    isEqual?: (prev: T, curr: T) => boolean
  ): T;

  /**
   * Returns a function that creates a thread with an initial comment, and optionally some metadata.
   *
   * @example
   * const createThread = useCreateThread();
   * createThread({ body: {}, metadata: {} });
   */
  useCreateThread(): (
    options: CreateThreadOptions<TThreadMetadata>
  ) => ThreadData<TThreadMetadata>;

  /**
   * Returns a function that edits a thread's metadata.
   *
   * @example
   * const editThreadMetadata = useEditThreadMetadata();
   * editThreadMetadata({ threadId: "th_xxx", metadata: {} } })
   */
  useEditThreadMetadata(): (
    options: EditThreadMetadataOptions<TThreadMetadata>
  ) => void;

  /**
   * Returns a function that adds a comment to a thread.
   *
   * @example
   * const createComment = useCreateComment();
   * createComment({ threadId: "th_xxx", body: { {} } });
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
};

export type RoomContextBundle<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json,
  TThreadMetadata extends BaseMetadata,
> = Resolve<
  RoomContextBundleShared<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent,
    TThreadMetadata
  > & {
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
      selector: (root: ToImmutable<TStorage>) => T,
      isEqual?: (prev: T | null, curr: T | null) => boolean
    ): T | null;

    /**
     * Gets the current user once it is connected to the room.
     *
     * @example
     * const me = useSelf();
     * const { x, y } = me.presence.cursor;
     */
    useSelf(): User<TPresence, TUserMeta> | null;

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
      selector: (me: User<TPresence, TUserMeta>) => T,
      isEqual?: (prev: T, curr: T) => boolean
    ): T | null;

    /**
     * Returns the threads within the current room.
     *
     * @example
     * const { threads, error, isLoading } = useThreads();
     */
    useThreads(): RoomThreads<TThreadMetadata>;

    /**
     * Returns user info from a given user ID.
     *
     * @example
     * const { user, error, isLoading } = useUser("user-id");
     */
    useUser(userId: string): UserState<TUserMeta["info"]>;

    /**
     * @private
     */
    useMentionSuggestions(search?: string): string[] | undefined;

    //
    // Legacy hooks
    //

    /**
     * Returns the LiveList associated with the provided key. The hook triggers
     * a re-render if the LiveList is updated, however it does not triggers
     * a re-render if a nested CRDT is updated.
     *
     * @param key The storage key associated with the LiveList
     * @returns null while the storage is loading, otherwise, returns the LiveList associated to the storage
     *
     * @example
     * const animals = useList("animals");  // e.g. [] or ["🦁", "🐍", "🦍"]
     */
    useList<TKey extends Extract<keyof TStorage, string>>(
      key: TKey
    ): TStorage[TKey] | null;

    /**
     * Returns the LiveMap associated with the provided key. If the LiveMap
     * does not exist, a new empty LiveMap will be created. The hook triggers
     * a re-render if the LiveMap is updated, however it does not triggers
     * a re-render if a nested CRDT is updated.
     *
     * @param key The storage key associated with the LiveMap
     * @returns null while the storage is loading, otherwise, returns the LiveMap associated to the storage
     *
     * @example
     * const shapesById = useMap("shapes");
     */
    useMap<TKey extends Extract<keyof TStorage, string>>(
      key: TKey
    ): TStorage[TKey] | null;

    /**
     * Returns the LiveObject associated with the provided key.
     * The hook triggers a re-render if the LiveObject is updated, however it does not triggers a re-render if a nested CRDT is updated.
     *
     * @param key The storage key associated with the LiveObject
     * @returns null while the storage is loading, otherwise, returns the LveObject associated to the storage
     *
     * @example
     * const object = useObject("obj");
     */
    useObject<TKey extends Extract<keyof TStorage, string>>(
      key: TKey
    ): TStorage[TKey] | null;

    suspense: Resolve<
      RoomContextBundleShared<
        TPresence,
        TStorage,
        TUserMeta,
        TRoomEvent,
        TThreadMetadata
      > & {
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
          selector: (root: ToImmutable<TStorage>) => T,
          isEqual?: (prev: T, curr: T) => boolean
        ): T;

        /**
         * Gets the current user once it is connected to the room.
         *
         * @example
         * const me = useSelf();
         * const { x, y } = me.presence.cursor;
         */
        useSelf(): User<TPresence, TUserMeta>;

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
          selector: (me: User<TPresence, TUserMeta>) => T,
          isEqual?: (prev: T, curr: T) => boolean
        ): T;

        /**
         * Returns the threads within the current room.
         *
         * @example
         * const threads = useThreads();
         */
        useThreads(): ThreadData<TThreadMetadata>[];

        /**
         * Returns user info from a given user ID.
         *
         * @example
         * const { user, error, isLoading } = useUser("user-id");
         */
        useUser(userId: string): UserStateSuspense<TUserMeta["info"]>;

        //
        // Legacy hooks
        //

        /**
         * Returns the LiveList associated with the provided key. The hook triggers
         * a re-render if the LiveList is updated, however it does not triggers
         * a re-render if a nested CRDT is updated.
         *
         * @param key The storage key associated with the LiveList
         * @returns null while the storage is loading, otherwise, returns the LiveList associated to the storage
         *
         * @example
         * const animals = useList("animals");  // e.g. [] or ["🦁", "🐍", "🦍"]
         */
        useList<TKey extends Extract<keyof TStorage, string>>(
          key: TKey
        ): TStorage[TKey];

        /**
         * Returns the LiveMap associated with the provided key. If the LiveMap
         * does not exist, a new empty LiveMap will be created. The hook triggers
         * a re-render if the LiveMap is updated, however it does not triggers
         * a re-render if a nested CRDT is updated.
         *
         * @param key The storage key associated with the LiveMap
         * @returns null while the storage is loading, otherwise, returns the LiveMap associated to the storage
         *
         * @example
         * const shapesById = useMap("shapes");
         */
        useMap<TKey extends Extract<keyof TStorage, string>>(
          key: TKey
        ): TStorage[TKey];

        /**
         * Returns the LiveObject associated with the provided key.
         * The hook triggers a re-render if the LiveObject is updated, however it does not triggers a re-render if a nested CRDT is updated.
         *
         * @param key The storage key associated with the LiveObject
         * @returns null while the storage is loading, otherwise, returns the LveObject associated to the storage
         *
         * @example
         * const object = useObject("obj");
         */
        useObject<TKey extends Extract<keyof TStorage, string>>(
          key: TKey
        ): TStorage[TKey];
      }
    >;
  }
>;
