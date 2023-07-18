import type { CommentBody, CommentData, ThreadData } from "@liveblocks/core";
import type {
  CommentRenderMentionProps,
  ComposerBodyProps,
  ComposerRenderMentionProps,
  ComposerRenderMentionSuggestionsProps,
  ComposerSubmitComment,
} from "@liveblocks/react-comments";
import {
  Comment as LiveblocksComment,
  Composer as LiveblocksComposer,
  Time,
} from "@liveblocks/react-comments";
import * as RadixDialog from "@radix-ui/react-dialog";
import * as RadixSelect from "@radix-ui/react-select";
import clsx from "clsx";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Edit3,
  MessageCircle,
  Reply,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/router";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  Dispatch,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  SetStateAction,
} from "react";
import React, {
  createContext,
  forwardRef,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCookies } from "react-cookie";

import type { ThreadMetadata } from "../../liveblocks.config";
import {
  createComment,
  createThread,
  deleteComment,
  editComment,
  editThread,
  resolveMentionSuggestions,
  RoomProvider,
  useOthers,
  useThreads,
  useUpdateMyPresence,
  useUser,
} from "../../liveblocks.config";
import type { SelectOption } from "../components/Select";
import { Select } from "../components/Select";
import { Spinner } from "../components/Spinner";
import { useHydrated } from "../utils/use-hydrated";

const USER_ID = "user";
const ROOM_ID = "comments-react";

const TYPING_INDICATOR_LIMIT = 3;

type FilterType = "all" | "open" | "resolved" | "participating";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

interface UserProps extends ComponentPropsWithoutRef<"span"> {
  userId: string;
}

interface AvatarProps extends ComponentPropsWithoutRef<"div"> {
  userId: string;
}

type ComposerProps = ComponentPropsWithoutRef<
  typeof LiveblocksComposer.Form
> & {
  placeholder?: string;
  label: ReactNode;
  onBodyKeyDown?: ComposerBodyProps["onKeyDown"];
  threadId?: string;
  body?: CommentBody;
};

interface TypingIndicatorProps extends ComponentProps<"span"> {
  userIds: string[];
}

interface CommentProps extends ComponentProps<"div"> {
  comment: CommentData;
  threadId: string;
  disabled?: boolean;
}

interface ThreadProps extends ComponentPropsWithRef<"div"> {
  thread: ThreadData<ThreadMetadata>;
}

interface ThreadsProps extends ComponentProps<"div"> {
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

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", isLoading, children, className, ...props },
    forwardedRef
  ) => {
    return (
      <button
        className={clsx(
          className,
          "relative flex h-8 cursor-pointer items-center rounded-md px-3 text-sm font-medium outline-none transition disabled:cursor-not-allowed disabled:opacity-50",
          {
            ["bg-blue-500 text-white enabled:hover:bg-blue-400 enabled:focus-visible:bg-blue-400"]:
              variant === "primary",
            ["bg-gray-100 enabled:hover:bg-gray-200 enabled:focus-visible:bg-gray-200"]:
              variant === "secondary",
          }
        )}
        ref={forwardedRef}
        {...props}
      >
        {isLoading && (
          <Spinner className="absolute left-1/2 h-8 w-8 -translate-x-1/2" />
        )}
        <span className={clsx("contents", isLoading && "text-transparent")}>
          {children}
        </span>
      </button>
    );
  }
);

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
  const { user, isLoading } = useUser(userId);

  if (isLoading) {
    return <UserSkeleton className="w-20" />;
  } else if (!user) {
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

  if (user === null) {
    return <AvatarSkeleton className={className} {...props} />;
  }

  return (
    <div
      className={clsx(
        className,
        "@container relative flex aspect-square items-center justify-center overflow-hidden rounded-full bg-gray-100"
      )}
      {...props}
    >
      {!user ? (
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
              <Avatar userId={userId} className="ml-0.5 w-4 flex-none" />
              <User userId={userId} className="mr-0.5 font-medium" />
            </LiveblocksComposer.SuggestionsListItem>
          ))}
        </LiveblocksComposer.SuggestionsList>
      ) : (
        <div className="text-medium px-4 py-1 text-center text-sm text-gray-400">
          No users found.
        </div>
      )}
    </LiveblocksComposer.Suggestions>
  );
}

