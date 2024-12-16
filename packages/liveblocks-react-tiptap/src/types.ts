import type { TextSelection } from "@tiptap/pm/state";
import { PluginKey } from "@tiptap/pm/state";
import type { DecorationSet } from "@tiptap/pm/view";
import type { ChainedCommands, SingleCommands } from "@tiptap/react";

export const LIVEBLOCKS_MENTION_KEY = new PluginKey("lb-plugin-mention");
export const LIVEBLOCKS_MENTION_PASTE_KEY = new PluginKey(
  "lb-plugin-mention-paste"
);
export const LIVEBLOCKS_MENTION_NOTIFIER_KEY = new PluginKey(
  "lb-plugin-mention-notify"
);
export const LIVEBLOCKS_MENTION_TYPE = "liveblocksMention";

export const THREADS_ACTIVE_SELECTION_PLUGIN = new PluginKey(
  "lb-threads-active-selection-plugin"
);
export const THREADS_PLUGIN_KEY = new PluginKey<ThreadPluginState>(
  "lb-threads-plugin"
);
export const AI_TOOLBAR_SELECTION_PLUGIN = new PluginKey(
  "lb-ai-toolbar-selection-plugin"
);

export const LIVEBLOCKS_COMMENT_MARK_TYPE = "liveblocksCommentMark";

export type CommentsExtensionStorage = {
  pendingCommentSelection: TextSelection | null;
};

export const enum ThreadPluginActions {
  SET_SELECTED_THREAD_ID = "SET_SELECTED_THREAD_ID",
}

export type AiToolbarState =
  | {
      type: "closed";
      selection: null;
    }
  | {
      type: "asking";
      selection: TextSelection;
      prompt: string;
    }
  | {
      type: "thinking";
      selection: TextSelection;
      prompt: string;
    }
  | {
      type: "reviewing";
      selection: TextSelection;
      prompt: string;
    };

export type AiToolbarExtensionStorage = {
  state: AiToolbarState;
};

export type LiveblocksExtensionStorage = AiToolbarExtensionStorage &
  CommentsExtensionStorage;

export type ThreadPluginState = {
  threadPositions: Map<string, { from: number; to: number }>;
  selectedThreadId: string | null;
  selectedThreadPos: number | null;
  decorations: DecorationSet;
};

export type FloatingPosition = "top" | "bottom";

export type ExtendedCommands<
  T extends string,
  A extends any[] = [],
> = SingleCommands & Record<T, (...args: A) => boolean>;

export type ExtendedChainedCommands<
  T extends string,
  A extends any[] = [],
> = ChainedCommands & Record<T, (...args: A) => ChainedCommands>;

export type CommentsCommands<ReturnType> = {
  /**
   * Add a comment
   */
  addComment: (id: string) => ReturnType;
  selectThread: (id: string | null) => ReturnType;
  addPendingComment: () => ReturnType;
  /** @internal */
  closePendingComment: () => ReturnType;
};

export type AiCommands<ReturnType> = {
  askAi: (prompt?: string) => ReturnType;
  /** @internal */
  closeAi: () => ReturnType;
  /** @internal */
  setAiPrompt: (
    prompt: string | ((previousPrompt: string) => string)
  ) => ReturnType;
};
