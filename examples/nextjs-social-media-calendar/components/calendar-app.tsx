"use client";

import { LiveList, LiveObject, shallow } from "@liveblocks/client";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
  PlusIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { nanoid } from "nanoid";
import { Brand } from "@/components/brand";
import { ListView } from "@/components/calendar/list-view";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { HelpButton } from "@/components/help-button";
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
import type { PostLson } from "@/lib/posts";

type View = "calendar" | "list";

/**
 * The calendar itself, rendered inside the project room by the `(calendar)`
 * layout. It stays mounted while a post is open as a dialog over it, so the
 * view, period and scroll position survive opening and closing posts.
 */
export function CalendarApp() {
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

  const createPost = useMutation(({ storage }, date: DateKey) => {
    const id = `post-${nanoid(8)}`;
    // New posts start on X; other networks are added in the composer.
    const post: PostLson = {
      id,
      platforms: ["x"],
      tags: [],
      date,
      time: "12:00",
      preview: "",
      createdAt: Date.now(),
      media: new LiveList([]),
    };
    storage.get("posts").set(id, new LiveObject(post));
    return id;
  }, []);

  const createAndOpenPost = useCallback(
    (date: DateKey) => {
      const id = createPost(date);
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
      {/* Below `xl` the sidebar collapses to a 32px column of icons, with
          tooltips standing in for the hidden labels. */}
      <aside className="flex w-14 shrink-0 flex-col gap-2 px-3 py-3 xl:w-56 xl:gap-5 xl:px-4">
        <Brand className="mb-4 xl:mb-0" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="sm"
                className="size-8 justify-center gap-[5px] p-0 text-[13px] font-semibold xl:w-full xl:px-3 [&_svg]:size-3"
                onClick={() => createAndOpenPost(defaultNewPostDate)}
                aria-label="New post"
              />
            }
          >
            <PlusIcon />
            <span className="hidden xl:inline">New post</span>
          </TooltipTrigger>
          <TooltipContent side="right" className="xl:hidden">
            New post
          </TooltipContent>
        </Tooltip>

        <nav className="flex flex-col gap-1.5">
          <p className="hidden px-2 text-[11px] font-medium tracking-wide text-neutral-500 uppercase xl:block">
            Workspace
          </p>
          <TabsList
            aria-label="View"
            className="flex h-auto flex-col items-stretch gap-2 rounded-none bg-transparent p-0 xl:gap-0.5"
          >
            <SidebarTab value="calendar" label="Calendar">
              <CalendarIcon />
            </SidebarTab>
            <SidebarTab value="list" label="List">
              <ListIcon />
            </SidebarTab>
          </TabsList>
        </nav>

        <div className="mt-auto flex items-center justify-center xl:justify-end xl:px-1">
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
                className="cursor-pointer rounded-sm text-xs font-medium text-neutral-500 transition-colors outline-none hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ring"
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

            {/* Who's in the project, on the right; the title stays centered. */}
            <div className="flex justify-end">
              <AvatarStack size={28} />
            </div>
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

/**
 * A view switcher entry in the sidebar: icon and label, or only the icon
 * with the label as a tooltip when the sidebar is collapsed.
 */
function SidebarTab({
  value,
  label,
  children,
}: {
  value: View;
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <TabsTab
            value={value}
            aria-label={label}
            className="size-8 justify-center px-0 text-[13px] text-neutral-700 hover:bg-neutral-200/60 data-selected:bg-white data-selected:shadow-xs xl:w-auto xl:justify-start xl:px-2 [&_svg]:size-3.5"
          />
        }
      >
        <TabsTabIcon>{children}</TabsTabIcon>
        <span className="hidden xl:inline">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="right" className="xl:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
