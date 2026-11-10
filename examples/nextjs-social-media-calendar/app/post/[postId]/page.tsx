"use client";

import { LiveMap } from "@liveblocks/client";
import {
  ClientSideSuspense,
  RoomProvider,
  useMutation,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PostEditor } from "@/components/composer/post-editor";
import { PostPreview } from "@/components/composer/post-preview";
import { HelpButton } from "@/components/help-button";
import { Loading } from "@/components/loading";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type PostStatus,
} from "@/lib/posts";
import { cn } from "@/lib/utils";

type PostUpdate = Partial<Omit<PostData, "id" | "createdAt">>;

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
 * Rendered inside the project room: reads and updates the post's metadata,
 * then enters the post room for the body.
 */
function PostShell({ postId }: { postId: string }) {
  const router = useRouter();
  const calendarHref = useExampleHref("/");
  const postRoomId = useExampleRoomId(postId);
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
        <Button asChild variant="outline" size="sm">
          <Link href={calendarHref}>
            <ArrowLeftIcon />
            Back to calendar
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <RoomProvider
      id={postRoomId}
      initialPresence={{ editingPostId: postId }}
      // Post rooms only store the Tiptap document (`_tiptap_docs`); the
      // `posts` map lives in the project room.
      initialStorage={{ posts: new LiveMap() }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <PostComposer
          post={post}
          calendarHref={calendarHref}
          onUpdate={updatePost}
          onDelete={() => {
            deletePost();
            router.push(calendarHref);
          }}
        />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

/**
 * Rendered inside the post room: header with who's editing this post, the
 * LiveText-backed Tiptap composer, and a live preview.
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
  const [text, setText] = useState("");
  const platform = PLATFORM_INFO[post.platform];

  return (
    <div className="flex h-dvh w-full flex-col gap-2.5 overflow-hidden bg-neutral-50 p-2.5">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-white px-3 py-2 shadow ring-1 ring-neutral-950/5">
        <Button asChild variant="ghost" size="sm" className="-ml-1">
          <Link href={calendarHref}>
            <ArrowLeftIcon />
            Calendar
          </Link>
        </Button>

        <div className="h-5 w-px bg-neutral-200" />

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
          <AvatarStack size={28} />

          <Select
            value={post.status}
            onValueChange={(value) => {
              if (isPostStatus(value)) {
                onUpdate({ status: value });
              }
            }}
          >
            <SelectTrigger size="sm" aria-label="Status" className="gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  STATUS_INFO[post.status].dot
                )}
              />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {POST_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      STATUS_INFO[status].dot
                    )}
                  />
                  {STATUS_INFO[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label="Delete post"
            className="text-neutral-500 hover:text-red-600"
          >
            <Trash2Icon />
          </Button>

          <HelpButton />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-950/5 px-3 py-2">
            <Select
              value={post.platform}
              onValueChange={(value) => {
                if (isPlatform(value)) {
                  onUpdate({ platform: value });
                }
              }}
            >
              <SelectTrigger size="sm" aria-label="Platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((item) => (
                  <SelectItem key={item} value={item}>
                    <PlatformBadge platform={item} size={18} />
                    {PLATFORM_INFO[item].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              type="date"
              value={post.date}
              onChange={(event) => {
                if (event.target.value) {
                  onUpdate({ date: event.target.value });
                }
              }}
              aria-label="Date"
              className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <input
              type="time"
              value={post.time}
              onChange={(event) => {
                if (event.target.value) {
                  onUpdate({ time: event.target.value });
                }
              }}
              aria-label="Time"
              className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <div className="min-h-0 flex-1">
            <PostEditor
              postId={post.id}
              platform={post.platform}
              preview={post.preview}
              onPreviewChange={(preview) => onUpdate({ preview })}
              onTextChange={setText}
            />
          </div>
        </section>

        <aside className="hidden min-h-0 overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5 lg:flex">
          <div className="w-full">
            <PostPreview
              platform={post.platform}
              text={text}
              date={post.date}
              time={post.time}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
