import {
  type CollaborationCaretOptions,
  type CollaborationCaretStorage,
  createLiveblocksCollaborationCaretPlugin,
  getCursorUser,
  LIVEBLOCKS_CARET_PLUGIN_KEY,
  presencePatch,
} from "@liveblocks/prosemirror";
import { Extension } from "@tiptap/core";

export { LIVEBLOCKS_CARET_PLUGIN_KEY };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    collaborationCaret: {
      updateUser: (attributes: Record<string, any>) => ReturnType;
      user: (attributes: Record<string, any>) => ReturnType;
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
          const nextUser =
            getCursorUser({
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
    return [
      createLiveblocksCollaborationCaretPlugin(this.options, this.storage),
    ];
  },
});
