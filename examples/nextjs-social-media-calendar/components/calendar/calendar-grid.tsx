"use client";

import { PlusIcon } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NewPostMenu } from "@/components/new-post-menu";
import {
  compareByDateTime,
  compareByTime,
  formatDayHeading,
  getPeriodGrid,
  isSameDay,
  isSamePeriod,
  parseDateKey,
  toDateKey,
  WEEKDAYS,
  type DateKey,
  type Period,
} from "@/lib/dates";
import { describePlatforms, type Platform } from "@/lib/platforms";
import type { PostData } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { PostBoard, PostBoardDay } from "./post-board";
import { PostCard, PostCardGhost } from "./post-card";

type CalendarGridProps = {
  period: Period;
  /** Any day in the week or month to show. */
  date: Date;
  posts: PostData[];
  postHref: (postId: string) => string;
  onMovePost: (postId: string, date: DateKey) => void;
  onCreatePost: (date: DateKey, platform: Platform) => void;
};

/**
 * The week or month as a grid of days, each a drop target for the posts it
 * holds. A month shows whole weeks, so it starts and ends with a few days of
 * the neighboring months.
 */
export function CalendarGrid({
  period,
  date,
  posts,
  postHref,
  onMovePost,
  onCreatePost,
}: CalendarGridProps) {
  const days = useMemo(() => getPeriodGrid(period, date), [period, date]);
  const dayKeys = useMemo(() => days.map(toDateKey), [days]);

  const postsById = useMemo(
    () => new Map(posts.map((post) => [post.id, post])),
    [posts]
  );

  // The board's lists: every visible day's post ids, sorted by time. Days
  // without posts are present too, so they can receive a drop.
  const lists = useMemo(() => {
    const result: Record<DateKey, string[]> = Object.fromEntries(
      dayKeys.map((key) => [key, []])
    );
    for (const post of [...posts].sort(compareByDateTime)) {
      result[post.date]?.push(post.id);
    }
    return result;
  }, [dayKeys, posts]);

  const postLabel = useCallback(
    (postId: string) => {
      const post = postsById.get(postId);
      return post ? `${describePlatforms(post.platforms)} post` : undefined;
    },
    [postsById]
  );

  const dayLabel = useCallback(
    (day: string) => formatDayHeading(parseDateKey(day)),
    []
  );

  const today = new Date();

  return (
    // Days keep a minimum width; on narrow screens the whole calendar (weekday
    // row and days together) scrolls sideways rather than squeezing.
    <div className="h-full min-h-0 overflow-x-auto">
      <div className="flex h-full min-w-[980px] flex-col">
        <div className="grid shrink-0 grid-cols-7 border-b border-neutral-950/5">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[11px] font-medium tracking-wide text-neutral-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PostBoard
            lists={lists}
            order={dayKeys}
            postLabel={postLabel}
            dayLabel={dayLabel}
            onListsChange={(_lists, details) => {
              // Only a change of day is stored; the order within a day follows
              // each post's time.
              if (details.from !== details.to) {
                onMovePost(details.key, details.to);
              }
            }}
            aria-label="Posts by day"
            className="grid grid-cols-7"
            style={
              period === "week"
                ? // One row filling the view; a busy day scrolls inside its cell.
                  { height: "100%", gridTemplateRows: "minmax(0, 1fr)" }
                : // Rows grow with their posts and the month scrolls.
                  { minHeight: "100%", gridAutoRows: "minmax(132px, auto)" }
            }
          >
            {days.map((day, index) => {
              const key = dayKeys[index];
              return (
                <DayCell
                  key={key}
                  date={day}
                  dateKey={key}
                  postsById={postsById}
                  inPeriod={isSamePeriod(period, day, date)}
                  scrollsPosts={period === "week"}
                  isToday={isSameDay(day, today)}
                  postHref={postHref}
                  onCreatePost={onCreatePost}
                />
              );
            })}
          </PostBoard>
        </div>
      </div>
    </div>
  );
}

