import {
  BaseMetadata,
  Json,
  LiveList,
  LiveObject,
  Lson,
} from "@liveblocks/client";
import * as classic from "@liveblocks/react";
import * as suspense from "@liveblocks/react/suspense";
import { expectAssignable, expectError, expectType } from "tsd";

// LiveblocksProvider
{
  const LiveblocksProvider = classic.LiveblocksProvider;

  expectError(<LiveblocksProvider />);
  expectError(<LiveblocksProvider throttle={16} />);

  <LiveblocksProvider authEndpoint="/api/auth" />;
  <LiveblocksProvider publicApiKey="pk_xxx" />;
  <LiveblocksProvider authEndpoint="/api/auth" throttle={16} />;
  <LiveblocksProvider
    authEndpoint={async () => ({ token: "token" })}
    throttle={16}
  />;

  <LiveblocksProvider
    authEndpoint="/api/auth"
    resolveUsers={async () => [{ foo: "bar" }]}
  />;

  <LiveblocksProvider
    authEndpoint="/api/auth"
    resolveUsers={async () => [{ name: "Vincent", age: 42 }]}
  />;

  <LiveblocksProvider authEndpoint="/api/auth" preventUnsavedChanges />;
}

// LiveblocksProvider (suspense)
{
  const LiveblocksProvider = suspense.LiveblocksProvider;

  expectError(<LiveblocksProvider />);
  expectError(<LiveblocksProvider throttle={16} />);

  <LiveblocksProvider authEndpoint="/api/auth" />;
  <LiveblocksProvider publicApiKey="pk_xxx" />;
  <LiveblocksProvider authEndpoint="/api/auth" throttle={16} />;
  <LiveblocksProvider
    authEndpoint={async () => ({ token: "token" })}
    throttle={16}
  />;

  <LiveblocksProvider
    authEndpoint="/api/auth"
    resolveUsers={async () => [{ foo: "bar" }]}
  />;

  <LiveblocksProvider
    authEndpoint="/api/auth"
    resolveUsers={async () => [{ name: "Vincent", age: 42 }]}
  />;

  <LiveblocksProvider authEndpoint="/api/auth" preventUnsavedChanges />;
}

// RoomProvider
{
  const RoomProvider = classic.RoomProvider;

  // Missing mandatory room ID is an error
  expectError(
    <RoomProvider /* no room id */>
      <div />
    </RoomProvider>
  );

  <RoomProvider id="my-room">
    <div />
  </RoomProvider>;

  <RoomProvider
    id="my-room"
    initialPresence={{ anything: ["is", "fine", "here"] }}
  >
    <div />
  </RoomProvider>;

  <RoomProvider
    id="my-room"
    initialStorage={{
      foo: new LiveList([]),
      bar: new LiveObject(),
    }}
  >
    <div />
  </RoomProvider>;

  <RoomProvider
    id="my-room"
    initialPresence={{ anything: ["is", "fine", "here"] }}
    initialStorage={{
      foo: new LiveList([]),
      bar: new LiveObject(),
    }}
  >
    <div />
  </RoomProvider>;
}

// RoomProvider (suspense)
{
  const RoomProvider = suspense.RoomProvider;

  // Missing mandatory room ID is an error
  expectError(
    <RoomProvider /* no room id */>
      <div />
    </RoomProvider>
  );

  <RoomProvider id="my-room">
    <div />
  </RoomProvider>;

  <RoomProvider
    id="my-room"
    initialPresence={{ anything: ["is", "fine", "here"] }}
  >
    <div />
  </RoomProvider>;

  <RoomProvider
    id="my-room"
    initialStorage={{
      foo: new LiveList([]),
      bar: new LiveObject(),
    }}
  >
    <div />
  </RoomProvider>;

  <RoomProvider
    id="my-room"
    initialPresence={{ anything: ["is", "fine", "here"] }}
    initialStorage={{
      foo: new LiveList([]),
      bar: new LiveObject(),
    }}
  >
    <div />
  </RoomProvider>;
}

