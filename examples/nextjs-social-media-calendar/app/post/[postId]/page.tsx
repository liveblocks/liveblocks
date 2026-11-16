"use client";

import { LiveMap } from "@liveblocks/client";
import {
  ClientSideSuspense,
  RoomProvider,
  useMutation,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { BrandAvatar, PROJECT_NAME } from "@/components/brand";
import { LinkCard } from "@/components/composer/link-card";
import { PostActions } from "@/components/composer/post-actions";
import { PostEditor } from "@/components/composer/post-editor";
import {
  AddMediaButton,
  PostMedia,
  usePostMedia,
} from "@/components/composer/post-media";
import { findFirstUrl } from "@/components/composer/urls";
import { EditingAvatars } from "@/components/editing-avatars";
import { HelpButton } from "@/components/help-button";
import { Loading } from "@/components/loading";
import { Button } from "@/components/ui/button";
import { DateInput, TimeInput } from "@/components/ui/date-time-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIcon,
  SelectTrigger,
  SelectValue,
  SelectValueIcon,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useExampleHref, useExampleRoomId } from "@/hooks/use-example-room-id";
import {
  isPlatform,
  PLATFORM_INFO,
  PLATFORMS,
  PlatformBadge,
} from "@/lib/platforms";
import {
  createInitialStorage,
  POST_STATUSES,
  STATUS_INFO,
  type PostData,
  type PostFields,
  type PostStatus,
} from "@/lib/posts";
import { cn } from "@/lib/utils";

type PostUpdate = Partial<Omit<PostFields, "id" | "createdAt">>;

/** Date and time read as part of the post's byline until focused. */
const META_INPUT_CLASS =
  "h-6 border-transparent bg-transparent px-0.5 text-[15px] text-neutral-500 shadow-none hover:text-neutral-900 focus-within:bg-neutral-100";

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const projectRoomId = useExampleRoomId();

  // The project room holds every post's metadata and presence; the post's own
  // room (entered further down) holds its body as LiveText.
  return (
    <RoomProvider
      id={projectRoomId}
      initialPresence={{ editingPostId: postId }}
      initialStorage={createInitialStorage}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <PostShell postId={postId} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function isPostStatus(value: string): value is PostStatus {
  return POST_STATUSES.some((status) => status === value);
}

/**
 * Rendered inside the project room: reads and updates the post's metadata
 * and media, and renders the composer. Only the text body enters the post's
 * own room.
 */
function PostShell({ postId }: { postId: string }) {
  const router = useRouter();
  const calendarHref = useExampleHref("/");
  const updateMyPresence = useUpdateMyPresence();

  const post = useStorage((root) => root.posts[postId] ?? null);

  // Tell everyone in the project which post we're looking at, so the
  // calendar can show our avatar on its card.
  useEffect(() => {
    updateMyPresence({ editingPostId: postId });
  }, [postId, updateMyPresence]);

  const updatePost = useMutation(
    ({ storage }, update: PostUpdate) => {
      const livePost = storage.get("posts").get(postId);
      if (!livePost) {
        return;
      }
      livePost.update(update);
    },
    [postId]
  );

  const deletePost = useMutation(
    ({ storage }) => {
      storage.get("posts").delete(postId);
    },
    [postId]
  );

  if (!post) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-neutral-900">
          This post no longer exists.
        </p>
        <p className="text-sm text-neutral-500">
          It may have been deleted by someone else in the project.
        </p>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={calendarHref} />}
        >
          <ArrowLeftIcon />
          Back to calendar
        </Button>
      </div>
    );
  }

  return (
    <PostComposer
      post={post}
      calendarHref={calendarHref}
      onUpdate={updatePost}
      onDelete={() => {
        deletePost();
        router.push(calendarHref);
      }}
    />
  );
}

/**
 * The body of the post, in the post's own room: a Tiptap document backed by
 * LiveText under `_tiptap_docs`. The `posts` map lives in the project room.
 */