function DayCell({
  date,
  dateKey,
  postsById,
  inPeriod,
  scrollsPosts,
  isToday,
  postHref,
  onCreatePost,
}: {
  date: Date;
  dateKey: DateKey;
  postsById: Map<string, PostData>;
  inPeriod: boolean;
  /** Whether the posts scroll inside the cell (week) or grow it (month). */
  scrollsPosts: boolean;
  isToday: boolean;
  postHref: (postId: string) => string;
  onCreatePost: (date: DateKey, platform: Platform) => void;
}) {
  return (
    <PostBoardDay
      value={dateKey}
      role="group"
      aria-label={formatDayHeading(date)}
      className={cn(
        "group/day relative flex min-h-0 min-w-0 flex-col gap-1.5 border-r border-b border-neutral-950/5 p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
        !inPeriod && "bg-neutral-50/80",
        "data-over:bg-primary/5 data-over:ring-1 data-over:ring-primary/40 data-over:ring-inset"
      )}
    >
      {(state) => (
        <>
          <div className="flex items-center px-1">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                isToday
                  ? "bg-primary text-primary-foreground"
                  : inPeriod
                    ? "text-neutral-700"
                    : "text-neutral-400"
              )}
            >
              {date.getDate()}
            </span>
          </div>

          <DayPosts
            date={date}
            dateKey={dateKey}
            posts={state.posts}
            moving={state.moving}
            left={state.left}
            postsById={postsById}
            scrollsPosts={scrollsPosts}
            postHref={postHref}
            onCreatePost={onCreatePost}
          />
        </>
      )}
    </PostBoardDay>
  );
}

/**
 * A day's posts, rendered from the board's state so a post being dragged
 * shows up in the day it hovers before it's dropped. The empty space left in
 * the day is a slot that offers a new post while the day is hovered.
 *
 * Nothing about the day's size changes while a post moves: the slot stays in
 * the layout (hidden) rather than unmounting, and in the month view, where
 * rows size to their contents, the day keeps at least the height it had when
 * the move started until the drop completes, so the day a post leaves
 * doesn't collapse under the pointer.
 */
function DayPosts({
  date,
  dateKey,
  posts,
  moving,
  left,
  postsById,
  scrollsPosts,
  postHref,
  onCreatePost,
}: {
  date: Date;
  dateKey: DateKey;
  posts: string[];
  moving: boolean;
  /** The post picked up from this day and currently over another, if any. */
  left: { id: string; index: number } | null;
  postsById: Map<string, PostData>;
  scrollsPosts: boolean;
  postHref: (postId: string) => string;
  onCreatePost: (date: DateKey, platform: Platform) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // The height as of the last render with nothing moving: what to hold while
  // a post moves. Measured every idle render, so it's current when a move
  // starts, however quickly the pointer leaves the day.
  const restingHeight = useRef<number | null>(null);
  const [heldHeight, setHeldHeight] = useState<number | null>(null);
  const holds = moving && !scrollsPosts;

  // A post's place in its day is its time, wherever the pointer put it in
  // the board's draft, so a drag can't reorder posts within a day. By time
  // only: a post in flight still carries the date it's being moved from.
  const sorted = useMemo(
    () =>
      [...posts].sort((a, b) => {
        const postA = postsById.get(a);
        const postB = postsById.get(b);
        return postA && postB ? compareByTime(postA, postB) : 0;
      }),
    [posts, postsById]
  );

  // A faded copy of the post where it was picked up, while it's away.
  const ghost = (id: string) => {
    const post = postsById.get(id);
    return post ? <PostCardGhost key={`ghost-${id}`} post={post} /> : null;
  };

  useLayoutEffect(() => {
    if (!moving && ref.current) {
      restingHeight.current = ref.current.offsetHeight;
    }
  });

  useLayoutEffect(() => {
    setHeldHeight(holds ? restingHeight.current : null);
  }, [holds]);

  return (
    // Negative margin + padding gives card shadows room inside the scrolling
    // area instead of clipping them.
    <div
      ref={ref}
      className={cn(
        "-m-1.5 flex min-h-0 flex-1 flex-col gap-1.5 p-1.5",
        scrollsPosts && "overflow-x-hidden overflow-y-auto"
      )}
      style={heldHeight !== null ? { minHeight: heldHeight } : undefined}
    >
      {sorted.flatMap((id, index) => {
        const post = postsById.get(id);
        const card = post ? (
          <PostCard key={post.id} post={post} href={postHref(post.id)} />
        ) : (
          []
        );
        return left?.index === index ? [ghost(left.id), card] : card;
      })}
      {left && left.index >= sorted.length ? ghost(left.id) : null}
      <NewPostMenu
        align="start"
        label={`New post on ${date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`}
        onSelect={(platform) => onCreatePost(dateKey, platform)}
        trigger={
          <button
            type="button"
            className={cn(
              // Shown while the pointer is anywhere over the day.
              "flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-md border border-dashed border-neutral-300 text-xs font-medium text-neutral-500 opacity-0 transition-[opacity,color,background-color,border-color] outline-none group-hover/day:opacity-100 hover:border-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring data-open:border-neutral-400 data-open:bg-neutral-100 data-open:text-neutral-800 data-open:opacity-100",
              // Out of the way of a drop, but still taking up its space.
              moving && "invisible"
            )}
            aria-label={`Add a post on ${formatDayHeading(date)}`}
          >
            <PlusIcon className="size-3.5" aria-hidden />
            New post
          </button>
        }
      />
    </div>
  );
}