// ---------------------------------------------------------
// Hook APIs
// ---------------------------------------------------------

// useRoom()
{
  const room = classic.useRoom();
  expectType<Json | undefined>(room.getPresence().cursor);
  expectType<Json | undefined>(room.getPresence().nonexisting);
}

// useRoom() (suspense)
{
  const room = suspense.useRoom();
  expectType<Json | undefined>(room.getPresence().cursor);
  expectType<Json | undefined>(room.getPresence().nonexisting);
}

// ---------------------------------------------------------

// useIsInsideRoom()
{
  const isInsideRoom = classic.useIsInsideRoom();
  expectType<boolean>(isInsideRoom);
}

// useIsInsideRoom() (suspense)
{
  const isInsideRoom = suspense.useIsInsideRoom();
  expectType<boolean>(isInsideRoom);
}

// ---------------------------------------------------------

// useStorageStatus()
{
  expectType<"not-loaded" | "loading" | "synchronizing" | "synchronized">(
    classic.useStorageStatus()
  );
  expectType<"synchronizing" | "synchronized">(suspense.useStorageStatus());
}

// ---------------------------------------------------------

// useSelf()
{
  const me = classic.useSelf();
  expectType<Json | undefined>(me?.presence.cursor);
  expectType<Json | undefined>(me?.presence.nonexisting);

  expectType<string | undefined>(me?.info?.name);
  expectType<Json | undefined>(me?.info?.age);
  expectType<Json | undefined>(me?.info?.nonexisting);
}

// useSelf() (suspense)
{
  const me = suspense.useSelf();
  expectType<Json | undefined>(me.presence.cursor);
  expectType<Json | undefined>(me.presence.nonexisting);

  expectType<string | undefined>(me.info?.name);
  expectType<Json | undefined>(me.info?.age);
  expectType<Json | undefined>(me.info?.nonexisting);
}

// useSelf(selector)
{
  const x = classic.useSelf((me) => me.presence.cursor);
  expectType<Json | undefined | null>(x);
}

// useSelf(selector) (suspense)
{
  const x = suspense.useSelf((me) => me.presence.cursor);
  expectType<Json | undefined>(x);
}

// ---------------------------------------------------------

// useOthers()
{
  const others = classic.useOthers();
  expectType<Json | undefined>(others[13]!.presence.cursor);
  expectType<boolean>(others[0]!.canWrite);
}

// useOthers() (suspense)
{
  const others = suspense.useOthers();
  expectType<Json | undefined>(others[13]!.presence.cursor);
  expectType<boolean>(others[0]!.canWrite);
}

// useOthers(selector)
{
  const num = classic.useOthers((others) => others.length);
  expectType<number>(num);

  const xs = classic.useOthers((others) =>
    others.map((o) => o.presence.cursor)
  );
  expectType<(Json | undefined)[]>(xs);
}

// useOthers(selector) (suspense)
{
  const num = classic.useOthers((others) => others.length);
  expectType<number>(num);

  const xs = classic.useOthers((others) =>
    others.map((o) => o.presence.cursor)
  );
  expectType<(Json | undefined)[]>(xs);
}

// useOthers(selector, eq)
{
  const xs = classic.useOthers(
    (others) => others.map((o) => o.presence.cursor),
    classic.shallow
  );
  expectType<(Json | undefined)[]>(xs);
}

// useOthers(selector, eq) (suspense)
{
  const xs = suspense.useOthers(
    (others) => others.map((o) => o.presence.cursor),
    suspense.shallow
  );
  expectType<(Json | undefined)[]>(xs);
}

// ---------------------------------------------------------

