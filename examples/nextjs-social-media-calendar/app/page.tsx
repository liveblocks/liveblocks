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
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { HelpButton } from "@/components/help-button";
import { Loading } from "@/components/loading";
import { NewPostMenu } from "@/components/new-post-menu";
import { Button } from "@/components/ui/button";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  TabsTabIcon,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useExampleRoomId } from "@/hooks/use-example-room-id";
import {
  addPeriods,
  formatPeriodTitle,
  isSamePeriod,
  parseDateKey,
  startOfPeriod,
  toDateKey,
  type DateKey,
  type Period,
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
  const [period, setPeriod] = useState<Period>("month");
  // Any day in the week or month being shown. Starts on today, so switching
  // between week and month keeps showing the current one.
  const [date, setDate] = useState(() => new Date());

  // Storage is read as plain JSON: the `posts` LiveMap becomes an object
  // keyed by post id.
  const posts = useStorage((root) => Object.values(root.posts), shallow);

  const periodPosts = useMemo(
    () =>
      posts.filter((post) =>
        isSamePeriod(period, parseDateKey(post.date), date)
      ),
    [posts, period, date]
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
  // "New post" in the header lands on today when it's in view, otherwise on
  // the first day of the week or month being viewed.
  const defaultNewPostDate = isSamePeriod(period, date, today)
    ? toDateKey(today)
    : toDateKey(startOfPeriod(period, date));
  const periodLabel = period === "week" ? "week" : "month";

  return (
    <Tabs
      value={view}
      onValueChange={(value) => setView(value === "list" ? "list" : "calendar")}
      className="flex h-dvh w-full flex-col gap-2.5 overflow-hidden bg-neutral-50 p-2.5"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-white px-3 py-2 shadow ring-1 ring-neutral-950/5">
        <Brand />

        <div className="flex items-center gap-1">
          <SegmentedControl
            value={period}
            onValueChange={(value) =>
              setPeriod(value === "week" ? "week" : "month")
            }
            aria-label="Period"
            className="mr-2"
          >
            <SegmentedControlItem value="week">Week</SegmentedControlItem>
            <SegmentedControlItem value="month">Month</SegmentedControlItem>
          </SegmentedControl>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    setDate((current) => addPeriods(period, current, -1))
                  }
                  aria-label={`Previous ${periodLabel}`}
                />
              }
            >
              <ChevronLeftIcon />
            </TooltipTrigger>
            <TooltipContent>Previous {periodLabel}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    setDate((current) => addPeriods(period, current, 1))
                  }
                  aria-label={`Next ${periodLabel}`}
                />
              }
            >
              <ChevronRightIcon />
            </TooltipTrigger>
            <TooltipContent>Next {periodLabel}</TooltipContent>
          </Tooltip>
          <h1 className="ml-2 text-sm font-semibold text-neutral-900 tabular-nums">
            {formatPeriodTitle(period, date)}
          </h1>
          <span className="ml-2 hidden rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 sm:inline">
            {periodPosts.length} {periodPosts.length === 1 ? "post" : "posts"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <AvatarStack size={28} />

          <TabsList aria-label="View">
            <TabsTab value="calendar">
              <TabsTabIcon>
                <CalendarIcon />
              </TabsTabIcon>
              Calendar
            </TabsTab>
            <TabsTab value="list">
              <TabsTabIcon>
                <ListIcon />
              </TabsTabIcon>
              List
            </TabsTab>
          </TabsList>

          <NewPostMenu
            onSelect={(platform) =>
              createAndOpenPost(defaultNewPostDate, platform)
            }
            trigger={
              <Button size="sm">
                <PlusIcon />
                New post
              </Button>
            }
          />

          <HelpButton />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden rounded-lg bg-white shadow ring-1 ring-neutral-950/5">
        <TabsPanel value="calendar" className="h-full">
          <CalendarGrid
            period={period}
            date={date}
            // All posts, so a month grid's leading/trailing days from the
            // neighboring months show their posts too.
            posts={posts}
            postHref={postHref}
            onMovePost={movePost}
            onCreatePost={createAndOpenPost}
          />
        </TabsPanel>
        <TabsPanel value="list" className="h-full">
          <ListView
            period={period}
            date={date}
            posts={periodPosts}
            postHref={postHref}
            onCreatePost={createAndOpenPost}
          />
        </TabsPanel>
      </main>
    </Tabs>
  );
}
