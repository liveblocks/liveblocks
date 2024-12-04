import type { TextSelection } from "@tiptap/pm/state";
import { PluginKey } from "@tiptap/pm/state";
import type { DecorationSet } from "@tiptap/pm/view";
import type { ChainedCommands } from "@tiptap/react";

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
export const AI_ACTIVE_SELECTION_PLUGIN = new PluginKey(
  "lb-ai-active-selection-plugin"
);

export const LIVEBLOCKS_COMMENT_MARK_TYPE = "liveblocksCommentMark";

export type CommentsExtensionStorage = {
  pendingCommentSelection: TextSelection | null;
};

export const enum ThreadPluginActions {
  SET_SELECTED_THREAD_ID = "SET_SELECTED_THREAD_ID",
}

export type AiExtensionStorage = {
  askAiSelection: TextSelection | null;
};

export type LiveblocksExtensionStorage = AiExtensionStorage &
  CommentsExtensionStorage;

export type ThreadPluginState = {
  threadPositions: Map<string, { from: number; to: number }>;
  selectedThreadId: string | null;
  selectedThreadPos: number | null;
  decorations: DecorationSet;
};

export type FloatingPosition = "top" | "bottom";

export type ExtendedChainedCommands<
  T extends string,
  A extends any[] = [],
> = ChainedCommands & Record<T, (...args: A) => ChainedCommands>;
