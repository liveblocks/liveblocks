"use client";

import { createParts } from "@ui-sdk/react/primitive";
import { postBoard } from "@/lib/post-board";

/**
 * React parts for the `postBoard` primitive. `PostBoard` holds the lists and
 * the move in progress; each `PostBoardDay` is a drop target (`value` = day
 * key), each `PostBoardPost` a draggable card (`value` = post id), and
 * `PostBoardHandle` inside a card picks it up with the keyboard.
 */
const {
  Root: PostBoard,
  Day: PostBoardDay,
  Post: PostBoardPost,
  Handle: PostBoardHandle,
} = createParts(postBoard, {
  root: "div",
  day: "div",
  post: "div",
  handle: "button",
});

export { PostBoard, PostBoardDay, PostBoardPost, PostBoardHandle };
