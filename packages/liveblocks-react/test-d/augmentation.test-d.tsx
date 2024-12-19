import { LiveList, LiveMap, LiveObject } from "@liveblocks/core";
import * as classic from "@liveblocks/react";
import * as suspense from "@liveblocks/react/suspense";
import { expectAssignable, expectError, expectType } from "tsd";

//
// User-provided type augmentations
//
declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number };
    };

    Storage: {
      animals: LiveList<string>;
      scores: LiveMap<string, number>;
      person: LiveObject<{ name: string; age: number }>;
    };

    UserMeta: {
      info: {
        name: string;
        age: number;
      };
    };

    RoomEvent:
      | { type: "emoji"; emoji: string }
      | { type: "beep"; times?: number };

    ThreadMetadata: {
      color: "red" | "blue";
      pinned?: boolean;
    };

    RoomInfo: {
      name: string;
      url?: string;
      type: "public" | "private";
    };
  }
}

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

  expectError(
    <LiveblocksProvider
      authEndpoint="/api/auth"
      resolveUsers={async () => [{ foo: "bar" }]}
    />
  );

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

  expectError(
    <LiveblocksProvider
      authEndpoint="/api/auth"
      resolveUsers={async () => [{ foo: "bar" }]}
    />
  );

  <LiveblocksProvider
    authEndpoint="/api/auth"
    resolveUsers={async () => [{ name: "Vincent", age: 42 }]}
  />;

  <LiveblocksProvider authEndpoint="/api/auth" preventUnsavedChanges />;
}

// RoomProvider
{
  const RoomProvider = classic.RoomProvider;

  // Missing mandatory props is an error
  expectError(
    <RoomProvider /* no room id */>
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing initialPresence is an error
    <RoomProvider id="my-room">
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialStorage is an error
    <RoomProvider id="my-room" initialPresence={{ cursor: { x: 0, y: 0 } }}>
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialPresence is an error
    <RoomProvider
      id="my-room"
      initialStorage={{
        animals: new LiveList([]),
        person: new LiveObject(),
        scores: new LiveMap(),
      }}
    >
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialStorage
    <RoomProvider id="my-room" initialPresence={{ cursor: { x: 0, y: 0 } }}>
      <div />
    </RoomProvider>
  );

  expectError(
    <RoomProvider
      id="my-room"
      initialPresence={{ cursor: { x: 0, y: 0 } }}
      initialStorage={{
        // Incorrect storage shape
        foo: new LiveList([]),
        bar: new LiveObject(),
      }}
    >
      <div />
    </RoomProvider>
  );

  <RoomProvider
    id="my-room"
    initialPresence={{ cursor: { x: 0, y: 0 } }}
    initialStorage={{
      animals: new LiveList([]),
      person: new LiveObject(),
      scores: new LiveMap(),
    }}
  >
    <div />
  </RoomProvider>;
}

