import {
  LiveList,
  LiveMap,
  LiveObject,
  type LiveFile,
  type LiveFileData,
} from "@liveblocks/client";
import { addDays, startOfMonth, toDateKey, type DateKey } from "./dates";
import type { Platform } from "./platforms";
import { findLastUrl, URL_PATTERN } from "./urls";

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
 * A post's plain fields, stored in the project room. The post body itself is
 * a Tiptap document backed by LiveText in the post's own room.
 */
export type PostFields = {
  id: string;
  // The networks the post goes to; at least one. The same text and media
  // are published to each.
  platforms: Platform[];
  // Local day the post is planned for, as `YYYY-MM-DD`.
  date: DateKey;
  // Planned time of day, as `HH:MM`.
  time: string;
  status: PostStatus;
  // Plain-text snippet of the body, synced from the composer so the calendar
  // can show a preview without joining every post's room.
  preview: string;
  // Last link in the body, synced the same way, so a card can show the
  // page's image when the post has no media of its own. Absent on old posts.
  linkUrl?: string;
  // Free-form labels like "Campaign" or "Evergreen", shared by the project.
  tags: string[];
  createdAt: number;
};

/**
 * The post as stored: its fields plus the photos and videos attached to it,
 * uploaded to the project room as LiveFiles. Older posts have no `media`.
 */
export type PostLson = PostFields & { media?: LiveList<LiveFile> };

/** The post as read with `useStorage`: plain data, LiveFiles as their data. */
export type PostData = Omit<PostFields, "platforms" | "tags"> & {
  platforms: readonly Platform[];
  tags: readonly string[];
  media?: readonly LiveFileData[];
};

type TiptapMark = { type: "link"; attrs: { href: string } };
type TiptapText = { type: "text"; text: string; marks?: TiptapMark[] };
type TiptapDoc = {
  type: "doc";
  content: { type: "paragraph"; content?: TiptapText[] }[];
};

export const EMPTY_DOCUMENT: TiptapDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/** Splits a paragraph into text nodes, marking its URLs as links. */
function paragraphToNodes(text: string): TiptapText[] {
  const nodes: TiptapText[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) {
      nodes.push({ type: "text", text: text.slice(last, index) });
    }
    nodes.push({
      type: "text",
      text: match[0],
      marks: [{ type: "link", attrs: { href: match[0] } }],
    });
    last = index + match[0].length;
  }
  if (last < text.length) {
    nodes.push({ type: "text", text: text.slice(last) });
  }
  return nodes;
}

function paragraphsToDocument(paragraphs: string[]): TiptapDoc {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: paragraphToNodes(text),
    })),
  };
}

type SeedPost = {
  id: string;
  platforms: Platform[];
  tags?: string[];
  // Day of the month (1-based), relative to the month the room is created in.
  day: number;
  time: string;
  status: PostStatus;
  paragraphs: string[];
};

const BLOG = "https://liveblocks.io/blog";

/**
 * A month of posts about Liveblocks, each ending with the blog post it
 * announces so the calendar cards show the article's image.
 */
const SEED_POSTS: SeedPost[] = [
  {
    id: "post-liveblocks-sync",
    platforms: ["x", "bluesky", "linkedin"],
    tags: ["Launch"],
    day: 2,
    time: "15:00",
    status: "scheduled",
    paragraphs: [
      "Introducing Liveblocks Sync: the sync engine for the agentic web. Humans, agents, or both, editing the same document in realtime. Previously known as Storage, now with LiveText.",
      `${BLOG}/introducing-liveblocks-sync-the-sync-engine-for-the-agentic-web`,
    ],
  },
  {
    id: "post-livetext",
    platforms: ["x", "threads", "mastodon"],
    tags: ["Launch", "Engineering"],
    day: 6,
    time: "10:30",
    status: "approved",
    paragraphs: [
      "LiveText is a new data type for collaborative text editing. It works with Tiptap, BlockNote, ProseMirror, and CodeMirror, and lives in your room next to the rest of your data.",
      `${BLOG}/livetext-a-new-data-type-for-collaborative-text-editing`,
    ],
  },
  {
    id: "post-livefile",
    platforms: ["linkedin", "x"],
    tags: ["Product"],
    day: 11,
    time: "14:00",
    status: "in-review",
    paragraphs: [
      "Files are part of collaboration too. LiveFile lets you upload, store, and share files directly inside Liveblocks Storage, so images and attachments sync like the rest of the document.",
      `${BLOG}/livefile-upload-and-share-files-on-collaborative-apps`,
    ],
  },
  {
    id: "post-private-threads",
    platforms: ["linkedin", "threads", "bluesky"],
    tags: ["Product", "AI"],
    day: 17,
    time: "16:00",
    status: "scheduled",
    paragraphs: [
      "Comment threads can now be private to certain users: internal-only notes, private review workflows, and feedback only the right people can see. Plus, adding AI to a thread is easier than ever.",
      `${BLOG}/comments-private-threads-and-a-natural-home-for-ai`,
    ],
  },
  {
    id: "post-whats-new-october",
    platforms: ["x", "threads", "bluesky", "mastodon", "linkedin"],
    tags: ["Monthly"],
    day: 24,
    time: "09:00",
    status: "draft",
    paragraphs: [
      "What's new in Liveblocks: custom headers and test endpoints for webhooks, clearer analytics in the dashboard, and a new Slack-like messaging example built with Feeds.",
      `${BLOG}/whats-new-in-liveblocks-october-2026`,
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
        new LiveObject<PostLson>({
          id: post.id,
          platforms: post.platforms,
          tags: post.tags ?? [],
          date: toDateKey(addDays(monthStart, Math.min(post.day, lastDay) - 1)),
          time: post.time,
          status: post.status,
          preview: post.paragraphs.join(" "),
          linkUrl: findLastUrl(post.paragraphs.join(" ")) ?? undefined,
          createdAt: Date.now() + index,
          media: new LiveList([]),
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