function PostBody(props: ComponentProps<typeof PostEditor>) {
  const postRoomId = useExampleRoomId(props.postId);
  return (
    <RoomProvider
      id={postRoomId}
      initialPresence={{ editingPostId: props.postId }}
      initialStorage={{ posts: new LiveMap() }}
    >
      <ClientSideSuspense
        fallback={
          <div className="composer-editor pt-1">
            <div className="h-6 w-2/3 animate-pulse rounded bg-neutral-100" />
          </div>
        }
      >
        <PostEditor {...props} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

/**
 * A header with who's editing this post, and the post itself laid out the way
 * it will appear once published: the LiveText-backed body, its LiveFile media
 * under it, and a preview card for the first link.
 */
function PostComposer({
  post,
  calendarHref,
  onUpdate,
  onDelete,
}: {
  post: PostData;
  calendarHref: string;
  onUpdate: (update: PostUpdate) => void;
  onDelete: () => void;
}) {
  const platform = PLATFORM_INFO[post.platform];
  const media = usePostMedia(post.id, post.media);
  const [text, setText] = useState("");
  const url = findFirstUrl(text);
  const length = text.length;
  const overLimit = length > platform.maxLength;

  return (
    <div className="flex h-dvh w-full flex-col gap-2.5 overflow-hidden bg-neutral-50 p-2.5">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-white px-3 py-2 shadow ring-1 ring-neutral-950/5">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-1"
          render={<Link href={calendarHref} />}
        >
          <ArrowLeftIcon />
          Calendar
        </Button>

        <Separator orientation="vertical" />

        <div className="flex items-center gap-2.5">
          <PlatformBadge platform={post.platform} size={28} />
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-neutral-900">
              {platform.label} post
            </h1>
            <p className="text-[11px] text-neutral-500">{platform.handle}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <EditingAvatars postId={post.id} size={28} max={5} />

          <Select
            value={post.status}
            onValueChange={(value) => {
              if (value !== null && isPostStatus(value)) {
                onUpdate({ status: value });
              }
            }}
          >
            <SelectTrigger aria-label="Status">
              <SelectValueIcon />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {POST_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  <SelectItemIcon>
                    <span
                      className={cn(
                        "block size-2 rounded-full",
                        STATUS_INFO[status].dot
                      )}
                    />
                  </SelectItemIcon>
                  {STATUS_INFO[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onDelete}
                  aria-label="Delete post"
                  // Destructive and irreversible: an agent driving the UI
                  // should confirm before pressing it.
                  data-agent-confirm=""
                  className="text-neutral-500 hover:bg-red-50 hover:text-red-600"
                />
              }
            >
              <Trash2Icon />
            </TooltipTrigger>
            <TooltipContent>Delete post</TooltipContent>
          </Tooltip>

          <HelpButton />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <article
          className="mx-auto my-4 flex w-full max-w-[600px] gap-3 rounded-xl bg-white p-4 shadow ring-1 ring-neutral-950/5 sm:my-8"
          aria-label={`${platform.label} post`}
        >
          <BrandAvatar />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1 text-[15px] leading-6">
              <span className="font-bold text-neutral-900">{PROJECT_NAME}</span>
              <span className="text-neutral-500">{platform.handle}</span>
              <span className="text-neutral-400" aria-hidden>
                ·
              </span>
              {/* Segmented inputs: the value only changes once every segment
                  holds something, so a half-typed date never reaches Storage. */}
              <TimeInput
                value={post.time}
                onValueChange={(time) => {
                  if (time) {
                    onUpdate({ time });
                  }
                }}
                aria-label="Time"
                className={META_INPUT_CLASS}
              />
              <span className="text-neutral-400" aria-hidden>
                ·
              </span>
              <DateInput
                value={post.date}
                onValueChange={(date) => {
                  if (date) {
                    onUpdate({ date });
                  }
                }}
                aria-label="Date"
                className={META_INPUT_CLASS}
              />

              <Select
                value={post.platform}
                onValueChange={(value) => {
                  if (isPlatform(value)) {
                    onUpdate({ platform: value });
                  }
                }}
              >
                <SelectTrigger
                  aria-label="Platform"
                  className="ml-auto h-7 border-transparent bg-transparent px-1.5 shadow-none"
                >
                  <SelectValueIcon />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {PLATFORMS.map((item) => (
                    <SelectItem key={item} value={item}>
                      <SelectItemIcon>
                        <PlatformBadge platform={item} size={18} />
                      </SelectItemIcon>
                      {PLATFORM_INFO[item].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3">
              <PostBody
                postId={post.id}
                platform={post.platform}
                preview={post.preview}
                linkUrl={post.linkUrl}
                onPreviewChange={(preview, linkUrl) =>
                  onUpdate({ preview, linkUrl })
                }
                onTextChange={setText}
              />

              <PostMedia {...media} />

              {url ? <LinkCard url={url} /> : null}

              <div className="-mx-2 flex items-center justify-between gap-3 border-t border-neutral-950/5 px-2 pt-2">
                <AddMediaButton canAdd={media.canAdd} upload={media.upload} />
                <span
                  className={cn(
                    "text-xs text-neutral-500 tabular-nums",
                    overLimit ? "font-medium text-red-600" : undefined
                  )}
                  aria-live="polite"
                >
                  {length.toLocaleString()} /{" "}
                  {platform.maxLength.toLocaleString()}
                </span>
              </div>
            </div>

            <PostActions platform={post.platform} />
          </div>
        </article>

        <p className="mb-4 text-center text-xs text-neutral-500">
          Changes save automatically and sync to everyone in realtime.
        </p>
      </main>
    </div>
  );
}
