import type { CommentBody, CommentData, ThreadData } from "@liveblocks/core";
import type {
  CommentRenderMentionProps,
  ComposerBodyProps,
  ComposerRenderMentionProps,
  ComposerRenderMentionSuggestionsProps,
} from "@liveblocks/react-comments";
import {
  Comment as LiveblocksComment,
  Composer as LiveblocksComposer,
  Time,
} from "@liveblocks/react-comments";
import * as Dialog from "@radix-ui/react-dialog";
import clsx from "clsx";
import { useRouter } from "next/router";
import type {
  ChangeEvent,
  ComponentPropsWithRef,
  KeyboardEvent,
  ReactNode,
} from "react";
import React, {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useCookies } from "react-cookie";

import {
  type ThreadMetadata,
  resolveMentionSuggestions,
} from "../../liveblocks.config";
import {
  createComment,
  createThread,
  deleteComment,
  editComment,
  useThreads,
  useUser,
} from "../../liveblocks.suspense.config";
import { Button } from "../components/Button";
import { useHydrated } from "../utils/use-hydrated";

const USER_ID = "user";
const ROOM_ID = "comments-react";

type FilterType = "all" | "open" | "resolved" | "participating";

type SelectOption<T extends string = string> = {
  label: ReactNode;
  value: T;
};

interface SelectProps extends ComponentPropsWithRef<"select"> {
  options: SelectOption[];
}

interface UserProps extends ComponentPropsWithRef<"span"> {
  userId: string;
}

interface AvatarProps extends ComponentPropsWithRef<"div"> {
  userId: string;
}

type ComposerProps = ComponentPropsWithRef<typeof LiveblocksComposer.Form> & {
  placeholder?: string;
  label: ReactNode;
  bodyProps?: ComposerBodyProps;
  body?: CommentBody;
};

type ComposerDialogProps = {
  body?: CommentBody;
  label?: string;
  children: ReactNode;
  onCommentSubmit: (body: CommentBody) => void;
};

interface CommentProps extends ComponentPropsWithRef<"div"> {
  comment: CommentData;
  threadId: string;
}

interface ThreadProps extends ComponentPropsWithRef<"div"> {
  thread: ThreadData<ThreadMetadata>;
}

interface ThreadsProps {
  filter: FilterType;
}

type AppContext = {
  userId: string;
  roomId: string;
};

const AppContext = createContext<AppContext | null>(null);

function useAppContext() {
  const appContext = useContext(AppContext);

  if (!appContext) {
    throw new Error("AppProvider is missing from the React tree.");
  }

  return appContext;
}