// The useMutation() hook
{
  expectType<(a: number, b: boolean) => "hi">(
    classic.useMutation((mut, _a: number, _b: boolean) => {
      expectType<Json | undefined>(mut.self.presence.cursor);
      expectType<Json | undefined>(mut.self.presence.nonexisting);
      expectType<string | undefined>(mut.self.info!.name);
      expectType<Json | undefined>(mut.self.info!.age);
      expectType<Json | undefined>(mut.self.info!.nonexisting);

      expectType<Json | undefined>(mut.others[0]!.presence.cursor);
      expectType<Json | undefined>(mut.others[0]!.presence.nonexisting);
      expectType<string | undefined>(mut.others[0]!.info!.name);
      expectType<Json | undefined>(mut.others[0]!.info!.age);
      expectType<Json | undefined>(mut.others[0]!.info!.nonexisting);

      expectType<Lson | undefined>(mut.storage.get("animals"));
      expectType<Lson | undefined>(mut.storage.get("nonexisting"));
      expectType<void>(mut.setMyPresence({ cursor: { x: 0, y: 0 } }));
      expectType<void>(mut.setMyPresence({ nonexisting: 123 }));

      return "hi" as const;
    }, [])
  );
}

// The useMutation() hook (suspense)
{
  expectType<(a: number, b: boolean) => "hi">(
    suspense.useMutation((mut, _a: number, _b: boolean) => {
      expectType<Json | undefined>(mut.self.presence.cursor);
      expectType<Json | undefined>(mut.self.presence.nonexisting);
      expectType<string | undefined>(mut.self.info!.name);
      expectType<Json | undefined>(mut.self.info!.age);
      expectType<Json | undefined>(mut.self.info!.nonexisting);

      expectType<Json | undefined>(mut.others[0]!.presence.cursor);
      expectType<Json | undefined>(mut.others[0]!.presence.nonexisting);
      expectType<string | undefined>(mut.others[0]!.info!.name);
      expectType<Json | undefined>(mut.others[0]!.info!.age);
      expectType<Json | undefined>(mut.others[0]!.info!.nonexisting);

      expectType<Lson | undefined>(mut.storage.get("animals"));
      expectType<Lson | undefined>(mut.storage.get("nonexisting"));
      expectType<void>(mut.setMyPresence({ cursor: { x: 0, y: 0 } }));
      expectType<void>(mut.setMyPresence({ nonexisting: 123 }));

      return "hi" as const;
    }, [])
  );
}

// ---------------------------------------------------------

// useBroadcastEvent()
{
  const broadcast = classic.useBroadcastEvent();
  broadcast({ type: "emoji", emoji: "😍" });
  broadcast({ type: "left", userId: "1234" });
  broadcast({ a: [], b: "", c: 123, d: false, e: undefined, f: null }); // arbitrary JSON
  expectError(broadcast({ notSerializable: new Date() }));
  expectError(broadcast(new Date()));
}

// useBroadcastEvent() (suspense)
{
  const broadcast = suspense.useBroadcastEvent();
  broadcast({ type: "emoji", emoji: "😍" });
  broadcast({ type: "left", userId: "1234" });
  broadcast({ a: [], b: "", c: 123, d: false, e: undefined, f: null }); // arbitrary JSON
  expectError(broadcast({ notSerializable: new Date() }));
  expectError(broadcast(new Date()));
}

// ---------------------------------------------------------

// The useUser() hook
{
  const { user, error, isLoading } = classic.useUser("user-id");
  expectType<boolean>(isLoading);
  expectType<string | undefined>(user?.name);
  expectType<string | undefined>(user?.avatar);
  expectType<Json | undefined>(user?.age);
  expectType<Error | undefined>(error);
}

// The useUser() hook (suspense)
{
  const { user, error, isLoading } = suspense.useUser("user-id");
  expectType<false>(isLoading);
  expectType<string | undefined>(user?.name);
  expectType<string | undefined>(user?.avatar);
  expectType<Json | undefined>(user?.age);
  expectType<undefined>(error);
}

// ---------------------------------------------------------

// The useRoomInfo() hook
{
  const { info, error, isLoading } = classic.useRoomInfo("room-id");
  expectType<boolean>(isLoading);
  expectType<string | undefined>(info?.name);
  expectType<string | undefined>(info?.url);
  expectType<Json | undefined>(info?.nonexisting);
  expectType<Error | undefined>(error);
}