// RoomProvider (suspense)
{
  const RoomProvider = suspense.RoomProvider;

  // Missing mandatory props is an error
  expectError(
    <RoomProvider /* no room id */>
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing initialPresence is an error
    <RoomProvider id="my-room">
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialStorage is an error
    <RoomProvider id="my-room" initialPresence={{ cursor: { x: 0, y: 0 } }}>
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialPresence is an error
    <RoomProvider
      id="my-room"
      initialStorage={{
        animals: new LiveList([]),
        person: new LiveObject(),
        scores: new LiveMap(),
      }}
    >
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialStorage
    <RoomProvider id="my-room" initialPresence={{ cursor: { x: 0, y: 0 } }}>
      <div />
    </RoomProvider>
  );

  expectError(
    <RoomProvider
      id="my-room"
      initialPresence={{ cursor: { x: 0, y: 0 } }}
      initialStorage={{
        // Incorrect storage shape
        foo: new LiveList([]),
        bar: new LiveObject(),
      }}
    >
      <div />
    </RoomProvider>
  );

  <RoomProvider
    id="my-room"
    initialPresence={{ cursor: { x: 0, y: 0 } }}
    initialStorage={{
      animals: new LiveList([]),
      person: new LiveObject(),
      scores: new LiveMap(),
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
  expectType<number>(room.getPresence().cursor.x);
  expectType<number>(room.getPresence().cursor.y);
  expectError(room.getPresence().nonexisting);
}

// useRoom() (suspense)
{
  const room = suspense.useRoom();
  expectType<number>(room.getPresence().cursor.x);
  expectType<number>(room.getPresence().cursor.y);
  expectError(room.getPresence().nonexisting);
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
  expectType<number | undefined>(me?.presence.cursor.x);
  expectType<number | undefined>(me?.presence.cursor.y);
  expectError(me?.presence.nonexisting);

  expectType<string | undefined>(me?.info.name);
  expectType<number | undefined>(me?.info.age);
  expectError(me?.info.nonexisting);
}

// useSelf() (suspense)
{
  const me = suspense.useSelf();
  expectType<number>(me.presence.cursor.x);
  expectType<number>(me.presence.cursor.y);
  expectError(me.presence.nonexisting);

  expectType<string>(me.info.name);
  expectType<number>(me.info.age);
  expectError(me.info.nonexisting);
}

// useSelf(selector)
{
  const x = classic.useSelf((me) => me.presence.cursor.x);
  expectType<number | null>(x);
}

// useSelf(selector) (suspense)
{
  const x = suspense.useSelf((me) => me.presence.cursor.x);
  expectType<number>(x);
}

// ---------------------------------------------------------

// useOthers()
{
  const others = classic.useOthers();
  expectType<number>(others[13]!.presence.cursor.x);
  expectType<number>(others[42]!.presence.cursor.y);
  expectType<boolean>(others[0]!.canWrite);
}

// useOthers() (suspense)
{
  const others = suspense.useOthers();
  expectType<number>(others[13]!.presence.cursor.x);
  expectType<number>(others[42]!.presence.cursor.y);
  expectType<boolean>(others[0]!.canWrite);
}

// useOthers(selector)
{
  const num = classic.useOthers((others) => others.length);
  expectType<number>(num);

  const xs = classic.useOthers((others) =>
    others.map((o) => o.presence.cursor.x)
  );
  expectType<number[]>(xs);
}

// useOthers(selector) (suspense)
{
  const num = classic.useOthers((others) => others.length);
  expectType<number>(num);

  const xs = classic.useOthers((others) =>
    others.map((o) => o.presence.cursor.x)
  );
  expectType<number[]>(xs);
}

// useOthers(selector, eq)
{
  const xs = classic.useOthers(
    (others) => others.map((o) => o.presence.cursor.x),
    classic.shallow
  );
  expectType<number[]>(xs);
}

// useOthers(selector, eq) (suspense)
{
  const xs = suspense.useOthers(
    (others) => others.map((o) => o.presence.cursor.x),
    suspense.shallow
  );
  expectType<number[]>(xs);
}

// ---------------------------------------------------------

// The useMutation() hook
{
  expectType<(a: number, b: boolean) => "hi">(
    classic.useMutation((mut, _a: number, _b: boolean) => {
      expectType<number>(mut.self.presence.cursor.x);
      expectError(mut.self.presence.nonexisting);
      expectType<string>(mut.self.info.name);
      expectType<number>(mut.self.info.age);
      expectError(mut.self.info.nonexisting);

      expectType<number>(mut.others[0]!.presence.cursor.x);
      expectError(mut.others[0]!.presence.nonexisting);
      expectType<string>(mut.others[0]!.info.name);
      expectType<number>(mut.others[0]!.info.age);
      expectError(mut.others[0]!.info.nonexisting);

      expectType<string | undefined>(mut.storage.get("animals").get(0));
      expectType<number | undefined>(mut.storage.get("scores").get("one"));
      expectType<number>(mut.storage.get("person").get("age"));
      expectError(mut.storage.get("nonexisting"));
      expectType<void>(mut.setMyPresence({ cursor: { x: 0, y: 0 } }));
      expectError(mut.setMyPresence({ nonexisting: 123 }));

      return "hi" as const;
    }, [])
  );
}

// The useMutation() hook (suspense)
{
  expectType<(a: number, b: boolean) => "hi">(
    suspense.useMutation((mut, _a: number, _b: boolean) => {
      expectType<number>(mut.self.presence.cursor.x);
      expectError(mut.self.presence.nonexisting);
      expectType<string>(mut.self.info.name);
      expectType<number>(mut.self.info.age);
      expectError(mut.self.info.nonexisting);

      expectType<number>(mut.others[0]!.presence.cursor.x);
      expectError(mut.others[0]!.presence.nonexisting);
      expectType<string>(mut.others[0]!.info.name);
      expectType<number>(mut.others[0]!.info.age);
      expectError(mut.others[0]!.info.nonexisting);

      expectType<string | undefined>(mut.storage.get("animals").get(0));
      expectType<number | undefined>(mut.storage.get("scores").get("one"));
      expectType<number>(mut.storage.get("person").get("age"));
      expectError(mut.storage.get("nonexisting"));
      expectType<void>(mut.setMyPresence({ cursor: { x: 0, y: 0 } }));
      expectError(mut.setMyPresence({ nonexisting: 123 }));

      return "hi" as const;
    }, [])
  );
}

// ---------------------------------------------------------

// useBroadcastEvent()
{
  const broadcast = classic.useBroadcastEvent();
  broadcast({ type: "emoji", emoji: "😍" });
  broadcast({ type: "beep", times: 3 });
  broadcast({ type: "beep" });
  // broadcast({ type: "leave", userId: "1234" });  // TODO Allow this using union types
  expectError(broadcast({ type: "i-do-not-exist" }));
  expectError(broadcast(new Date()));
}

// useBroadcastEvent() (suspense)
{
  const broadcast = suspense.useBroadcastEvent();
  broadcast({ type: "emoji", emoji: "😍" });
  broadcast({ type: "beep", times: 3 });
  broadcast({ type: "beep" });
  // broadcast({ type: "leave", userId: "1234" });  // TODO Allow this using union types
  expectError(broadcast({ type: "i-do-not-exist" }));
  expectError(broadcast(new Date()));
}

// ---------------------------------------------------------

// The useUser() hook
{
  const { user, error, isLoading } = classic.useUser("user-id");
  expectType<boolean>(isLoading);
  expectType<string>(user!.name);
  expectError(user?.avatar);
  expectType<number>(user!.age);
  expectError(user?.anyOtherProp);
  expectType<Error | undefined>(error);
}

// The useUser() hook (suspense)
{
  const { user, error, isLoading } = suspense.useUser("user-id");
  expectType<false>(isLoading);
  expectType<string>(user.name);
  expectError(user.avatar);
  expectType<number>(user.age);
  expectError(user.anyOtherProp);
  expectType<undefined>(error);
}

// ---------------------------------------------------------

// The useRoomInfo() hook
{
  const { info, error, isLoading } = classic.useRoomInfo("room-id");
  expectType<boolean>(isLoading);
  expectType<string>(info!.name);
  expectType<string | undefined>(info!.url);
  expectType<"public" | "private" | undefined>(info?.type);
  expectError(info?.nonexisting);
  expectType<Error | undefined>(error);
}

// The useRoomInfo() hook (suspense)
{
  const { info, error, isLoading } = suspense.useRoomInfo("room-id");
  expectType<false>(isLoading);
  expectType<string>(info.name);
  expectType<string | undefined>(info.url);
  expectType<"public" | "private">(info?.type);
  expectError(info?.nonexisting);
  expectType<undefined>(error);
}

// ---------------------------------------------------------

// The useCreateThread() hook
{
  const createThread = classic.useCreateThread();
  expectError(createThread({})); // no body = error

  // No metadata = error
  expectError(
    createThread({
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "hi" }] }],
      },
    })
  );

  const thread = createThread({
    body: {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "hi" }] }],
    },
    metadata: { color: "red" },
  });

  expectType<"thread">(thread.type);
  expectType<string>(thread.id);
  expectType<string>(thread.roomId);
  expectType<"comment">(thread.comments[0]!.type);
  expectType<string>(thread.comments[0]!.id);
  expectType<string>(thread.comments[0]!.threadId);

  expectType<"red" | "blue">(thread.metadata.color);
  expectError(thread.metadata.nonexisting);
}

