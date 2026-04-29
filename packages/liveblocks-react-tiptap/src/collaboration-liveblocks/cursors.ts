import type { JsonObject } from "@liveblocks/client";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import type { LiveblocksTiptapRoom } from "./types";

const PRESENCE_KEY = "liveblocksTiptap";

type CursorUser = {
  name?: string;
  color?: string;
};

type CursorPresence = {
  field: string;
  anchor: number;
  head: number;
  user?: CursorUser;
};

type CollaborationCaretStorage = {
  users: { clientId: number; [key: string]: unknown }[];
};

type CollaborationCaretOptions = {
  room?: LiveblocksTiptapRoom;
  field: string;
  user: CursorUser;
};

export const LIVEBLOCKS_CARET_PLUGIN_KEY = new PluginKey<DecorationSet>(
  "liveblocks-collaboration-caret"
);

function isCursorPresence(value: unknown): value is CursorPresence {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { field?: unknown }).field === "string" &&
    typeof (value as { anchor?: unknown }).anchor === "number" &&
    typeof (value as { head?: unknown }).head === "number"
  );
}

function getCursorUser(value: unknown): CursorUser | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const user = value as { name?: unknown; color?: unknown };
  const name = typeof user.name === "string" ? user.name : undefined;
  const color = typeof user.color === "string" ? user.color : undefined;

  return name !== undefined || color !== undefined ? { name, color } : undefined;
}

function presencePatch(presence: CursorPresence): JsonObject {
  const user = getCursorUser(presence.user);

  return {
    [PRESENCE_KEY]: {
      field: presence.field,
      anchor: presence.anchor,
      head: presence.head,
      ...(user !== undefined ? { user } : {}),
    },
  };
}

function createCursorElement(user: CursorUser | undefined): HTMLElement {
  const color = user?.color ?? "#0f83ff";
  const name = user?.name ?? "Anonymous";
  const cursor = document.createElement("span");

  cursor.classList.add("collaboration-carets__caret");
  cursor.setAttribute("style", `border-color: ${color}`);

  const label = document.createElement("div");
  label.classList.add("collaboration-carets__label");
  label.setAttribute("style", `background-color: ${color}`);
  label.insertBefore(document.createTextNode(name), null);
  cursor.insertBefore(label, null);

  return cursor;
}

function clampPosition(position: number, view: EditorView): number {
  return Math.max(0, Math.min(position, view.state.doc.content.size));
}

function buildDecorations(
  room: LiveblocksTiptapRoom,
  field: string,
  view: EditorView
): DecorationSet {
  const decorations: Decoration[] = [];

  for (const other of room.getOthers()) {
    const rawPresence: unknown = other.presence[PRESENCE_KEY];
    if (!isCursorPresence(rawPresence) || rawPresence.field !== field) {
      continue;
    }

    const anchor = clampPosition(rawPresence.anchor, view);
    const head = clampPosition(rawPresence.head, view);
    const from = Math.min(anchor, head);
    const to = Math.max(anchor, head);
    const user = getCursorUser(rawPresence.user) ?? getCursorUser(other.info);
    const color = user?.color ?? "#0f83ff";

    if (from !== to) {
      decorations.push(
        Decoration.inline(from, to, {
          class: "collaboration-carets__selection",
          style: `background-color: ${color}33`,
        })
      );
    }

    decorations.push(
      Decoration.widget(head, () => createCursorElement(user), {
        key: `liveblocks-caret-${other.connectionId}`,
        side: -1,
      })
    );
  }

  return DecorationSet.create(view.state.doc, decorations);
}

function createLiveblocksCaretPlugin(
  options: CollaborationCaretOptions,
  storage: CollaborationCaretStorage
): Plugin {
  const room = options.room;
  if (room === undefined) {
    throw new Error("[Liveblocks] The Liveblocks caret plugin requires a room.");
  }

  let view: EditorView | undefined;
  let unsubscribe: (() => void) | undefined;

  const updatePresence = (nextView: EditorView) => {
    const { anchor, head } = nextView.state.selection;
    room.updatePresence(
      presencePatch({
        field: options.field,
        anchor,
        head,
        user: options.user,
      })
    );
  };

  const updateDecorations = () => {
    if (view === undefined) {
      return;
    }

    storage.users = room.getOthers().map((other) => {
      const rawPresence: unknown = other.presence[PRESENCE_KEY];
      const cursorPresence = isCursorPresence(rawPresence)
        ? rawPresence
        : undefined;

      return {
        clientId: other.connectionId,
        ...(getCursorUser(cursorPresence?.user) ?? getCursorUser(other.info)),
      };
    });

    view.dispatch(
      view.state.tr.setMeta(
        LIVEBLOCKS_CARET_PLUGIN_KEY,
        buildDecorations(room, options.field, view)
      )
    );
  };

  return new Plugin({
    key: LIVEBLOCKS_CARET_PLUGIN_KEY,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, decorations) {
        const nextDecorations = tr.getMeta(LIVEBLOCKS_CARET_PLUGIN_KEY) as
          | DecorationSet
          | undefined;

        if (nextDecorations !== undefined) {
          return nextDecorations;
        }

        return tr.docChanged ? decorations.map(tr.mapping, tr.doc) : decorations;
      },
    },
    props: {
      decorations(state) {
        return LIVEBLOCKS_CARET_PLUGIN_KEY.getState(state) ?? DecorationSet.empty;
      },
    },
    view(editorView) {
      view = editorView;
      updatePresence(editorView);
      updateDecorations();
      unsubscribe = room.events.others.subscribe(updateDecorations);

      return {
        update(nextView, prevState) {
          view = nextView;

          if (
            !nextView.state.selection.eq(prevState.selection) ||
            nextView.state.doc !== prevState.doc
          ) {
            updatePresence(nextView);
          }
        },
        destroy() {
          unsubscribe?.();
          unsubscribe = undefined;
          view = undefined;
          room.updatePresence({ [PRESENCE_KEY]: null });
        },
      };
    },
  });
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    collaborationCaret: {
      updateUser: (attributes: Record<string, unknown>) => ReturnType;
      user: (attributes: Record<string, unknown>) => ReturnType;
    };
  }
}

export const LiveblocksCollaborationCaret = Extension.create<
  CollaborationCaretOptions,
  CollaborationCaretStorage
>({
  name: "collaborationCaret",
  priority: 999,

  addOptions() {
    return {
      room: undefined,
      field: "default",
      user: {
        name: undefined,
        color: undefined,
      },
    };
  },

  addStorage() {
    return {
      users: [],
    };
  },

  addCommands() {
    return {
      updateUser:
        (attributes) =>
        ({ editor }) => {
          const nextUser = getCursorUser({
            ...this.options.user,
            name:
              typeof attributes.name === "string"
                ? attributes.name
                : this.options.user.name,
            color:
              typeof attributes.color === "string"
                ? attributes.color
                : this.options.user.color,
          }) ?? {};

          if (
            nextUser.name === this.options.user.name &&
            nextUser.color === this.options.user.color
          ) {
            return true;
          }

          this.options.user = nextUser;

          if (this.options.room !== undefined) {
            const { anchor, head } = editor.state.selection;
            this.options.room.updatePresence(
              presencePatch({
                field: this.options.field,
                anchor,
                head,
                user: this.options.user,
              })
            );
          }
          return true;
        },
      user:
        (attributes) =>
        ({ editor }) => {
          return editor.commands.updateUser(attributes);
        },
    };
  },

  addProseMirrorPlugins() {
    return [createLiveblocksCaretPlugin(this.options, this.storage)];
  },
});
