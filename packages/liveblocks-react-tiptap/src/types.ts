import type {
  ContextualPromptContext,
  ContextualPromptResponse,
  Relax,
} from "@liveblocks/core";
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

export const LIVEBLOCKS_MENTION_EXTENSION = "liveblocksMentionExt";
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

/**
 * @beta
 */
export type ResolveContextualPromptArgs = {
  /**
   * The prompt being requested by the user.
   */
  prompt: string;

  /**
   * The context of the document and its current selection.
   */
  context: ContextualPromptContext;

  /**
   * The previous request and its response, if this is a follow-up request.
   */
  previous?: {
    prompt: string;
    response: ContextualPromptResponse;
  };

  /**
   * An abort signal that can be used to cancel requests.
   */
  signal: AbortSignal;
};

/**
 * @beta
 */
export type ResolveContextualPromptResponse = ContextualPromptResponse;

export interface AiConfiguration {
  /**
   * The AI's name. ("Ask {name} anything…", "{name} is thinking…", etc)
   */
  name?: string;

  /**
   * A function that returns an a response to a contextual prompt.
   */
  resolveContextualPrompt?: (
    args: ResolveContextualPromptArgs
  ) => Promise<ContextualPromptResponse>;
}

export type LiveblocksExtensionOptions = {
  field?: string;
  comments?: boolean; // | CommentsConfiguration
  mentions?: boolean; // | MentionsConfiguration
  ai?: boolean | AiConfiguration;
  offlineSupport_experimental?: boolean;
  initialContent?: Content;
  enablePermanentUserData?: boolean;
};

export type LiveblocksExtensionStorage = {
  unsubs: (() => void)[];
  doc: Doc;
  provider: LiveblocksYjsProvider;
  permanentUserData?: PermanentUserData;
};

export type CommentsExtensionStorage = {
  pendingComment: boolean;
};

export const enum ThreadPluginActions {
  SET_SELECTED_THREAD_ID = "SET_SELECTED_THREAD_ID",
}

export type AiExtensionOptions = Required<
  Pick<AiConfiguration, "name" | "resolveContextualPrompt">
> & {
  doc: Doc | undefined;
  pud: PermanentUserData | undefined;
};

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
 *           ▲ ◇ ◇                           ▲ ▲ ◇ ▲                          ▲ ◇                             ▲ ◇ ◇
 *           │ │ └───$openAiToolbarAsking()──┘ │ │ └ ─ ─ ─ ─ ─ ─⚠─ ─ ─ ─ ─ ─ ─│─├── ─ ─ ─ ─ ─ ─✓─ ─ ─ ─ ─ ─ ─ ┘ │ │
 *           │ │                               │ ▼                            │ │                               │ │
 *           │ └─────────────────$startAiToolbarThinking(prompt)──────────────┘ │                               │ │
 *           │                                 │ ▲                              │                               │ │
 *           │                                 │ └──────────────────────────────┼───────────────────────────────┘ │
 *           │                                 │                                │                                 │
 *           │                                 └───$cancelAiToolbarThinking()───┘                                 │
 *           │                                                                                                    │
 *           └─────────────────────────────────────$acceptAiToolbarResponse()─────────────────────────────────────┘
 *
 */
export type AiToolbarState = Relax<
  | {
      phase: "closed";
    }
  | {
      phase: "asking";

      /**
       * The selection stored when opening the AI toolbar.
       */
      initialSelection: Range;

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
       * The selection stored when opening the AI toolbar.
       */
      initialSelection: Range;

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

      /**
       * The previous response if this "thinking" phase is a refinement.
       */
      previousResponse?: ContextualPromptResponse;
    }
  | {
      phase: "reviewing";

      /**
       * The selection stored when opening the AI toolbar.
       */
      initialSelection: Range;

      /**
       * The custom prompt being written in the toolbar.
       */
      customPrompt: string;

      /**
       * The prompt sent to the AI.
       */
      prompt: string;

      /**
       * The response of the AI request.
       */
      response: ContextualPromptResponse;
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
   * Accept the current AI response and close the AI toolbar.
   */
  $acceptAiToolbarResponse: () => ReturnType;

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
  $startAiToolbarThinking: (
    prompt: string,
    withPreviousResponse?: boolean
  ) => ReturnType;

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
  _showAiToolbarReviewingDiff: () => ReturnType;

  /**
   * @internal
   *
   * Handle the success of the current "thinking" phase.
   */
  _handleAiToolbarThinkingSuccess: (
    response: ContextualPromptResponse
  ) => ReturnType;

  /**
   * @internal
   *
   * Handle an error of the current "thinking" phase.
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
