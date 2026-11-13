"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { NewPostMenu } from "@/components/new-post-menu";
import { Button } from "@/components/ui/button";
import {
  compareByDateTime,
  getMonthGrid,
  isSameDay,
  isSameMonth,
  toDateKey,
  WEEKDAYS,
  type DateKey,
} from "@/lib/dates";
import type { Platform } from "@/lib/platforms";
import type { PostData } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { DraggablePostCard, PostCardContent } from "./post-card";

type MonthCalendarProps = {
  month: Date;
  posts: PostData[];
  postHref: (postId: string) => string;
  onMovePost: (postId: string, date: DateKey) => void;
  onCreatePost: (date: DateKey, platform: Platform) => void;
};

export function MonthCalendar({
  month,
  posts,
  postHref,
  onMovePost,
  onCreatePost,
}: MonthCalendarProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Require a small movement before a drag starts, so a plain click still
  // opens the post.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const days = useMemo(() => getMonthGrid(month), [month]);

  const postsByDay = useMemo(() => {
    const map = new Map<DateKey, PostData[]>();
    for (const post of [...posts].sort(compareByDateTime)) {
      const list = map.get(post.date);
      if (list) {
        list.push(post);
      } else {
        map.set(post.date, [post]);
      }
    }
    return map;
  }, [posts]);

  const activePost = activeId
    ? (posts.find((post) => post.id === activeId) ?? null)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) {
      return;
    }
    const postId = String(active.id);
    const date = String(over.id);
    const post = posts.find((item) => item.id === postId);
    if (post && post.date !== date) {
      onMovePost(postId, date);
    }
  }

  const today = new Date();

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="grid shrink-0 grid-cols-7 border-b border-neutral-950/5">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-3 py-2 text-xs font-medium text-neutral-500"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className="grid grid-cols-7"
            style={{
              gridAutoRows: "minmax(132px, auto)",
              minHeight: "100%",
            }}
          >
            {days.map((day) => {
              const key = toDateKey(day);
              return (
                <DayCell
                  key={key}
                  date={day}
                  dateKey={key}
                  posts={postsByDay.get(key) ?? []}
                  isCurrentMonth={isSameMonth(day, month)}
                  isToday={isSameDay(day, today)}
                  isDragging={activeId !== null}
                  postHref={postHref}
                  onCreatePost={onCreatePost}
                />
              );
            })}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePost ? (
          <PostCardContent post={activePost} dragging className="w-full" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DayCell({
  date,
  dateKey,
  posts,
  isCurrentMonth,
  isToday,
  isDragging,
  postHref,
  onCreatePost,
}: {
  date: Date;
  dateKey: DateKey;
  posts: PostData[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isDragging: boolean;
  postHref: (postId: string) => string;
  onCreatePost: (date: DateKey, platform: Platform) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/day relative flex min-w-0 flex-col gap-1.5 border-r border-b border-neutral-950/5 p-1.5 transition-colors [&:nth-child(7n)]:border-r-0",
        !isCurrentMonth && "bg-neutral-50/80",
        isOver && "bg-primary/5 ring-1 ring-primary/40 ring-inset",
        isDragging && !isOver && "hover:bg-neutral-50"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
            isToday
              ? "bg-primary text-primary-foreground"
              : isCurrentMonth
                ? "text-neutral-700"
                : "text-neutral-400"
          )}
        >
          {date.getDate()}
        </span>
        <NewPostMenu
          align="start"
          label={`New post on ${date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`}
          onSelect={(platform) => onCreatePost(dateKey, platform)}
        >
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-neutral-400 opacity-0 transition-opacity group-hover/day:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            aria-label="Add a post on this day"
          >
            <PlusIcon />
          </Button>
        </NewPostMenu>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {posts.map((post) => (
          <DraggablePostCard
            key={post.id}
            post={post}
            href={postHref(post.id)}
          />
        ))}
      </div>
    </div>
  );
}
