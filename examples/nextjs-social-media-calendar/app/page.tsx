"use client";

import { LiveList, LiveObject, shallow } from "@liveblocks/client";
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
import { createInitialStorage, type PostLson } from "@/lib/posts";

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
      const post: PostLson = {
        id,
        platform,
        date,
        time: "12:00",
        status: "draft",
        preview: "",
        createdAt: Date.now(),
        media: new LiveList([]),
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
      orientation="vertical"
      className="flex h-dvh w-full overflow-hidden bg-neutral-100 text-neutral-900"
    >
      <aside className="flex w-56 shrink-0 flex-col gap-5 p-4">
        <Brand />

        <NewPostMenu
          align="start"
          onSelect={(platform) =>
            createAndOpenPost(defaultNewPostDate, platform)
          }
          trigger={
            <Button size="sm" className="w-full justify-center">
              <PlusIcon />
              New post
            </Button>
          }
        />

        <nav className="flex flex-col gap-1.5">
          <p className="px-2 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
            Workspace
          </p>
          <TabsList
            aria-label="View"
            className="flex h-auto flex-col items-stretch gap-0.5 rounded-none bg-transparent p-0"
          >
            <TabsTab
              value="calendar"
              className="h-8 justify-start px-2 text-sm text-neutral-700 hover:bg-neutral-200/60 data-selected:bg-white data-selected:shadow-xs [&_svg]:size-4"
            >
              <TabsTabIcon>
                <CalendarIcon />
              </TabsTabIcon>
              Calendar
            </TabsTab>
            <TabsTab
              value="list"
              className="h-8 justify-start px-2 text-sm text-neutral-700 hover:bg-neutral-200/60 data-selected:bg-white data-selected:shadow-xs [&_svg]:size-4"
            >
              <TabsTabIcon>
                <ListIcon />
              </TabsTabIcon>
              List
            </TabsTab>
          </TabsList>
        </nav>

        <div className="mt-auto flex items-center justify-between gap-2 px-1">
          <AvatarStack size={28} />
          <HelpButton />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col py-3 pr-3">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-950/5">
          <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-neutral-950/5 px-3 py-2">
            <div className="flex items-center gap-3 justify-self-start">
              <SegmentedControl
                value={period}
                onValueChange={(value) =>
                  setPeriod(value === "week" ? "week" : "month")
                }
                aria-label="Period"
              >
                <SegmentedControlItem value="month">Month</SegmentedControlItem>
                <SegmentedControlItem value="week">Week</SegmentedControlItem>
              </SegmentedControl>
              {/* Plain text, as a quiet way back to the current period. */}
              <button
                type="button"
                onClick={() => setDate(new Date())}
                className="cursor-pointer rounded-sm text-sm text-neutral-500 transition-colors outline-none hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1">
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
              <h1 className="min-w-28 text-center text-sm font-semibold text-neutral-900 tabular-nums">
                {formatPeriodTitle(period, date)}
              </h1>
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
            </div>

            {/* Empty third column keeps the title centered. */}
            <span aria-hidden />
          </header>

          <TabsPanel value="calendar" className="min-h-0 flex-1">
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
          <TabsPanel value="list" className="min-h-0 flex-1">
            <ListView
              period={period}
              date={date}
              posts={periodPosts}
              postHref={postHref}
              onCreatePost={createAndOpenPost}
            />
          </TabsPanel>
        </div>
      </main>
    </Tabs>
  );
}
