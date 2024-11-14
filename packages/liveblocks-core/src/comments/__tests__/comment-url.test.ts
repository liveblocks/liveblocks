import { nanoid } from "../../lib/nanoid";
import { generateCommentUrl } from "../comment-url";

const generateCommentId = (): string => "cm_" + nanoid();

const ROOM_URL = "https://liveblocks.io/?room_name=supabase";

describe("generateCommentUrl", () => {
  test("should return an absolute URL", () => {
    const commentId = generateCommentId();
    const expected = `${ROOM_URL}#${commentId}`;

    expect(generateCommentUrl({ roomUrl: ROOM_URL, commentId })).toBe(expected);
  });

  test("should return a relative URL with the commentId as hash", () => {
    const roomUrl = "/lb/room/vercel";
    const commentId = generateCommentId();

    const expected = `/lb/room/vercel#${commentId}`;
    expect(generateCommentUrl({ roomUrl, commentId })).toBe(expected);
  });

  test("should correctly handle relative URLs with the commentId as hash", () => {
    const roomUrl = "lb/room/vercel";
    const commentId = generateCommentId();

    expect(generateCommentUrl({ roomUrl, commentId })).toBe(
      `/lb/room/vercel#${commentId}`
    );
  });

  test("should overwrite existing hash in the URL with the commentId", () => {
    const commentId = generateCommentId();
    const roomUrl = `${ROOM_URL}#existingHash`;

    const expected = `${ROOM_URL}#${commentId}`;
    expect(generateCommentUrl({ roomUrl, commentId })).toBe(expected);
  });
});
