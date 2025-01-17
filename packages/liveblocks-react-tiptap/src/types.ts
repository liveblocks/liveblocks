import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type { Content } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import type { DecorationSet } from "@tiptap/pm/view";
import type { ChainedCommands, SingleCommands } from "@tiptap/react";
import type { ProsemirrorMapping } from "y-prosemirror/dist/src/lib";
import type { Doc, PermanentUserData, Snapshot, XmlFragment } from "yjs";

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

export interface AiConfiguration {
  name?: string;
  resolveAiPrompt?: (prompt: string, selectionText: string) => Promise<string>;
}

export type LiveblocksExtensionOptions = {
  field?: string;
  comments?: boolean; // | CommentsConfiguration
  mentions?: boolean; // | MentionsConfiguration
  ai?: boolean | AiConfiguration;
  offlineSupport_experimental?: boolean;
  initialContent?: Content;
};

export type LiveblocksExtensionStorage = {
  unsubs: (() => void)[];
  doc: Doc;
  provider: LiveblocksYjsProvider<any, any, any, any, any>;
  permanentUserData: PermanentUserData;
};

export type CommentsExtensionStorage = {
  pendingComment: boolean;
};

export const enum ThreadPluginActions {
  SET_SELECTED_THREAD_ID = "SET_SELECTED_THREAD_ID",
}

export type AiExtensionOptions = {
  name: string;
  doc: Doc | undefined;
  pud: PermanentUserData | undefined;
  resolveAiPrompt: (prompt: string, selectionText: string) => Promise<string>;
};

export type AiExtensionStorage =
  | {
      state: "asking" | "thinking" | "reviewing";
      name: string;
      snapshot: Snapshot | undefined;
      prompt: string;
      previousPrompt: string | undefined;
    }
  | {
      state: "closed";
      name: string;
      snapshot: undefined;
      prompt: undefined;
      previousPrompt: undefined;
    };

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
  askAi: (prompt?: string, isContinue?: boolean) => ReturnType;
  /** @internal */
  acceptAi: () => ReturnType;
  /** @internal */
  cancelAskAi: () => ReturnType;
  /** @internal */
  retryAskAi: () => ReturnType;
  /** @internal */
  reviewAi: () => ReturnType;
  /** @internal */
  closeAi: () => ReturnType;
  /** @internal */
  setAiPrompt: (prompt: string | ((prompt: string) => string)) => ReturnType;
  /** @internal */
  applyPrompt: (result: string, isContinue: boolean) => ReturnType;
  /** @internal */
  compareSnapshot: (snapshot: Snapshot) => ReturnType;
};

// these types are not exported from y-prosemirror
export type YSyncBinding = {
  doc: Doc;
  type: XmlFragment;
  mapping: ProsemirrorMapping;
  mux: (fn: () => void) => void;
};

export type YSyncPluginState = {
  binding: YSyncBinding;
};