// The useRoomInfo() hook (suspense)
{
  const { info, error, isLoading } = suspense.useRoomInfo("room-id");
  expectType<false>(isLoading);
  expectType<string | undefined>(info.name);
  expectType<string | undefined>(info.url);
  expectType<Json | undefined>(info?.nonexisting);
  expectType<undefined>(error);
}

// ---------------------------------------------------------

// The useCreateThread() hook
{
  const createThread = classic.useCreateThread();
  expectError(createThread({}));

  const thread1 = createThread({
    body: {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "hi" }] }],
    },
  });

  expectType<"thread">(thread1.type);
  expectType<string>(thread1.id);
  expectType<string>(thread1.roomId);
  expectType<"comment">(thread1.comments[0]!.type);
  expectType<string>(thread1.comments[0]!.id);
  expectType<string>(thread1.comments[0]!.threadId);

  expectType<string | number | boolean | undefined>(thread1.metadata.color);

  const thread2 = createThread({
    body: {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "hi" }] }],
    },
    metadata: { foo: "bar" },
  });

  expectType<string>(thread2.id);
  expectType<string | number | boolean | undefined>(thread2.metadata.foo);
  expectType<string | number | boolean | undefined>(
    thread2.metadata.nonexisting
  );
}

// The useCreateThread() hook (suspense)
{
  const createThread = suspense.useCreateThread();
  expectError(createThread({}));

  const thread1 = createThread({
    body: {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "hi" }] }],
    },
  });

  expectType<"thread">(thread1.type);
  expectType<string>(thread1.id);
  expectType<string>(thread1.roomId);
  expectType<"comment">(thread1.comments[0]!.type);
  expectType<string>(thread1.comments[0]!.id);
  expectType<string>(thread1.comments[0]!.threadId);

  expectType<string | number | boolean | undefined>(thread1.metadata.foo);

  const thread2 = createThread({
    body: {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "hi" }] }],
    },
    metadata: { foo: "bar" },
  });

  expectType<string>(thread2.id);
  expectType<string | number | boolean | undefined>(thread2.metadata.foo);
  expectType<string | number | boolean | undefined>(
    thread2.metadata.nonexisting
  );
}

// ---------------------------------------------------------

// The useEditThreadMetadata() hook
{
  const editMetadata = classic.useEditThreadMetadata();
  expectError(editMetadata({}));

  expectType<void>(editMetadata({ threadId: "th_xxx", metadata: {} }));
  expectType<void>(
    editMetadata({ threadId: "th_xxx", metadata: { nonexisting: 123 } })
  );
  expectType<void>(
    editMetadata({ threadId: "th_xxx", metadata: { nonexisting: null } })
  );
}

// The useEditThreadMetadata() hook (suspense)
{
  //        ---------------------
  const editMetadata = suspense.useEditThreadMetadata();
  expectError(editMetadata({})); // no body = error

  expectType<void>(
    editMetadata({ threadId: "th_xxx", metadata: { nonexisting: null } })
  );
  expectType<void>(
    editMetadata({ threadId: "th_xxx", metadata: { nonexisting: 123 } })
  );

  expectType<void>(editMetadata({ threadId: "th_xxx", metadata: {} }));
  expectType<void>(
    editMetadata({ threadId: "th_xxx", metadata: { color: null } })
  );
  expectType<void>(
    editMetadata({ threadId: "th_xxx", metadata: { color: "red" } })
  );
}

// ---------------------------------------------------------

// The useCreateComment() hook
{
  {
    const createComment = classic.useCreateComment();
    expectError(createComment({}));

    const comment = createComment({
      threadId: "th_xxx",
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "hi" }] }],
      },
    });

    expectType<"comment">(comment.type);
    expectType<string>(comment.id);
    expectType<string>(comment.threadId);
  }
}

