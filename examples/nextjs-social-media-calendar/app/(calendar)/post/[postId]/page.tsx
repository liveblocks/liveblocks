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
import { SchedulePicker } from "@/components/composer/schedule-picker";
import { TagPicker } from "@/components/composer/tag-picker";
import {
  AddMediaButton,
  PostMedia,
  usePostMedia,
} from "@/components/composer/post-media";
import { findLastUrl } from "@/lib/urls";
import { EditingAvatars } from "@/components/editing-avatars";
import { HelpButton } from "@/components/help-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { PostData, PostFields } from "@/lib/posts";
import { cn } from "@/lib/utils";

type PostUpdate = Partial<Omit<PostFields, "id" | "createdAt">>;

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
      {/* Darker than the default so the calendar clearly recedes behind the post. */}
      <DialogBackdrop className="bg-neutral-950/60" />
      <DialogContent
        className="h-[calc(100dvh-2.5rem)] max-h-none w-[calc(100%-2.5rem)] max-w-none bg-white"
        aria-label="Post"
      >
        <PostShell postId={postId} />
      </DialogContent>
    </Dialog>
  );
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
          <div className="composer-editor">
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
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-neutral-950/10 px-4 py-2.5">
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

          <SchedulePicker
            date={post.date}
            time={post.time}
            onDateChange={(date) => onUpdate({ date })}
            onTimeChange={(time) => onUpdate({ time })}
          />

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

      <main className="min-h-0 flex-1 overflow-y-auto px-4">
        <PostFrame
          platform={previewPlatform}
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
