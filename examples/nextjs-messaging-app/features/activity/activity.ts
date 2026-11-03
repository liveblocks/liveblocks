import type { ActivityItem } from "@/lib/feeds";

export function getActivityRootFeedId(item: ActivityItem): string {
  return item.data.parentFeedId ?? item.data.feedId;
}

export function isUnread(item: ActivityItem): boolean {
  return item.data.readAt === undefined;
}
