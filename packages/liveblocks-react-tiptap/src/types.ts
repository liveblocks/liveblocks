import type { Relax } from "@liveblocks/core";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type { Content, Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import type { DecorationSet } from "@tiptap/pm/view";
import type { ChainedCommands, SingleCommands } from "@tiptap/react";
import type { ProsemirrorBinding } from "y-prosemirror";
import type { Doc, PermanentUserData, Snapshot } from "yjs";

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

export type ResolveAiPromptArgs = {
  prompt: string;

  // TODO: Rename `selectionText` to `text` (when refining it's not a selection)
  selectionText: string;
  context: string;
  signal: AbortSignal;
};

export interface AiConfiguration {
  name?: string;
  resolveAiPrompt?: (args: ResolveAiPromptArgs) => Promise<AiResponse>;
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
  doc: Doc | undefined;
  pud: PermanentUserData | undefined;
  name: string;
  resolveAiPrompt: (args: ResolveAiPromptArgs) => Promise<AiResponse>;
};

export type AiToolbarOutput = Relax<
  | {
      // TODO: Rename to "replace"?
      type: "modification";
      text: string;
    }
  | {
      type: "insert";
      text: string;
    }
  | {
      type: "other";
      text: string;
    }
>;

/**
 * The state of the AI toolbar.
 *
 *                             ┌────────────────────────────────────────────────────────────────────────────────┐
 *                             │                                                                                │
 *                             │ ┌──────────────────────────────────────────────┐                               │
 *                             ▼ ▼                                              │                               │
 *              ┌───────$closeAiToolbar()───────┐                               │                               │
 *              ▼                               ◇                               ◇                               ◇
 *  ┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐       ┌───────────────────────┐
 *  │        CLOSED         │       │        ASKING         │       │       THINKING        │       │       REVIEWING       │
 *  └───────────────────────┘       └───────────────────────┘       └───────────────────────┘       └───────────────────────┘
 *           ▲ ◇ ◇                           ▲ ▲ ◇ ▲                          ▲ ◇                             ▲ ◇ ◇ ◇
 *           │ │ └───$openAiToolbarAsking()──┘ │ │ └ ─ ─ ─ ─ ─ ─⚠─ ─ ─ ─ ─ ─ ─│─├── ─ ─ ─ ─ ─ ─✓─ ─ ─ ─ ─ ─ ─ ┘ │ │ │
 *           │ │                               │ ▼                            │ │                               │ │ │
 *           │ └─────────────────$startAiToolbarThinking(prompt)──────────────┘ │                               │ │ │
 *           │                                 │ ▲ ▲                            │                               │ │ │
 *           │                                 │ │ └────────────────────────────┼───────────────────────────────┘ │ │
 *           │                                 │ │                              │                                 │ │
 *           │                                 │ └───────────────────$retryAiToolbarThinking()────────────────────┘ │
 *           │                                 │                                │                                   │
 *           │                                 └───$cancelAiToolbarThinking()───┘                                   │
 *           │                                                                                                      │
 *           └───────────────────────────────────────$acceptAiToolbarOutput()───────────────────────────────────────┘
 *
 */
export type AiToolbarState = Relax<
  | {
      phase: "closed";
    }
  | {
      phase: "asking";

      /**
       * The custom prompt being written in the toolbar.
       */
      customPrompt: string;

      /**
       * A potential error that occurred during the last AI request.
       */
      error?: Error;
    }
  | {
      phase: "thinking";

      /**
       * The custom prompt being written in the toolbar.
       */
      customPrompt: string;

      /**
       * An abort controller to cancel the AI request.
       */
      abortController: AbortController;

      /**
       * The prompt sent to the AI.
       */
      prompt: string;
    }
  | {
      phase: "reviewing";

      /**
       * The range which the toolbar is attached to.
       * Because of diffs, the range could be different than the original selection.
       */
      range: Range;

      /**
       * The custom prompt being written in the toolbar.
       */
      customPrompt: string;

      /**
       * The prompt sent to the AI.
       */
      prompt: string;

      /**
       * The output of the AI request.
       */
      output: AiToolbarOutput;
    }
>;

export type AiExtensionStorage = {
  name: string;
  state: AiToolbarState;
  snapshot?: Snapshot;
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

export type ChainedAiCommands = ChainedCommands & {
  [K in keyof AiCommands]: (
    ...args: Parameters<AiCommands[K]>
  ) => ChainedCommands;
};

export type CommentsCommands<ReturnType = boolean> = {
  /**
   * Add a comment
   */
  addComment: (id: string) => ReturnType;
  selectThread: (id: string | null) => ReturnType;
  addPendingComment: () => ReturnType;

  /** @internal */
  closePendingComment: () => ReturnType;
};

export type AiCommands<ReturnType = boolean> = {
  askAi: (prompt?: string) => ReturnType;

  // Transitions (see AiToolbarState)

  /**
   * @internal
   * @transition
   *
   * Close the AI toolbar.
   */
  $closeAiToolbar: () => ReturnType;

  /**
   * @internal
   * @transition
   *
   * Accept the current AI output and close the AI toolbar.
   */
  $acceptAiToolbarOutput: () => ReturnType;

  /**
   * @internal
   * @transition
   *
   * Open the AI toolbar in the "asking" phase.
   */
  $openAiToolbarAsking: () => ReturnType;

  /**
   * @internal
   * @transition
   *
   * Set (and open if not already open) the AI toolbar in the "thinking" phase with the given prompt.
   */
  $startAiToolbarThinking: (prompt: string) => ReturnType;

  /**
   * @internal
   * @transition
   *
   * Retry the last prompt while going back to the "thinking" phase.
   */
  $retryAiToolbarThinking: () => ReturnType;

  /**
   * @internal
   * @transition
   *
   * Cancel the current "thinking" phase, going back to the "asking" phase.
   */
  $cancelAiToolbarThinking: () => ReturnType;

  // Other

  /**
   * @internal
   *
   * Show the diff of the current "reviewing" phase.
   */
  _showAiToolbarOutputDiff: () => ReturnType;

  /**
   * @internal
   *
   * Revert a diff that was applied to the editor.
   */
  _revertAiToolbarOutputDiff: () => ReturnType;

  /**
   * @internal
   *
   * Handle the success of the current "thinking" phase.
   *
   * This should be handled in $startAiToolbarThinking directly (.then(success).catch(error))
   * but storage updates don't trigger their listeners if not called from a command.
   */
  _handleAiToolbarThinkingSuccess: (output: AiToolbarOutput) => ReturnType;

  /**
   * @internal
   *
   * Handle an error of the current "thinking" phase.
   *
   * This should be handled in $startAiToolbarThinking directly (.then(success).catch(error))
   * but storage updates don't trigger their listeners if not called from a command.
   */
  _handleAiToolbarThinkingError: (error: unknown) => ReturnType;

  /**
   * @internal
   *
   * Update the current custom AI prompt.
   */
  _updateAiToolbarCustomPrompt: (
    customPrompt: string | ((currentCustomPrompt: string) => string)
  ) => ReturnType;
};

export type YSyncPluginState = {
  binding: ProsemirrorBinding;
};

export type AiResponse = {
  type: "insert" | "modification" | "other";
  content: string;
};