const Composer = forwardRef<HTMLDivElement, ComposerProps>(
  (
    {
      placeholder,
      label,
      onCommentSubmit,
      onBodyKeyDown,
      autoFocus,
      className,
      children,
      threadId,
      body,
      ...props
    },
    forwardedRef
  ) => {
    const updateMyPresence = useUpdateMyPresence();
    const handleCommentSubmit = useCallback(
      ({ body }: ComposerSubmitComment, event: FormEvent<HTMLFormElement>) => {
        updateMyPresence({
          isTyping: false,
        });

        onCommentSubmit?.({ body }, event);
      },
      [onCommentSubmit, updateMyPresence]
    );

    const handleFocus = useCallback(() => {
      updateMyPresence({
        isTyping: threadId ?? true,
      });
    }, [threadId, updateMyPresence]);

    const handleBlur = useCallback(() => {
      updateMyPresence({
        isTyping: false,
      });
    }, [updateMyPresence]);

    return (
      <LiveblocksComposer.Form
        className={clsx(
          className,
          "relative flex flex-col rounded-[inherit] bg-white"
        )}
        onCommentSubmit={handleCommentSubmit}
        {...props}
      >
        <LiveblocksComposer.Body
          initialValue={body}
          className="max-h-[10lh] flex-1 overflow-y-auto p-4 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
          placeholder={placeholder}
          resolveMentionSuggestions={resolveMentionSuggestions}
          renderMentionSuggestions={ComposerMentionSuggestions}
          renderMention={ComposerMention}
          onKeyDown={onBodyKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          ref={forwardedRef}
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
);

function ComposerDialog({
  children,
  onCommentSubmit,
  ...props
}: ComposerProps) {
  const [isOpen, setOpen] = useState(false);
  const updateMyPresence = useUpdateMyPresence();
  const composerRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        updateMyPresence({ isTyping: false });
      }

      setOpen(isOpen);
    },
    [updateMyPresence]
  );

  // NOTE: autoFocus doesn't seem to work with Radix' Dialog
  const handleOpenAutoFocus = useCallback(() => {
    composerRef.current?.focus();
  }, []);

  const handleCommentSubmit = useCallback(
    ({ body }: { body: CommentBody }, e: FormEvent<HTMLFormElement>) => {
      onCommentSubmit?.({ body }, e);
      setOpen(false);
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
    <RadixDialog.Root onOpenChange={handleOpenChange} open={isOpen}>
      <RadixDialog.Trigger asChild>{children}</RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 cursor-pointer bg-gray-500/50" />
        <RadixDialog.Content
          className="fixed left-[50%] top-[50%] z-50 flex min-h-[8lh] w-[calc(100%-2*theme(spacing.4))] max-w-xl translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none"
          onOpenAutoFocus={handleOpenAutoFocus}
        >
          <Composer
            className="flex-1"
            onCommentSubmit={handleCommentSubmit}
            onBodyKeyDown={handleOnKeyDown}
            ref={composerRef}
            {...props}
          />
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function TypingIndicator({ userIds, ...props }: TypingIndicatorProps) {
  const limitedUserIds = useMemo(
    () => userIds.slice(0, TYPING_INDICATOR_LIMIT),
    [userIds]
  );
  const truncatedUserIds = useMemo(
    () => userIds.slice(TYPING_INDICATOR_LIMIT),
    [userIds]
  );

  if (userIds.length === 0) {
    return null;
  }

  return (
    <span {...props}>
      {limitedUserIds.map((userId, index) => (
        <Fragment key={index}>
          {index > 0
            ? index === limitedUserIds.length - 1 &&
              truncatedUserIds.length === 0
              ? `${limitedUserIds.length > 2 ? "," : ""} and `
              : ", "
            : ""}
          <User userId={userId} />
        </Fragment>
      ))}{" "}
      {truncatedUserIds.length > 0
        ? `and ${truncatedUserIds.length} other${
            truncatedUserIds.length ? "s" : ""
          }`
        : ""}
      {limitedUserIds.length && truncatedUserIds.length > 0 ? " are" : " is"}{" "}
      typing…
    </span>
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
function Comment({
  comment,
  threadId,
  disabled,
  className,
  ...props
}: CommentProps) {
  const { roomId, userId } = useAppContext();

  return (
    <div className={clsx(className, "p-4")} {...props}>
      <div className="mb-3 flex items-center gap-3">
        <Avatar className="w-10" userId={comment.userId} />
        <div className="flex flex-col justify-center">
          <User className="font-medium" userId={comment.userId} />
          <span className="text-sm text-gray-400">@{comment.userId}</span>
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
              <span>…</span>
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
            label={
              <>
                <Edit3 className="-ml-0.5 mr-2 h-4 w-4" />
                Edit comment
              </>
            }
            threadId={threadId}
            body={comment.body}
            onCommentSubmit={({ body }) =>
              editComment(roomId, { threadId, commentId: comment.id, body })
            }
          >
            <Button variant="secondary" disabled={disabled}>
              <Edit3 className="-ml-0.5 mr-2 h-4 w-4" />
              Edit
            </Button>
          </ComposerDialog>
          <Button
            variant="secondary"
            onClick={() =>
              deleteComment(roomId, { commentId: comment.id, threadId })
            }
            disabled={disabled}
          >
            <Trash2 className="-ml-0.5 mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

function Thread({ thread, className, ...props }: ThreadProps) {
  const { roomId } = useAppContext();
  const others = useOthers((others) =>
    others.filter((other) => other.presence.isTyping === thread.id)
  );
  const othersIds = useMemo(() => others.map((other) => other.id), [others]);
  const handleMarkAsResolved = useCallback(() => {
    editThread(roomId, { threadId: thread.id, metadata: { resolved: true } });
  }, [roomId, thread]);
  const handleMarkAsOpen = useCallback(() => {
    editThread(roomId, { threadId: thread.id, metadata: { resolved: false } });
  }, [roomId, thread]);

  return (
    <div
      className={clsx(className, "rounded-lg bg-white shadow-lg")}
      {...props}
    >
      <div
        className={clsx(
          "flex flex-col transition",
          thread.metadata.resolved && "grayscale"
        )}
      >
        {thread.comments.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            threadId={thread.id}
            className="border-b border-gray-100 last:border-none"
          />
        ))}
        <div className="m-4 flex items-center gap-4">
          <div>
            <TypingIndicator
              userIds={othersIds}
              className="text-sm text-gray-400"
            />
          </div>
          <div className="ml-auto flex flex-none items-center gap-2">
            <Button
              variant="secondary"
              onClick={
                thread.metadata.resolved
                  ? handleMarkAsOpen
                  : handleMarkAsResolved
              }
            >
              {thread.metadata.resolved ? (
                <>
                  <Circle className="-ml-0.5 mr-2 h-4 w-4" />
                  <span>Open</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="-ml-0.5 mr-2 h-4 w-4" />
                  <span>Resolve</span>
                </>
              )}
            </Button>
            <ComposerDialog
              label={
                <>
                  <Reply className="-ml-0.5 mr-2 h-4 w-4" />
                  Reply
                </>
              }
              threadId={thread.id}
              onCommentSubmit={({ body }) => {
                createComment(roomId, { body, threadId: thread.id });
              }}
            >
              <Button variant="secondary">
                <Reply className="-ml-0.5 mr-2 h-4 w-4" />
                Reply in thread
              </Button>
            </ComposerDialog>
          </div>
        </div>
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

function Threads({ filter, className, ...props }: ThreadsProps) {
  const { roomId, userId } = useAppContext();
  const { threads } = useThreads(roomId);

  const filteredThreads = useMemo(
    () => (threads === undefined ? [] : filterThreads(threads, filter, userId)),
    [filter, threads, userId]
  );

  if (threads === undefined) {
    return (
      <div className={clsx(className, "flex w-full flex-col gap-8")} {...props}>
        <ThreadSkeleton className="h-64" />
        <ThreadSkeleton className="animation-delay-500 h-44" />
        <ThreadSkeleton className="animation-delay-1000 h-44" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div
        className={clsx(
          className,
          "my-4 text-center text-sm font-medium text-gray-400"
        )}
        {...props}
      >
        There aren’t any threads yet.
      </div>
    );
  }

  if (filteredThreads.length === 0) {
    return (
      <div
        className={clsx(
          className,
          "my-4 text-center text-sm font-medium text-gray-400"
        )}
        {...props}
      >
        There aren’t any threads matching this filter.
      </div>
    );
  }

  return (
    <div className={clsx(className, "flex w-full flex-col gap-8")} {...props}>
      {filteredThreads.map((thread) => (
        <Thread key={thread.id} thread={thread} />
      ))}
    </div>
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
  const others = useOthers((others) =>
    others.filter((other) => other.presence.isTyping === true)
  );
  const othersIds = useMemo(() => others.map((other) => other.id), [others]);

  return (
    <main className="mt-14">
      <div className="mx-auto flex w-full max-w-lg flex-col px-4">
        <div className="mb-14 flex items-center">
          <div>
            <TypingIndicator
              className="text-sm text-gray-400"
              userIds={othersIds}
            />
          </div>
          <Select
            options={filterOptions}
            value={filter}
            onValueChange={setFilter as Dispatch<SetStateAction<string>>}
          >
            <button className="ml-auto flex h-8 min-w-[theme(spacing.20)] flex-none items-center gap-2 rounded-md bg-white px-3 text-sm font-medium shadow-lg outline-none">
              <RadixSelect.Value />
              <RadixSelect.Icon className="ml-auto">
                <ChevronDown className="h-4 w-4" />
              </RadixSelect.Icon>
            </button>
          </Select>
        </div>
        <Threads filter={filter} />
      </div>
      <div className="pointer-events-none sticky bottom-0 left-0 right-0 z-20 w-full before:absolute before:inset-x-0 before:top-0 before:h-28 before:bg-gradient-to-t before:from-gray-50 before:via-gray-50 before:to-transparent after:absolute after:inset-x-0 after:bottom-0 after:top-28 after:bg-gray-50">
        <div className="relative z-20 mx-auto flex w-full max-w-lg px-4 py-14">
          <div className="pointer-events-auto w-full rounded-lg bg-white shadow-lg">
            <Composer
              onCommentSubmit={({ body }) => {
                createThread(roomId, { body, metadata: { resolved: false } });
              }}
              label={
                <>
                  <MessageCircle className="-ml-0.5 mr-2 h-4 w-4" />
                  Create thread
                </>
              }
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
      <RoomProvider id={roomId} initialPresence={{ isTyping: false }}>
        <Example />
      </RoomProvider>
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
