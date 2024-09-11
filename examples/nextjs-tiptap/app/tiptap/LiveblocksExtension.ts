import { useRoom } from "@liveblocks/react";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { Extension, mergeAttributes, Mark } from "@tiptap/core";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Doc } from "yjs";

const providersMap = new Map<
  string,
  LiveblocksYjsProvider<any, any, any, any, any>
>();

const docMap = new Map<string, Doc>();

type LiveblocksExtensionOptions = {
  field?: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comments: {
      /**
       * Add a comment
       */
      addComment: () => ReturnType;
    };
  }
}

const Comment = Mark.create({
  name: "lb-comment",
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    // Return an object with attribute configuration
    return {
      comment_id: {
        parseHTML: (element) => element.getAttribute("data-lb-comment-id"),
        renderHTML: (attributes) => {
          return {
            "data-lb-comment-id": attributes.comment_id,
          };
        },
        default: "unset",
      },
    };
  },
  addCommands() {
    return {
      addComment:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name, { comment_id: "123" });
        },
    };
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    const elem = document.createElement("span");

    Object.entries(
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
    ).forEach(([attr, val]) => elem.setAttribute(attr, val));
    elem.classList.add("lb-comment");
    elem.addEventListener("click", () => {
      // elem.getAttribute("data-lb-comment-id")
    });

    return elem;
  },
});

const LiveblocksCollab = Collaboration.extend({
  // Override the onCreate method to warn users about potential misconfigurations
  onCreate() {
    if (
      !this.editor.extensionManager.extensions.find((e) => e.name === "doc")
    ) {
      console.warn(
        "[Liveblocks] The tiptap document extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }
    if (
      !this.editor.extensionManager.extensions.find(
        (e) => e.name === "paragraph"
      )
    ) {
      console.warn(
        "[Liveblocks] The tiptap paragraph extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }

    if (
      !this.editor.extensionManager.extensions.find((e) => e.name === "text")
    ) {
      console.warn(
        "[Liveblocks] The tiptap text extension is required for Liveblocks collaboration. Please add it or use Tiptap StarterKit extension."
      );
    }
    if (
      this.editor.extensionManager.extensions.find((e) => e.name === "history")
    ) {
      console.warn(
        "[Liveblocks] The history extension is enabled, Liveblocks extension provides its own. Please remove or disable the History plugin to prevent unwanted conflicts."
      );
    }
  },
});

// TODO: move options to `addOptions` of the extension itself
export const useLiveblocksExtension = ({
  field,
}: LiveblocksExtensionOptions = {}): Extension => {
  const room = useRoom();

  return Extension.create({
    name: "liveblocksExtension",
    onSelectionUpdate() {
      console.log(this.editor.state.selection);
    },
    onCreate() {
      const self = room.getSelf();
      if (self?.info) {
        this.editor.commands.updateUser({
          name: self.info.name,
          color: self.info.color,
        });
      }
      this.storage.unsub = room.events.self.subscribe(({ info }) => {
        // TODO: maybe we need a deep compare here so other info can be provided
        const { name, color } = info;
        const { user } = this.storage.provider.awareness.getLocalState();
        if (name != user.name || color != user.color) {
          this.editor.commands.updateUser({ name, color });
        }
      });
    },
    onDestroy() {
      this.storage.unsub();
    },
    addStorage() {
      if (!providersMap.has(room.id)) {
        const doc = new Doc();
        docMap.set(room.id, doc);
        providersMap.set(room.id, new LiveblocksYjsProvider(room as any, doc));
      }
      return {
        doc: docMap.get(room.id),
        provider: providersMap.get(room.id),
        unsub: () => {},
      };
    },
    addExtensions() {
      const options = field !== undefined ? { field } : {};
      return [
        Comment,
        LiveblocksCollab.configure({
          document: this.storage.doc,
          ...options,
        }),
        CollaborationCursor.configure({
          provider: this.storage.provider, //todo change the ! to an assert
        }),
      ];
    },
  });
};
