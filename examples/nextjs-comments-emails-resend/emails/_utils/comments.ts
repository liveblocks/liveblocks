import type { CommentEmailAsReactData } from "@liveblocks/emails";
import { RoomInfo } from "../_lib/types";

const UNKNOWN_ROOM = "Unknown room" as const;

export type HeadlineParts = [string, string, string];

const getDisplayName = (author: CommentEmailAsReactData["author"]): string =>
  author.info.name;

const getRoomName = (roomName: RoomInfo["name"]): string =>
  roomName ?? UNKNOWN_ROOM;

const createMentionPreview = (authorName: string, roomName: string): string =>
  `${authorName} mentioned you in ${roomName}`;

const createRepliesPreview = (
  commentCount: number,
  authorName: string,
  roomName: string
): string =>
  commentCount === 1
    ? `${authorName} left a comment in ${roomName}`
    : `${commentCount} new comments in ${roomName}`;

export const getUnreadMentionPreviewText = (
  comment: CommentEmailAsReactData,
  roomName: RoomInfo["name"]
): string =>
  createMentionPreview(getDisplayName(comment.author), getRoomName(roomName));

export const getUnreadMentionHeadlineParts = (
  comment: CommentEmailAsReactData,
  roomName: RoomInfo["name"]
): HeadlineParts => [
  getDisplayName(comment.author),
  "mentioned you in",
  getRoomName(roomName),
];

export const getUnreadRepliesPreviewText = (
  comments: CommentEmailAsReactData[],
  roomName: RoomInfo["name"]
): string =>
  createRepliesPreview(
    comments.length,
    getDisplayName(comments[0].author),
    getRoomName(roomName)
  );

export const getUnreadRepliesHeadlineParts = (
  comments: CommentEmailAsReactData[],
  roomName: RoomInfo["name"]
): HeadlineParts => {
  const commentCount = comments.length;
  const displayRoomName = getRoomName(roomName);

  return commentCount === 1
    ? [getDisplayName(comments[0].author), "left a comment in", displayRoomName]
    : [`${commentCount} new comments`, "in", displayRoomName];
};
