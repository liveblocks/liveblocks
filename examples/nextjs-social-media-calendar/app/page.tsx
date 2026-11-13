"use client";

import { LiveObject, shallow } from "@liveblocks/client";
import {
  ClientSideSuspense,
  RoomProvider,
  useMutation,
  useStorage,
} from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
  PlusIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { Brand } from "@/components/brand";
import { ListView } from "@/components/calendar/list-view";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { HelpButton } from "@/components/help-button";
import { Loading } from "@/components/loading";
import { NewPostMenu } from "@/components/new-post-menu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import {
  addMonths,
  formatMonthTitle,
  isSameMonth,
  parseDateKey,
  startOfMonth,
  toDateKey,
  type DateKey,
} from "@/lib/dates";
import type { Platform } from "@/lib/platforms";
import { createInitialStorage, type PostData } from "@/lib/posts";

type View = "calendar" | "list";

export default function Page() {
  const roomId = useExampleRoomId();

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ editingPostId: null }}
      initialStorage={createInitialStorage}
    >
      <ClientSideSuspense fallback={<Loading />}>
        <CalendarApp />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function CalendarApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("calendar");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  // Storage is read as plain JSON: the `posts` LiveMap becomes an object
  // keyed by post id.
  const posts = useStorage((root) => Object.values(root.posts), shallow);

  const monthPosts = useMemo(
    () => posts.filter((post) => isSameMonth(parseDateKey(post.date), month)),
    [posts, month]
  );

  // Keep gallery query params (exampleId, examplePreview) when opening a post.
  const postHref = useCallback(
    (postId: string) => {
      const search = searchParams?.toString();
      return `/post/${postId}${search ? `?${search}` : ""}`;
    },
    [searchParams]
  );

  const movePost = useMutation(({ storage }, postId: string, date: DateKey) => {
    storage.get("posts").get(postId)?.set("date", date);
  }, []);

  const createPost = useMutation(
    ({ storage }, date: DateKey, platform: Platform) => {
      const id = `post-${nanoid(8)}`;
      const post: PostData = {
        id,
        platform,
        date,
        time: "12:00",
        status: "draft",
        preview: "",
        createdAt: Date.now(),
      };
      storage.get("posts").set(id, new LiveObject(post));
      return id;
    },
    []
  );

  const createAndOpenPost = useCallback(
    (date: DateKey, platform: Platform) => {
      const id = createPost(date, platform);
      router.push(postHref(id));
    },
    [createPost, postHref, router]
  );

  const today = new Date();
  // "New post" in the header lands on today when viewing the current month,
  // otherwise on the first day of the month being viewed.
  const defaultNewPostDate = isSameMonth(month, today)
    ? toDateKey(today)
    : toDateKey(month);

  return (
    <div className="flex h-dvh w-full flex-col gap-2.5 overflow-hidden bg-neutral-50 p-2.5">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-white px-3 py-2 shadow ring-1 ring-neutral-950/5">
        <Brand />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonth((current) => addMonths(current, -1))}
            aria-label="Previous month"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonth(startOfMonth(new Date()))}
            disabled={isSameMonth(month, today)}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonth((current) => addMonths(current, 1))}
            aria-label="Next month"
          >
            <ChevronRightIcon />
          </Button>
          <h1 className="ml-2 text-sm font-semibold text-neutral-900 tabular-nums">
            {formatMonthTitle(month)}
          </h1>
          <span className="ml-2 hidden rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 sm:inline">
            {monthPosts.length} {monthPosts.length === 1 ? "post" : "posts"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <AvatarStack size={28} />

          <Tabs
            value={view}
            onValueChange={(value) =>
              setView(value === "list" ? "list" : "calendar")
            }
          >
            <TabsList>
              <TabsTrigger value="calendar">
                <CalendarIcon />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list">
                <ListIcon />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <NewPostMenu
            onSelect={(platform) =>
              createAndOpenPost(defaultNewPostDate, platform)
            }
          >
            <Button size="sm">
              <PlusIcon />
              New post
            </Button>
          </NewPostMenu>

          <HelpButton />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        {view === "calendar" ? (
          <MonthCalendar
            month={month}
            // All posts, so the grid's leading/trailing days from the
            // neighboring months show their posts too.
            posts={posts}
            postHref={postHref}
            onMovePost={movePost}
            onCreatePost={createAndOpenPost}
          />
        ) : (
          <ListView
            month={month}
            posts={monthPosts}
            postHref={postHref}
            onCreatePost={createAndOpenPost}
          />
        )}
      </main>
    </div>
  );
}
