import type { NotificationSettings } from "@liveblocks/core";
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

    GroupInfo: {
      name: string;
      avatar?: string;
      type: "open" | "closed";
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

  expectType<string>(classic.useRoom({ allowOutsideRoom: false }).id);
  expectType<string | undefined>(
    classic.useRoom({ allowOutsideRoom: true })?.id
  );
  expectType<string | undefined>(
    classic.useRoom({ allowOutsideRoom: Math.random() < 0.5 })?.id
  );
}

// useRoom() (suspense)
{
  const room = suspense.useRoom();
  expectType<number>(room.getPresence().cursor.x);
  expectType<number>(room.getPresence().cursor.y);
  expectError(room.getPresence().nonexisting);

  expectType<string>(suspense.useRoom({ allowOutsideRoom: false }).id);
  expectType<string | undefined>(
    suspense.useRoom({ allowOutsideRoom: true })?.id
  );
  expectType<string | undefined>(
    suspense.useRoom({ allowOutsideRoom: Math.random() < 0.5 })?.id
  );
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

// useErrorListener()
{
  classic.useErrorListener((err) => {
    expectType<string>(err.message);
    expectType<string | undefined>(err.stack);
    expectType<-1 | 4001 | 4005 | 4006 | (number & {}) | undefined>(
      err.context.code
    );
    expectAssignable<
      | "AI_CONNECTION_ERROR"
      | "ROOM_CONNECTION_ERROR"
      | "CREATE_THREAD_ERROR"
      | "DELETE_THREAD_ERROR"
      | "EDIT_THREAD_METADATA_ERROR"
      | "MARK_THREAD_AS_RESOLVED_ERROR"
      | "MARK_THREAD_AS_UNRESOLVED_ERROR"
      | "SUBSCRIBE_TO_THREAD_ERROR"
      | "UNSUBSCRIBE_FROM_THREAD_ERROR"
      | "CREATE_COMMENT_ERROR"
      | "EDIT_COMMENT_ERROR"
      | "DELETE_COMMENT_ERROR"
      | "ADD_REACTION_ERROR"
      | "REMOVE_REACTION_ERROR"
      | "MARK_INBOX_NOTIFICATION_AS_READ_ERROR"
      | "DELETE_INBOX_NOTIFICATION_ERROR"
      | "MARK_ALL_INBOX_NOTIFICATIONS_AS_READ_ERROR"
      | "DELETE_ALL_INBOX_NOTIFICATIONS_ERROR"
      | "UPDATE_ROOM_SUBSCRIPTION_SETTINGS_ERROR"
      | "UPDATE_NOTIFICATION_SETTINGS_ERROR"
      | "LARGE_MESSAGE_ERROR"
    >(err.context.type);
    if (err.context.type === "ROOM_CONNECTION_ERROR") {
      expectAssignable<number>(err.context.code);
      expectAssignable<number | undefined>(err.context.code);
    } else if (err.context.type === "CREATE_THREAD_ERROR") {
      expectType<string>(err.context.roomId);
      expectType<string>(err.context.threadId);
      expectType<string>(err.context.commentId);
    } else {
      // Not going to list them all...
    }
  });
}

// useErrorListener() (suspense)
{
  suspense.useErrorListener((err) => {
    expectType<string>(err.message);
    expectType<string | undefined>(err.stack);
    expectType<-1 | 4001 | 4005 | 4006 | (number & {}) | undefined>(
      err.context.code
    );
    expectAssignable<
      | "AI_CONNECTION_ERROR"
      | "ROOM_CONNECTION_ERROR"
      | "CREATE_THREAD_ERROR"
      | "DELETE_THREAD_ERROR"
      | "EDIT_THREAD_METADATA_ERROR"
      | "MARK_THREAD_AS_RESOLVED_ERROR"
      | "MARK_THREAD_AS_UNRESOLVED_ERROR"
      | "SUBSCRIBE_TO_THREAD_ERROR"
      | "UNSUBSCRIBE_FROM_THREAD_ERROR"
      | "CREATE_COMMENT_ERROR"
      | "EDIT_COMMENT_ERROR"
      | "DELETE_COMMENT_ERROR"
      | "ADD_REACTION_ERROR"
      | "REMOVE_REACTION_ERROR"
      | "MARK_INBOX_NOTIFICATION_AS_READ_ERROR"
      | "DELETE_INBOX_NOTIFICATION_ERROR"
      | "MARK_ALL_INBOX_NOTIFICATIONS_AS_READ_ERROR"
      | "DELETE_ALL_INBOX_NOTIFICATIONS_ERROR"
      | "UPDATE_ROOM_SUBSCRIPTION_SETTINGS_ERROR"
      | "UPDATE_NOTIFICATION_SETTINGS_ERROR"
      | "LARGE_MESSAGE_ERROR"
    >(err.context.type);
    if (err.context.type === "ROOM_CONNECTION_ERROR") {
      expectAssignable<number>(err.context.code);
      expectAssignable<number | undefined>(err.context.code);
    } else if (err.context.type === "CREATE_THREAD_ERROR") {
      expectType<string>(err.context.roomId);
      expectType<string>(err.context.threadId);
      expectType<string>(err.context.commentId);
    } else {
      // Not going to list them all...
    }
  });
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

// The useGroupInfo() hook
{
  const { info, error, isLoading } = classic.useGroupInfo("group-id");
  expectType<boolean>(isLoading);
  expectType<string>(info!.name);
  expectType<string | undefined>(info!.avatar);
  expectType<"open" | "closed" | undefined>(info?.type);
  expectError(info?.nonexisting);
  expectType<Error | undefined>(error);
}

// The useGroupInfo() hook (suspense)
{
  const { info, error, isLoading } = suspense.useGroupInfo("group-id");
  expectType<false>(isLoading);
  expectType<string>(info.name);
  expectType<string | undefined>(info.avatar);
  expectType<"open" | "closed">(info?.type);
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

// ---------------------------------------------------------
// the useNotificationSettings() hook
{
  const [{ isLoading, error, settings }, update] =
    classic.useNotificationSettings();
  expectType<boolean>(isLoading);
  expectType<Error | undefined>(error);
  expectType<NotificationSettings | undefined>(settings);
  expectType<void>(update({})); // empty {} because of partial definition
}
// the useNotificationSettings() hook suspense
{
  const [{ isLoading, error, settings }, update] =
    suspense.useNotificationSettings();
  expectType<false>(isLoading);
  expectType<undefined>(error);
  expectType<NotificationSettings>(settings);
  expectType<void>(update({})); // empty {} because of partial definition
}
// ---------------------------------------------------------

// The useAiChatStatus() hook
{
  const status = classic.useAiChatStatus("chat-id");
  expectType<"idle" | "loading" | "generating">(status.status);
  if (status.status === "generating") {
    // The partType might not exist if there's no content yet
    expectType<
      "text" | "reasoning" | "retrieval" | "tool-invocation" | undefined
    >(status.partType);
    if (status.partType === "tool-invocation") {
      expectType<string>(status.toolName);
    } else {
      expectType<undefined>(status.toolName);
    }
  } else {
    expectType<undefined>(status.partType);
    expectType<undefined>(status.toolName);
  }
}

// The useAiChatStatus() hook (suspense)
{
  const status = suspense.useAiChatStatus("chat-id");
  expectType<"idle" | "loading" | "generating">(status.status);
  if (status.status === "generating") {
    // The partType might not exist if there's no content yet
    expectType<
      "text" | "reasoning" | "retrieval" | "tool-invocation" | undefined
    >(status.partType);
    if (status.partType === "tool-invocation") {
      expectType<string>(status.toolName);
    } else {
      expectType<undefined>(status.toolName);
    }
  } else {
    expectType<undefined>(status.partType);
    expectType<undefined>(status.toolName);
  }
}

// The useAiChatStatus() hook with optional branchId
{
  const status = classic.useAiChatStatus("chat-id", "ms_branch" as any);
  if (status.status === "generating") {
    // The partType might not exist if there's no content yet
    expectType<
      "text" | "reasoning" | "retrieval" | "tool-invocation" | undefined
    >(status.partType);
    if (status.partType === "tool-invocation") {
      expectType<string>(status.toolName);
    } else {
      expectType<undefined>(status.toolName);
    }
  } else {
    expectType<undefined>(status.partType);
    expectType<undefined>(status.toolName);
  }
}

// The useAiChatStatus() hook with optional branchId (suspense)
{
  const status = suspense.useAiChatStatus("chat-id", "ms_branch" as any);
  if (status.status === "generating") {
    // The partType might not exist if there's no content yet
    expectType<
      "text" | "reasoning" | "retrieval" | "tool-invocation" | undefined
    >(status.partType);
    if (status.partType === "tool-invocation") {
      expectType<string>(status.toolName);
    } else {
      expectType<undefined>(status.toolName);
    }
  } else {
    expectType<undefined>(status.partType);
    expectType<undefined>(status.toolName);
  }
}

// ---------------------------------------------------------
