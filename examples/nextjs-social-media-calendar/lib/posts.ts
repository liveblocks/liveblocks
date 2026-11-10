import { LiveMap, LiveObject } from "@liveblocks/client";
import { addDays, startOfMonth, toDateKey, type DateKey } from "./dates";
import type { Platform } from "./platforms";

export type PostStatus = "draft" | "in-review" | "approved" | "scheduled";

export const POST_STATUSES: PostStatus[] = [
  "draft",
  "in-review",
  "approved",
  "scheduled",
];

export const STATUS_INFO: Record<
  PostStatus,
  { label: string; dot: string; badge: string }
> = {
  draft: {
    label: "Draft",
    dot: "bg-neutral-400",
    badge: "bg-neutral-100 text-neutral-600",
  },
  "in-review": {
    label: "In review",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700",
  },
  approved: {
    label: "Approved",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
  },
  scheduled: {
    label: "Scheduled",
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-700",
  },
};

/**
 * Metadata for a post, stored in the project room. The post body itself is a
 * Tiptap document backed by LiveText in the post's own room.
 */
export type PostData = {
  id: string;
  platform: Platform;
  // Local day the post is planned for, as `YYYY-MM-DD`.
  date: DateKey;
  // Planned time of day, as `HH:MM`.
  time: string;
  status: PostStatus;
  // Plain-text snippet of the body, synced from the composer so the calendar
  // can show a preview without joining every post's room.
  preview: string;
  createdAt: number;
};

type TiptapDoc = {
  type: "doc";
  content: { type: "paragraph"; content?: { type: "text"; text: string }[] }[];
};

export const EMPTY_DOCUMENT: TiptapDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function paragraphsToDocument(paragraphs: string[]): TiptapDoc {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [{ type: "text", text }],
    })),
  };
}

type SeedPost = {
  id: string;
  platform: Platform;
  // Day of the month (1-based), relative to the month the room is created in.
  day: number;
  time: string;
  status: PostStatus;
  paragraphs: string[];
};

const SEED_POSTS: SeedPost[] = [
  {
    id: "post-launch-teaser",
    platform: "instagram",
    day: 2,
    time: "09:00",
    status: "scheduled",
    paragraphs: [
      "Something new is landing next week. 👀",
      "We've been quietly rebuilding our favorite product from the ground up, and we can't wait to show you. Turn on notifications so you don't miss it.",
    ],
  },
  {
    id: "post-behind-the-scenes",
    platform: "tiktok",
    day: 4,
    time: "17:30",
    status: "approved",
    paragraphs: [
      "POV: the design team arguing about a 2px border radius for 45 minutes 😅 #designlife #startup",
    ],
  },
  {
    id: "post-customer-story",
    platform: "linkedin",
    day: 6,
    time: "11:00",
    status: "in-review",
    paragraphs: [
      "How Northwind cut their content review cycle from 5 days to 1.",
      "When Northwind's marketing team started working across three time zones, approvals became the bottleneck. Here's what changed when they moved planning, drafting, and feedback into a single shared calendar.",
      "Read the full story on our blog. 👇",
    ],
  },
  {
    id: "post-poll",
    platform: "x",
    day: 9,
    time: "14:00",
    status: "draft",
    paragraphs: [
      "Quick poll for the marketers out there: how many tools does it take to publish ONE social post at your company?",
    ],
  },
  {
    id: "post-launch-day",
    platform: "instagram",
    day: 11,
    time: "10:00",
    status: "in-review",
    paragraphs: [
      "It's here. ✨ Meet the all-new Acme Studio.",
      "Plan, write, and approve your content together, in realtime. Link in bio to try it free.",
    ],
  },
  {
    id: "post-launch-thread",
    platform: "x",
    day: 11,
    time: "10:05",
    status: "draft",
    paragraphs: [
      "Today we're launching the all-new Acme Studio 🚀",
      "A thread on what's new, and why we rebuilt everything (1/7)",
    ],
  },
  {
    id: "post-tips",
    platform: "facebook",
    day: 15,
    time: "12:00",
    status: "approved",
    paragraphs: [
      "3 tips for a content calendar your whole team will actually use:",
      '1. Plan a month ahead, but leave room for reactive posts. 2. Review drafts where they live, not in email threads. 3. Agree on one definition of "approved".',
    ],
  },
  {
    id: "post-hiring",
    platform: "linkedin",
    day: 18,
    time: "09:30",
    status: "draft",
    paragraphs: [
      "We're hiring a Senior Product Designer to join our fully remote team.",
      "You'll work closely with engineering and marketing to shape how teams plan content together. Apply through the link in the comments.",
    ],
  },
  {
    id: "post-reel",
    platform: "instagram",
    day: 21,
    time: "18:00",
    status: "draft",
    paragraphs: [
      "A day in the life of our content team, in 30 seconds. 🎬 #BTS",
    ],
  },
  {
    id: "post-webinar",
    platform: "linkedin",
    day: 24,
    time: "16:00",
    status: "scheduled",
    paragraphs: [
      'Join us live on Thursday: "Planning social content as a team" with our Head of Marketing.',
      "We'll share the exact workflow we use internally, from the first idea to the published post. Save your seat with the link below.",
    ],
  },
  {
    id: "post-trend",
    platform: "tiktok",
    day: 26,
    time: "19:00",
    status: "in-review",
    paragraphs: [
      "Replying to @everyone asking how we keep up with trends: we don't, we plan 😌 #marketingtok",
    ],
  },
  {
    id: "post-month-recap",
    platform: "x",
    day: 29,
    time: "15:00",
    status: "draft",
    paragraphs: [
      "That's a wrap on this month! Thanks to everyone who tried the new Acme Studio. Here's what we shipped, and what's coming next.",
    ],
  },
];

/**
 * Tiptap documents for the seeded posts, used as `initialContent` when a post
 * room is first opened.
 */
export const SEED_DOCUMENTS: Record<string, TiptapDoc> = Object.fromEntries(
  SEED_POSTS.map((post) => [post.id, paragraphsToDocument(post.paragraphs)])
);

export function getInitialDocument(postId: string): TiptapDoc {
  return SEED_DOCUMENTS[postId] ?? EMPTY_DOCUMENT;
}

/**
 * Builds the project room's initial Storage. Only used the first time the
 * room is created; dates are placed in the current month.
 */
export function createInitialStorage(): Liveblocks["Storage"] {
  const monthStart = startOfMonth(new Date());
  const lastDay = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0
  ).getDate();

  return {
    posts: new LiveMap(
      SEED_POSTS.map((post, index) => [
        post.id,
        new LiveObject<PostData>({
          id: post.id,
          platform: post.platform,
          date: toDateKey(addDays(monthStart, Math.min(post.day, lastDay) - 1)),
          time: post.time,
          status: post.status,
          preview: post.paragraphs.join(" "),
          createdAt: Date.now() + index,
        }),
      ])
    ),
  };
}

export const PREVIEW_MAX_LENGTH = 280;

export function truncatePreview(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > PREVIEW_MAX_LENGTH
    ? `${normalized.slice(0, PREVIEW_MAX_LENGTH - 1)}…`
    : normalized;
}