// The useCreateComment() hook (suspense)
{
  const createComment = suspense.useCreateComment();
  expectError(createComment({}));

  const comment = createComment({
    threadId: "th_xxx",
    body: {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "hi" }] }],
    },
  });

  expectType<"comment">(comment.type);
  expectType<string>(comment.id);
  expectType<string>(comment.threadId);
}

// ---------------------------------------------------------

// The useEditComment() hook
{
  const editComment = classic.useEditComment();
  expectError(editComment({}));

  expectType<void>(
    editComment({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      body: { version: 1, content: [] },
    })
  );
}

// The useEditComment() hook (suspense)
{
  const editComment = suspense.useEditComment();
  expectError(editComment({}));

  expectType<void>(
    editComment({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      body: { version: 1, content: [] },
    })
  );
}

// ---------------------------------------------------------

// The useDeleteComment() hook
{
  const deleteComment = classic.useDeleteComment();

  expectError(deleteComment({}));
  expectError(deleteComment({ threadId: "th_xxx" }));
  expectError(deleteComment({ commentId: "co_xxx" }));

  expectType<void>(deleteComment({ threadId: "th_xxx", commentId: "co_xxx" }));
}

// The useDeleteComment() hook (suspense)
{
  const deleteComment = suspense.useDeleteComment();

  expectError(deleteComment({}));
  expectError(deleteComment({ threadId: "th_xxx" }));
  expectError(deleteComment({ commentId: "co_xxx" }));

  expectType<void>(deleteComment({ threadId: "th_xxx", commentId: "co_xxx" }));
}

// ---------------------------------------------------------

// The useAddReaction() hook
{
  const addReaction = classic.useAddReaction();

  expectError(addReaction({}));
  expectError(addReaction({ threadId: "th_xxx", emoji: "👍" }));
  expectError(addReaction({ commentId: "th_xxx", emoji: "👍" }));
  expectError(addReaction({ threadId: "th_xxx", commentId: "th_xxx" }));

  expectType<void>(
    addReaction({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      emoji: "👍",
    })
  );
}

// The useAddReaction() hook (suspense)
{
  const addReaction = suspense.useAddReaction();

  expectError(addReaction({}));
  expectError(addReaction({ threadId: "th_xxx", emoji: "👍" }));
  expectError(addReaction({ commentId: "th_xxx", emoji: "👍" }));
  expectError(addReaction({ threadId: "th_xxx", commentId: "th_xxx" }));

  expectType<void>(
    addReaction({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      emoji: "👍",
    })
  );
}

// ---------------------------------------------------------

// The useRemoveReaction() hook
{
  const removeReaction = classic.useRemoveReaction();

  expectError(removeReaction({}));
  expectError(removeReaction({ threadId: "th_xxx", emoji: "👍" }));
  expectError(removeReaction({ commentId: "th_xxx", emoji: "👍" }));
  expectError(removeReaction({ threadId: "th_xxx", commentId: "th_xxx" }));

  expectType<void>(
    removeReaction({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      emoji: "👍",
    })
  );
}

// The useRemoveReaction() hook (suspense)
{
  const removeReaction = suspense.useRemoveReaction();

  expectError(removeReaction({}));
  expectError(removeReaction({ threadId: "th_xxx", emoji: "👍" }));
  expectError(removeReaction({ commentId: "th_xxx", emoji: "👍" }));
  expectError(removeReaction({ threadId: "th_xxx", commentId: "th_xxx" }));

  expectType<void>(
    removeReaction({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      emoji: "👍",
    })
  );
}

// ---------------------------------------------------------

// The useInboxNotifications() hook
{
  expectType<boolean>(classic.useInboxNotifications().isLoading);
  expectType<Error | undefined>(classic.useInboxNotifications().error);
  expectType<("thread" | "textMention" | `$${string}`)[] | undefined>(
    classic.useInboxNotifications().inboxNotifications?.map((ibn) => ibn.kind)
  );
  expectType<(string | undefined)[] | undefined>(
    classic.useInboxNotifications().inboxNotifications?.map((ibn) => ibn.roomId)
  );
}