function Select({ options, ...props }: SelectProps) {
  return (
    <select {...props}>
      {options.map(({ label, value }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

function UserSkeleton({ className, ...props }: ComponentPropsWithRef<"span">) {
  return (
    <span
      className={clsx(className, "inline-flex h-[1lh] items-center")}
      {...props}
    >
      <span className="inline-block h-[1em] w-full animate-pulse rounded bg-gray-100" />
    </span>
  );
}

function User({ userId, className, ...props }: UserProps) {
  const { user } = useUser(userId);

  if (!user) {
    return (
      <span className={clsx(className, "text-red-500")} {...props}>
        Error
      </span>
    );
  } else {
    return (
      <span className={className} {...props}>
        {user.info.name}
      </span>
    );
  }
}

function AvatarSkeleton({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      className={clsx(
        className,
        "relative aspect-square animate-pulse overflow-hidden rounded-full bg-gray-100"
      )}
      {...props}
    />
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .reduce((initials, name, index, array) => {
      if (index === 0 || index === array.length - 1) {
        initials += name.charAt(0).toLocaleUpperCase();
      }

      return initials;
    }, "");
}

function Avatar({ userId, className, ...props }: AvatarProps) {
  const { user } = useUser(userId);
  const initials = useMemo(() => {
    return user ? getInitials(user.info.name) : null;
  }, [user]);

  return (
    <div
      className={clsx(
        className,
        "@container relative flex aspect-square items-center justify-center overflow-hidden rounded-full bg-gray-100",
        user === null && "animate-pulse"
      )}
      {...props}
    >
      {user === null ? null : !user ? (
        <span className="text-[length:35cqw] text-gray-400">?</span>
      ) : (
        <>
          <img
            src={user.info.avatar}
            alt={user.info.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="text-[length:35cqw] text-gray-400">{initials}</span>
        </>
      )}
    </div>
  );
}

function ComposerMention({ userId }: ComposerRenderMentionProps) {
  const { user } = useUser(userId);

  return (
    <LiveblocksComposer.Mention
      className={clsx(
        "inline-block rounded bg-gray-100 px-1 data-[selected]:bg-blue-100",
        user === null && "animate-pulse"
      )}
    >
      @{user?.info.name ?? userId}
    </LiveblocksComposer.Mention>
  );
}

function ComposerMentionSuggestions({
  userIds,
}: ComposerRenderMentionSuggestionsProps) {
  if (!userIds) {
    return null;
  }

  return (
    <LiveblocksComposer.Suggestions className="z-[9999] select-none overflow-y-auto rounded-lg bg-white p-1 shadow-xl">
      {userIds.length > 0 ? (
        <LiveblocksComposer.SuggestionsList>
          {userIds.map((userId) => (
            <LiveblocksComposer.SuggestionsListItem
              key={userId}
              value={userId}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 data-[selected]:bg-blue-100"
            >
              <Suspense
                fallback={<AvatarSkeleton className="ml-0.5 w-4 flex-none" />}
              >
                <Avatar userId={userId} className="ml-0.5 w-4 flex-none" />
              </Suspense>
              <Suspense fallback={<UserSkeleton className="w-20" />}>
                <User userId={userId} className="mr-0.5 font-medium" />
              </Suspense>
            </LiveblocksComposer.SuggestionsListItem>
          ))}
        </LiveblocksComposer.SuggestionsList>
      ) : (
        <div className="text-medium px-4 py-1 text-center text-gray-400">
          No users found.
        </div>
      )}
    </LiveblocksComposer.Suggestions>
  );
}

const simpleDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "short",
});

function Composer({
  placeholder,
  body,
  label = "Comment",
  onCommentSubmit,
  bodyProps,
  className,
  children,
  ...props
}: ComposerProps) {
  return (
    <LiveblocksComposer.Form
      className={clsx(
        className,
        "relative flex flex-col rounded-[inherit] bg-white"
      )}
      onCommentSubmit={onCommentSubmit}
      {...props}
    >
      <LiveblocksComposer.Body
        initialValue={body}
        className="max-h-[10lh] flex-1 overflow-y-auto p-4 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
        placeholder={placeholder}
        resolveMentionSuggestions={resolveMentionSuggestions}
        renderMentionSuggestions={ComposerMentionSuggestions}
        renderMention={ComposerMention}
        {...bodyProps}
      />
      <div className="m-4 mt-0 flex items-center justify-end gap-2">
        <LiveblocksComposer.Submit asChild>
          <Button>{label}</Button>
        </LiveblocksComposer.Submit>
      </div>
      {children}
    </LiveblocksComposer.Form>
  );
}

function ComposerDialog({
  children,
  onCommentSubmit,
  body,
  label,
}: ComposerDialogProps) {
  const [isOpen, setOpen] = useState(false);

  const handleCommentSubmit = useCallback(
    ({ body }: { body: CommentBody }) => {
      setOpen(false);
      onCommentSubmit(body);
    },
    [onCommentSubmit]
  );

  const handleOnKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    },
    []
  );

  return (
    <Dialog.Root onOpenChange={setOpen} open={isOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 cursor-pointer bg-gray-500/50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] w-[calc(100%-2*theme(spacing.4))] max-w-xl translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none">
          <Composer
            onCommentSubmit={handleCommentSubmit}
            bodyProps={{ onKeyDown: handleOnKeyDown, autoFocus: true }}
            body={body}
            label={label}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CommentMention({ userId }: CommentRenderMentionProps) {
  const { user } = useUser(userId);

  return (
    <LiveblocksComment.Mention
      className={clsx("font-semibold", user === null && "animate-pulse")}
    >
      @{user?.info.name ?? userId}
    </LiveblocksComment.Mention>
  );
}

// NOTE: Having to pass threadId so that deleteComment/editComment/etc can be called
function Comment({ comment, threadId, className, ...props }: CommentProps) {
  const { roomId, userId } = useAppContext();

  return (
    <div className={clsx(className, "p-4")} {...props}>
      <div className="mb-3 flex items-center gap-3">
        <Suspense fallback={<AvatarSkeleton className="w-10" />}>
          <Avatar userId={comment.userId} className="w-10" />
        </Suspense>
        <div className="flex flex-col justify-center">
          <Suspense fallback={<UserSkeleton className="w-20" />}>
            <User className="font-medium" userId={comment.userId} />
          </Suspense>
          <span className="text-sm text-gray-400">@{userId}</span>
        </div>
        <div className="ml-auto flex flex-col items-end justify-center">
          <Time
            date={comment.createdAt}
            className="font-medium first-letter:capitalize"
          />
          <span className="text-sm text-gray-400 first-letter:capitalize">
            {comment.deletedAt ? (
              <>
                Deleted <Time date={comment.deletedAt} />
              </>
            ) : comment.editedAt ? (
              <>
                Edited <Time date={comment.editedAt} />
              </>
            ) : (
              <Time date={comment.createdAt}>
                {(date) => simpleDateFormatter.format(date)}
              </Time>
            )}
          </span>
        </div>
      </div>
      {comment.body ? (
        <LiveblocksComment.Body
          body={comment.body}
          renderMention={CommentMention}
        />
      ) : (
        <p className="text-gray-400">This comment was deleted.</p>
      )}
      {comment.userId === userId && comment.body && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <ComposerDialog
            body={comment.body}
            onCommentSubmit={(body) =>
              editComment(roomId, { threadId, commentId: comment.id, body })
            }
          >
            <Button variant="secondary">Edit</Button>
          </ComposerDialog>
          <Button
            variant="secondary"
            onClick={() =>
              deleteComment(roomId, { commentId: comment.id, threadId })
            }
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

function Thread({ thread, className, ...props }: ThreadProps) {
  return (
    <div
      className={clsx(className, "flex flex-col rounded-lg bg-white shadow-lg")}
      {...props}
    >
      {thread.comments.map((comment) => (
        <Comment
          key={comment.id}
          comment={comment}
          threadId={thread.id}
          className="border-b border-gray-100 last:border-none"
        />
      ))}
      <div className="m-4 flex items-center justify-end gap-2">
        <ComposerDialog
          label="Reply"
          onCommentSubmit={(body) =>
            createComment(thread.roomId, { body, threadId: thread.id })
          }
        >
          <Button variant="secondary">Reply in thread</Button>
        </ComposerDialog>
      </div>
    </div>
  );
}

function ThreadSkeleton({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      className={clsx(
        className,
        "flex animate-pulse rounded-lg bg-white shadow-lg"
      )}
      {...props}
    />
  );
}

function filterThreads<T extends ThreadData<ThreadMetadata>>(
  threads: T[],
  filter: FilterType,
  userId: string
) {
  return threads.filter((thread) => {
    switch (filter) {
      case "all":
        return true;
      case "open":
        return !thread.metadata.resolved;
      case "resolved":
        return thread.metadata.resolved;
      case "participating":
        return thread.comments.some((comment) => comment.userId === userId);
      default:
        return true;
    }
  });
}

function Threads({ filter }: ThreadsProps) {
  const { roomId, userId } = useAppContext();
  const threads = useThreads(roomId);
  const filteredThreads = useMemo(
    () => filterThreads(threads, filter, userId),
    [filter, threads, userId]
  );

  if (threads.length === 0) {
    return (
      <div className="my-4 text-center text-sm font-medium text-gray-400">
        There aren’t any threads yet.
      </div>
    );
  }

  if (filteredThreads.length === 0) {
    return (
      <div className="my-4 text-center text-sm font-medium text-gray-400">
        There aren’t any threads matching this filter.
      </div>
    );
  }

  return (
    <>
      {filteredThreads.map((thread) => (
        <Thread key={thread.id} thread={thread} />
      ))}
    </>
  );
}

const filterOptions: SelectOption<FilterType>[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "participating", label: "Participating" },
];

function Example() {
  const { roomId } = useAppContext();
  const [filter, setFilter] = useState<FilterType>("all");

  const handleFilterChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setFilter(event.target.value as FilterType);
    },
    []
  );

  return (
    <main className="mt-12">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4">
        <Select
          className="mb-6 ml-auto h-9 w-min rounded-md bg-white px-2 shadow-lg outline-none"
          options={filterOptions}
          value={filter}
          onChange={handleFilterChange}
        />
        <Suspense
          fallback={
            <>
              <ThreadSkeleton className="h-64" />
              <ThreadSkeleton className="animation-delay-500 h-44" />
              <ThreadSkeleton className="animation-delay-1000 h-44" />
            </>
          }
        >
          <Threads filter={filter} />
        </Suspense>
      </div>
      <div className="pointer-events-none sticky bottom-0 left-0 right-0 w-full bg-gradient-to-t from-gray-50 via-gray-50 to-transparent">
        <div className="mx-auto flex w-full max-w-lg px-4 py-12">
          <div className="pointer-events-auto w-full rounded-lg bg-white shadow-lg">
            <Composer
              label="Create thread"
              onCommentSubmit={({ body }) => {
                createThread(roomId, { body, metadata: { resolved: false } });
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  const userId = useOverrideUserId(USER_ID);
  const roomId = useOverrideRoomId(ROOM_ID);
  const isHydrated = useHydrated();

  if (!roomId || !userId || !isHydrated) {
    return null;
  }

  return (
    <AppContext.Provider value={{ roomId, userId }}>
      <Example />
    </AppContext.Provider>
  );
}

function useOverrideRoomId(roomId: string) {
  const { query, isReady } = useRouter();
  const overrideRoomId = useMemo(() => {
    return isReady
      ? query?.roomId
        ? `${roomId}-${query.roomId}`
        : roomId
      : undefined;
  }, [isReady, query.roomId, roomId]);

  return overrideRoomId;
}

function useOverrideUserId(userId: string) {
  const [, setCookie] = useCookies(["userId"]);
  const { query, isReady } = useRouter();
  const overrideUserId = useMemo(() => {
    return isReady
      ? query?.userId
        ? `${userId}-${query.userId}`
        : userId
      : undefined;
  }, [isReady, query, userId]);

  useEffect(() => {
    if (overrideUserId) {
      setCookie("userId", overrideUserId, {
        path: "/",
        maxAge: 3600,
        sameSite: true,
      });
    }
  }, [overrideUserId, setCookie]);

  return overrideUserId;
}
