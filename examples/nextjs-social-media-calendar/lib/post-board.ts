import {
  createChange,
  createTransfer,
  definePrimitive,
  type ChangeDetails,
  type TransferDraft,
  type TransferLists,
  type TransferReason,
} from "@ui-sdk/core";

/** What moved, from where to where, alongside the usual change details. */
export type PostBoardMove = {
  key: string;
  from: string;
  to: string;
  index: number;
};

export type PostBoardOptions = {
  /** Every day's post ids, in order, by day (`YYYY-MM-DD`). */
  lists: TransferLists;
  /** Runs when a post wants to land in a day. `details.to` is the new day. */
  onListsChange?: (
    lists: TransferLists,
    details: ChangeDetails<TransferReason> & PostBoardMove
  ) => void;
  /** The days in the order Left and Right travel through them. */
  order?: string[];
  /** What screen readers call a post, like "Instagram post at 9:00 AM". */
  postLabel?: (postId: string) => string | undefined;
  /** What screen readers call a day, like "Monday, November 16". */
  dayLabel?: (day: string) => string | undefined;
};

type PostBoardState = {
  lists: TransferLists;
  moving: TransferDraft | null;
};

/** Whether the post being moved is currently in `day`. */
function isOver(state: PostBoardState, day: string, lists: TransferLists) {
  return state.moving !== null && (lists[day] ?? []).includes(state.moving.key);
}

/**
 * A board of days holding posts, where a post can be dragged to another day
 * or moved there with the keyboard. Built on ui-sdk core's `createTransfer`,
 * so pointer drags, keyboard moves, auto-scroll and announcements come with
 * it; the calendar only renders what `lists(state)` says.
 */
export const postBoard = definePrimitive({
  name: "post-board",
  options: {
    lists: "value",
    onListsChange: "callback",
    order: "value",
    postLabel: "value",
    dayLabel: "value",
  },
  controlled: ["lists"],
  state: (options: PostBoardOptions): PostBoardState => ({
    lists: options.lists,
    moving: null,
  }),
  sync: (options) =>
    options.lists === undefined ? {} : { lists: options.lists },
  api: (context) => {
    const change = createChange(context);
    const transfer = createTransfer(context, {
      key: "lists",
      draft: "moving",
      set: (value, details) => change("lists", value, details),
      order: () =>
        context.options().order ?? Object.keys(context.store.get().lists),
      label: (key) => context.options().postLabel?.(key),
      listLabel: (list) => context.options().dayLabel?.(list),
    });

    return {
      transfer,
      /** Moves a post to a day at once, like an agent would. */
      move: (postId: string, day: string, index = 0) =>
        transfer.move(postId, day, index),
    };
  },
  slots: (slot) => ({
    root: slot({}),
    day: slot<
      { value: string },
      { posts: string[]; over: boolean; moving: boolean }
    >({
      props: { value: "string" },
      // What the day holds right now: the draft while a post moves, so the
      // moving post renders in the day it hovers, else the committed lists.
      // `moving` is true while any post is being moved, so days can hide
      // affordances that would get in the way of a drop.
      state: (state, part) => ({
        posts: part.api.transfer.lists(state)[part.key] ?? [],
        over: isOver(state, part.key, part.api.transfer.lists(state)),
        moving: state.moving !== null,
      }),
      attrs: (state, part) => ({
        "data-over": isOver(state, part.key, part.api.transfer.lists(state))
          ? ""
          : undefined,
      }),
      bind: (el, part) => part.api.transfer.bindList(el, part.key),
    }),
    post: slot<{ value: string }, { moving: boolean; dragging: boolean }>({
      props: { value: "string" },
      state: (state, part) => ({
        moving: part.api.transfer.moving(state, part.key),
        dragging: part.api.transfer.dragging(state, part.key),
      }),
      attrs: (state, part) => ({
        "data-moving": part.api.transfer.moving(state, part.key)
          ? ""
          : undefined,
        "data-dragging": part.api.transfer.dragging(state, part.key)
          ? ""
          : undefined,
      }),
      on: {
        // A drag starts anywhere on the card once the pointer moves a few
        // pixels; a plain click stays a click and the one that ends a drag
        // is swallowed, so the card can be a link.
        pointerdown: (event, { api, key }) =>
          api.transfer.pointerdown(event, key),
        // Picking a post up starts from its handle. Once it's up, the keys
        // keep working with focus on the card too.
        keydown: (event, { api, store, key }) => {
          if (api.transfer.moving(store.get(), key)) {
            api.transfer.keydown(event, key);
          }
        },
      },
      bind: (el, part) => part.api.transfer.bindItem(el, part.key),
    }),
    // Picks the post with the same `value` up with the keyboard. It sits
    // beside the card rather than inside it, since the card is a link and a
    // button can't be nested in one.
    handle: slot<{ value: string }>({
      props: { value: "string" },
      attrs: () => ({ type: "button" }),
      on: {
        keydown: (event, { api, key }) => {
          api.transfer.keydown(event, key);
        },
      },
      // Moving a post to another day re-renders it there. Keep keyboard
      // focus on the handle so the next arrow key still moves the post.
      bind: (el, part) => {
        const state = part.store.get();
        if (state.moving?.key === part.key && !state.moving.pointer) {
          el.focus();
        }
      },
    }),
  }),
  agent: { actions: ["move"] },
});