// The useInboxNotifications() hook (suspense)
{
  expectType<false>(suspense.useInboxNotifications().isLoading);
  expectType<undefined>(suspense.useInboxNotifications().error);
  expectType<("thread" | "textMention" | `$${string}`)[]>(
    suspense.useInboxNotifications().inboxNotifications?.map((ibn) => ibn.kind)
  );
  expectType<(string | undefined)[]>(
    suspense
      .useInboxNotifications()
      .inboxNotifications?.map((ibn) => ibn.roomId)
  );
}

// ---------------------------------------------------------

// The useInboxNotificationThread() hook
{
  const result = classic.useInboxNotificationThread("in_xxx");
  expectType<"thread">(result.type);
  expectType<string>(result.roomId);
  expectAssignable<unknown[]>(result.comments);
  expectType<BaseMetadata>(result.metadata);
  expectType<string | number | boolean | undefined>(result.metadata.color);
  expectType<string | number | boolean | undefined>(
    result.metadata.nonexisting
  );
}

// The useInboxNotificationThread() hook (suspense)
{
  const result = suspense.useInboxNotificationThread("in_xxx");
  expectType<"thread">(result.type);
  expectType<string>(result.roomId);
  expectAssignable<unknown[]>(result.comments);
  expectType<BaseMetadata>(result.metadata);
  expectType<string | number | boolean | undefined>(result.metadata.color);
  expectType<string | number | boolean | undefined>(
    result.metadata.nonexisting
  );
}

// ---------------------------------------------------------

// The useMarkInboxNotificationAsRead() hook
{
  const markRead = classic.useMarkInboxNotificationAsRead();
  expectType<void>(markRead("in_xxx"));
}

// The useMarkInboxNotificationAsRead() hook (suspense)
{
  const markRead = suspense.useMarkInboxNotificationAsRead();
  expectType<void>(markRead("in_xxx"));
}

// ---------------------------------------------------------

// The useMarkAllInboxNotificationsAsRead() hook
{
  const markAllRead = classic.useMarkAllInboxNotificationsAsRead();
  expectType<void>(markAllRead());
}

// The useMarkAllInboxNotificationsAsRead() hook (suspense)
{
  const markAllRead = suspense.useMarkAllInboxNotificationsAsRead();
  expectType<void>(markAllRead());
}

// ---------------------------------------------------------

// The useDeleteInboxNotification() hook
{
  const deleteNotification = classic.useDeleteInboxNotification();
  expectType<void>(deleteNotification("in_xxx"));
}

// The useDeleteInboxNotification() hook (suspense)
{
  const deleteNotification = suspense.useDeleteInboxNotification();
  expectType<void>(deleteNotification("in_xxx"));
}

// ---------------------------------------------------------

// The useDeleteAllInboxNotifications() hook
{
  const deleteAllNotifications = classic.useDeleteAllInboxNotifications();
  expectType<void>(deleteAllNotifications());
}

// The useDeleteAllInboxNotifications() hook (suspense)
{
  const deleteAllNotifications = suspense.useDeleteAllInboxNotifications();
  expectType<void>(deleteAllNotifications());
}

// ---------------------------------------------------------

// The useUnreadInboxNotificationsCount() hook
{
  const { count, error, isLoading } =
    classic.useUnreadInboxNotificationsCount();
  expectType<boolean>(isLoading);
  expectType<number | undefined>(count);
  expectType<Error | undefined>(error);
}

// The useUnreadInboxNotificationsCount() hook (suspense)
{
  const { count, error, isLoading } =
    suspense.useUnreadInboxNotificationsCount();
  expectType<false>(isLoading);
  expectType<number>(count);
  expectType<undefined>(error);
}

// ---------------------------------------------------------

// The useSyncStatus() hook
{
  const status = classic.useSyncStatus();
  expectType<"synchronizing" | "synchronized">(status);
}
{
  const status = suspense.useSyncStatus();
  expectType<"synchronizing" | "synchronized">(status);
}
