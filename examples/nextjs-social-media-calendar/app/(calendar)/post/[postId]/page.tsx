"use client";

import { LiveMap } from "@liveblocks/client";
import {
  ClientSideSuspense,
  RoomProvider,
  useMutation,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { Trash2Icon, XIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps } from "react";
import { LinkCard } from "@/components/composer/link-card";
import { PlatformPicker } from "@/components/composer/platform-picker";
import { PostEditor } from "@/components/composer/post-editor";
import { PostFrame } from "@/components/composer/post-frame";
import { TagPicker } from "@/components/composer/tag-picker";
import {
  AddMediaButton,
  PostMedia,
  usePostMedia,
} from "@/components/composer/post-media";
import { findLastUrl } from "@/components/composer/urls";
import { EditingAvatars } from "@/components/editing-avatars";
import { HelpButton } from "@/components/help-button";
import { Button } from "@/components/ui/button";
import { DateInput, TimeInput } from "@/components/ui/date-time-input";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
  describePlatforms,
  PLATFORM_INFO,
  sortPlatforms,
  strictestPlatform,
  type Platform,
} from "@/lib/platforms";
import {
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

/**
 * A post, as a large dialog over the calendar. The `(calendar)` layout has
 * already joined the project room, which holds every post's metadata and
 * presence; the post's own room (entered further down) holds its body as
 * LiveText. Closing the dialog navigates back to the calendar.
 */
export default function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const calendarHref = useExampleHref("/");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.push(calendarHref);
        }
      }}
    >
      <DialogBackdrop />
      <DialogContent
        className="h-[calc(100dvh-4rem)] w-[calc(100%-4rem)] max-w-6xl bg-neutral-50"
        aria-label="Post"
      >
        <PostShell postId={postId} />
      </DialogContent>
    </Dialog>
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
    return () => updateMyPresence({ editingPostId: null });
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
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-neutral-900">
          This post no longer exists.
        </p>
        <p className="text-sm text-neutral-500">
          It may have been deleted by someone else in the project.
        </p>
        <DialogTitle className="sr-only">Post not found</DialogTitle>
        <DialogClose render={<Button variant="outline" size="sm" />}>
          Back to calendar
        </DialogClose>
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
 * under it, and, when it has no media, a preview card for the last link.
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
  const platforms = sortPlatforms(post.platforms);
  // Which network the post is previewed on. Falls back to the first one when
  // the previewed network is removed from the post (here or by someone else).
  const [previewChoice, setPreviewChoice] = useState<Platform>(platforms[0]);
  const previewPlatform = platforms.includes(previewChoice)
    ? previewChoice
    : platforms[0];
  const media = usePostMedia(post.id, post.media);
  const [text, setText] = useState("");
  // Like the networks: a post with media shows the media, not a link card.
  const hasMedia = media.media.length > 0 || media.pending.length > 0;
  const url = hasMedia ? null : findLastUrl(text);
  const length = text.length;
  // The same text goes to every network, so it has to fit the strictest.
  const strictest = PLATFORM_INFO[strictestPlatform(platforms)];
  const overLimit = length > strictest.maxLength;

  return (
    <div className="flex h-full w-full flex-col gap-2.5 overflow-hidden p-2.5">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-white px-3 py-2 shadow ring-1 ring-neutral-950/5">
        <DialogTitle className="sr-only">
          {describePlatforms(platforms)} post
        </DialogTitle>
        <PlatformPicker
          platforms={platforms}
          preview={previewPlatform}
          onPreviewChange={setPreviewChoice}
          onPlatformsChange={(next) => {
            if (next.length > 0) {
              onUpdate({ platforms: next });
            }
          }}
        />

        <Separator orientation="vertical" />

        <TagPicker
          tags={post.tags}
          onTagsChange={(tags) => onUpdate({ tags })}
        />

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

          <Separator orientation="vertical" />

          <Tooltip>
            <TooltipTrigger
              render={
                <DialogClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="-mr-1 text-neutral-500"
                      aria-label="Close"
                    />
                  }
                />
              }
            >
              <XIcon />
            </TooltipTrigger>
            <TooltipContent>Back to calendar</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <PostFrame
          platform={previewPlatform}
          meta={
            <>
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
            </>
          }
          body={
            <PostBody
              postId={post.id}
              platforms={platforms}
              preview={post.preview}
              linkUrl={post.linkUrl}
              onPreviewChange={(preview, linkUrl) =>
                onUpdate({ preview, linkUrl })
              }
              onTextChange={setText}
            />
          }
          media={<PostMedia {...media} />}
          link={url ? <LinkCard url={url} /> : null}
          footer={
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
                {strictest.maxLength.toLocaleString()}
                {platforms.length > 1 ? ` on ${strictest.label}` : null}
              </span>
            </div>
          }
        />

        <p className="mb-4 text-center text-xs text-neutral-500">
          Changes save automatically and sync to everyone in realtime.
        </p>
      </main>
    </div>
  );
}