// The useCreateThread() hook (suspense)
{
  const createThread = suspense.useCreateThread();
  expectError(createThread({})); // no body = error

  // No metadata = error
  expectError(
    createThread({
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "hi" }] }],
      },
    })
  );

  const thread = createThread({
    body: {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "hi" }] }],
    },
    metadata: { color: "red" },
  });

  expectType<"thread">(thread.type);
  expectType<string>(thread.id);
  expectType<string>(thread.roomId);
  expectType<"comment">(thread.comments[0]!.type);
  expectType<string>(thread.comments[0]!.id);
  expectType<string>(thread.comments[0]!.threadId);

  expectType<"red" | "blue">(thread.metadata.color);
  expectError(thread.metadata.nonexisting);
}

// ---------------------------------------------------------

// The useEditThreadMetadata() hook
{
  const editMetadata = classic.useEditThreadMetadata();
  expectError(editMetadata({})); // no body = error

  expectError(
    editMetadata({ threadId: "th_xxx", metadata: { nonexisting: null } })
  );
  expectError(
    editMetadata({ threadId: "th_xxx", metadata: { nonexisting: 123 } })
  );

  expectType<void>(editMetadata({ threadId: "th_xxx", metadata: {} }));
  expectType<void>(
    editMetadata({
      threadId: "th_xxx",
      metadata: { color: "red", pinned: null },
    })
  );

  expectError(editMetadata({ threadId: "th_xxx", metadata: { color: null } })); // Color isn't optional, so cannot be wiped
}

// The useEditThreadMetadata() hook (suspense)
{
  const editMetadata = suspense.useEditThreadMetadata();
  expectError(editMetadata({})); // no body = error

  expectError(
    editMetadata({ threadId: "th_xxx", metadata: { nonexisting: null } })
  );
  expectError(
    editMetadata({ threadId: "th_xxx", metadata: { nonexisting: 123 } })
  );

  expectType<void>(editMetadata({ threadId: "th_xxx", metadata: {} }));
  expectType<void>(
    editMetadata({
      threadId: "th_xxx",
      metadata: { color: "red", pinned: null },
    })
  );

  expectError(editMetadata({ threadId: "th_xxx", metadata: { color: null } })); // Color isn't optional, so cannot be wiped
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
  expectType<"red" | "blue">(result.metadata.color);
  expectError(result.metadata.nonexisting);
}

// The useInboxNotificationThread() hook (suspense)
{
  const result = suspense.useInboxNotificationThread("in_xxx");
  expectType<"thread">(result.type);
  expectType<string>(result.roomId);
  expectAssignable<unknown[]>(result.comments);
  expectType<"red" | "blue">(result.metadata.color);
  expectError(result.metadata.nonexisting);
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
