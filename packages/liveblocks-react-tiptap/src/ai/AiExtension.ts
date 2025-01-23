import { autoRetry, HttpError } from "@liveblocks/core";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type { CommandProps, Editor, Range } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  ySyncPluginKey,
  yXmlFragmentToProseMirrorFragment,
} from "y-prosemirror";
import type { Doc, Snapshot } from "yjs";
import {
  createDocFromSnapshot,
  emptySnapshot,
  equalSnapshots,
  snapshot as takeSnapshot,
} from "yjs";

import {
  AI_TOOLBAR_SELECTION_PLUGIN,
  type AiCommands,
  type AiExtensionOptions,
  type AiExtensionStorage,
  type AiToolbarOutput,
  type AiToolbarState,
  type LiveblocksExtensionStorage,
  type YSyncPluginState,
} from "../types";

const DEFAULT_AI_NAME = "AI";
export const DEFAULT_STATE: AiToolbarState = { phase: "closed" };

const RESOLVE_AI_PROMPT_RETRY_ATTEMPTS = 3;
const RESOLVE_AI_PROMPT_RETRY_DELAYS = [1000, 2000, 4000];

function getYjsBinding(editor: Editor) {
  return (ySyncPluginKey.getState(editor.view.state) as YSyncPluginState)
    .binding;
}

function getLiveblocksYjsProvider(editor: Editor) {
  return (
    editor.extensionStorage.liveblocksExtension as
      | LiveblocksExtensionStorage
      | undefined
  )?.provider as LiveblocksYjsProvider | undefined;
}

export function isAiToolbarDiffOutput(
  output: AiToolbarOutput
): output is Extract<AiToolbarOutput, { type: "modification" | "insert" }> {
  return output.type === "modification" || output.type === "insert";
}

function getRevertTransaction(
  tr: Transaction,
  editor: Editor,
  storage: AiExtensionStorage,
  doc?: Doc
): Transaction | null {
  if (storage.snapshot) {
    const binding = getYjsBinding(editor);

    if (binding) {
      binding.mapping.clear();

      const docFromSnapshot = createDocFromSnapshot(
        binding.doc,
        storage.snapshot
      );
      const type = docFromSnapshot.getXmlFragment("default"); // TODO: field
      const fragmentContent = yXmlFragmentToProseMirrorFragment(
        type,
        editor.state.schema
      );

      tr.setMeta("addToHistory", false);
      tr.replace(
        0,
        editor.state.doc.content.size,
        new Slice(Fragment.from(fragmentContent), 0, 0)
      );
      tr.setMeta(ySyncPluginKey, {
        snapshot: null,
        prevSnapshot: null,
      });

      if (doc) {
        doc.gc = true;
      }

      storage.snapshot = undefined;

      return tr;
    }
  }
  return null;
}

export const AiExtension = Extension.create<
  AiExtensionOptions,
  AiExtensionStorage
>({
  name: "liveblocksAi",
  addOptions() {
    return {
      doc: undefined,
      pud: undefined,

      // The actual default resolver is set in LiveblocksExtension via AiExtension.configure()
      resolveAiPrompt: () => Promise.reject(),
      name: DEFAULT_AI_NAME,
    };
  },
  addStorage() {
    return {
      state: DEFAULT_STATE,
      name: this.options.name,
    };
  },
  addCommands() {
    return {
      askAi: (prompt) => () => {
        if (typeof prompt === "string") {
          (
            this.editor.commands as unknown as AiCommands
          ).$startAiToolbarThinking(prompt);
        } else {
          (
            this.editor.commands as unknown as AiCommands
          ).$openAiToolbarAsking();
        }

        return true;
      },

      $acceptAiToolbarOutput:
        () =>
        ({ tr, view }: CommandProps) => {
          const currentState = this.storage.state;

          // 1. If NOT in "reviewing" phase, do nothing
          if (currentState.phase !== "reviewing") {
            return false;
          }

          // 2. Accept the output
          if (isAiToolbarDiffOutput(currentState.output)) {
            // 2.a. If the output is a diff, apply it definitely
            const binding = getYjsBinding(this.editor);
            if (!binding) {
              return false;
            }

            const fragmentContent = yXmlFragmentToProseMirrorFragment(
              binding.type,
              this.editor.state.schema
            );
            tr.setMeta("addToHistory", false);
            tr.replace(
              0,
              this.editor.state.doc.content.size,
              new Slice(Fragment.from(fragmentContent), 0, 0)
            );
            tr.setMeta(ySyncPluginKey, {
              snapshot: null,
              prevSnapshot: null,
            });

            this.storage.snapshot = undefined;
          } else {
            // 2.b. If the output is not a diff, insert it below the selection
            tr.insertText(
              currentState.output.text,
              // TODO: Insert below as a new paragraph?
              currentState.range.from,
              currentState.range.to
            );
            view.dispatch(tr);
          }

          getLiveblocksYjsProvider(this.editor)?.unpause();
          this.editor.setEditable(true);

          // 3. Set to "closed" phase
          this.storage.state = { phase: "closed" };

          return true;
        },

      // TODO: When should this be called? We already revert on close and on retry
      _revertAiToolbarOutputDiff:
        () =>
        ({ tr, view }: CommandProps) => {
          const revertTr = getRevertTransaction(
            tr,
            this.editor,
            this.storage,
            this.options.doc
          );
          if (revertTr) {
            view.dispatch(revertTr);
            getLiveblocksYjsProvider(this.editor)?.unpause();
            return true;
          }
          return false;
        },

      $closeAiToolbar:
        () =>
        ({ tr, view }: CommandProps) => {
          const currentState = this.storage.state;

          // 1. If in "thinking" phase, cancel the current AI request
          if (currentState.phase === "thinking") {
            currentState.abortController.abort();
          }

          // 2. If in "thinking" or "reviewing" phase, revert the editor if possible and unblock it
          if (
            currentState.phase === "thinking" ||
            currentState.phase === "reviewing"
          ) {
            // get the revert transaction and dispatch it
            const revertTr = getRevertTransaction(
              tr,
              this.editor,
              this.storage,
              this.options.doc
            );
            if (revertTr) {
              view.dispatch(revertTr);
              getLiveblocksYjsProvider(this.editor)?.unpause();
              this.editor.setEditable(true);
            }
          }

          // 4. Set to "closed" phase
          this.storage.state = { phase: "closed" };

          return true;
        },

      $openAiToolbarAsking: () => () => {
        const currentState = this.storage.state;

        // 1. If NOT in "closed" phase, do nothing
        if (currentState.phase !== "closed") {
          return false;
        }

        // 2. Blur the editor if needed
        if (this.editor.isFocused) {
          this.editor.commands.blur();
        }

        // 3. Set to "asking" phase
        this.storage.state = {
          phase: "asking",
          // Initialize the custom prompt as empty
          customPrompt: "",
        };

        return true;
      },

      $startAiToolbarThinking: (prompt: string) => () => {
        const currentState = this.storage.state;

        // 1. If in "thinking" phase already, do nothing
        if (currentState.phase === "thinking") {
          return false;
        }

        // 2. Blur the editor if needed
        if (this.editor.isFocused) {
          this.editor.commands.blur();
        }

        const abortController = new AbortController();
        const provider = getLiveblocksYjsProvider(this.editor);

        // 3. Set to "thinking" phase
        this.storage.state = {
          phase: "thinking",
          customPrompt: currentState.customPrompt ?? "",
          prompt,
          abortController,
        };

        // 4. Block the editor
        this.editor.setEditable(false);

        // 5. Start the AI request
        autoRetry(
          async () => {
            await provider?.pause();
            const { from, to } = this.editor.state.selection.empty
              ? {
                  // TODO: this is a hack to get the context around the selection, we need to improve this
                  from: Math.max(this.editor.state.selection.to - 30, 0),
                  to: this.editor.state.selection.to,
                }
              : this.editor.state.selection;

            return this.options.resolveAiPrompt({
              prompt,
              selectionText: this.editor.state.doc.textBetween(from, to, " "),
              /*
               TODO: This needs a maximum to avoid overloading context, for now I've arbitrailiry chosen 3000
               characters but this will need to be improved, probably using word boundary of some sort (languages can make that tricky)
               as well as choosing text around the selection, so before/after.
            */
              context: this.editor.getText().slice(0, 3_000),
              signal: abortController.signal,
            });
          },
          RESOLVE_AI_PROMPT_RETRY_ATTEMPTS,
          RESOLVE_AI_PROMPT_RETRY_DELAYS,

          (error) => {
            // Don't retry on 4xx errors or if the request was aborted
            return (
              abortController.signal.aborted ||
              (error instanceof HttpError &&
                error.status >= 400 &&
                error.status < 500)
            );
          }
        )
          .then((output) => {
            if (abortController.signal.aborted) {
              return;
            }

            // 5.a. If the AI request succeeds, set to "reviewing" phase with the output
            (
              this.editor.commands as unknown as AiCommands
            )._handleAiToolbarThinkingSuccess({
              type: output.type,
              text: output.content,
            });
          })
          .catch((error) => {
            if (abortController.signal.aborted) {
              return;
            }

            // 5.b. If the AI request fails, set to "asking" phase with error
            (
              this.editor.commands as unknown as AiCommands
            )._handleAiToolbarThinkingError(error);
          });

        return true;
      },

      $retryAiToolbarThinking:
        () =>
        ({ tr, view }: CommandProps) => {
          const currentState = this.storage.state;

          // 1. If NOT in "reviewing" phase, do nothing
          if (currentState.phase !== "reviewing") {
            return false;
          }

          const revertTr = getRevertTransaction(
            tr,
            this.editor,
            this.storage,
            this.options.doc
          );
          if (revertTr) {
            // important, in this scenario we do not unpause the provider
            view.dispatch(revertTr);
          }

          // 2. Start the AI request with the last prompt
          return (
            this.editor.commands as unknown as AiCommands
          ).$startAiToolbarThinking(currentState.prompt);
        },

      $cancelAiToolbarThinking: () => () => {
        const currentState = this.storage.state;

        // 1. If NOT in "thinking" phase, do nothing
        if (currentState.phase !== "thinking") {
          return false;
        }

        // 2. Cancel the current AI request
        currentState.abortController.abort();

        // 3. Unblock the editor
        this.editor.setEditable(true);

        // 4. Set to "asking" phase
        this.storage.state = {
          phase: "asking",
          // If the custom prompt is different than the prompt, reset it
          customPrompt:
            currentState.prompt === currentState.customPrompt
              ? currentState.customPrompt
              : "",
        };

        return true;
      },

      _showAiToolbarOutputDiff: () => () => {
        // The diff is applied right before moving to the "reviewing" phase
        if (this.storage.state.phase !== "reviewing") {
          return false;
        }

        if (!this.options.doc || !this.storage.snapshot) {
          return false;
        }

        const previousSnapshot: Snapshot =
          this.storage.snapshot ?? emptySnapshot;
        const currentSnapshot = takeSnapshot(this.options.doc);

        if (equalSnapshots(previousSnapshot, currentSnapshot)) {
          return true;
        }

        getYjsBinding(this.editor)?.renderSnapshot(
          currentSnapshot,
          previousSnapshot
        );

        return true;
      },

      _handleAiToolbarThinkingSuccess:
        (output: AiToolbarOutput) =>
        ({ commands, view, tr }: CommandProps) => {
          const currentState = this.storage.state;

          // 1. If NOT in "thinking" phase, do nothing
          if (currentState.phase !== "thinking") {
            return false;
          }

          let range: Range = this.editor.state.selection;

          // 2. If this is not a diff, the output will just be in the popup, set to "reviewing" phase with the output
          if (!isAiToolbarDiffOutput(output)) {
            this.storage.state = {
              phase: "reviewing",
              range,
              customPrompt: "",
              prompt: currentState.prompt,
              output,
            };

            return true;
          }

          if (!this.options.doc) {
            return false;
          }

          // 3. If the output is a diff, apply it to the editor
          this.options.doc.gc = false;
          this.storage.snapshot = takeSnapshot(this.options.doc);

          const { selection } = this.editor.state;

          // Update the range to take into account the diff
          range = {
            from: selection.from,
            // TODO: This isn't correct and the toolbar is not positioned correctly
            to:
              output.type === "insert"
                ? selection.to + output.text.length
                : selection.from + output.text.length,
          };

          // 4. Set to "reviewing" phase with the new range
          this.storage.state = {
            phase: "reviewing",
            range,
            customPrompt: "",
            prompt: currentState.prompt,
            output,
          };

          // 5. Insert the output
          tr.insertText(output.text, selection.from, selection.to);
          view.dispatch(tr);

          // 6. Show the diff
          (commands as unknown as AiCommands)._showAiToolbarOutputDiff();

          // We moved to the "reviewing" phase, so even if `_showAiToolbarOutputDiff`
          // returns `false` somehow, we still want to return `true`
          return true;
        },

      _handleAiToolbarThinkingError: (error: unknown) => () => {
        const currentState = this.storage.state;

        // 1. If NOT in "thinking" phase, do nothing
        if (currentState.phase !== "thinking") {
          return false;
        }

        // 2. Unblock the editor
        this.editor.setEditable(true);

        // 3. Log the error
        console.error(error);

        // 4. Set to "asking" phase with error
        this.storage.state = {
          phase: "asking",
          range: currentState.range,
          // If the custom prompt is different than the prompt, reset it
          customPrompt:
            currentState.prompt === currentState.customPrompt
              ? currentState.customPrompt
              : "",
          // Pass the error so it can be displayed
          error:
            error instanceof Error
              ? error
              : new Error(String(error), { cause: error }),
        };

        return true;
      },

      _updateAiToolbarCustomPrompt:
        (customPrompt: string | ((currentCustomPrompt: string) => string)) =>
        () => {
          const currentState = this.storage.state;

          // 1. If NOT in a phase with a custom prompt, do nothing
          if (typeof currentState.customPrompt !== "string") {
            return false;
          }

          // 2. Update the custom prompt
          this.storage.state.customPrompt =
            typeof customPrompt === "function"
              ? customPrompt(currentState.customPrompt)
              : customPrompt;

          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: AI_TOOLBAR_SELECTION_PLUGIN,
        props: {
          decorations: ({ doc, selection }) => {
            // Don't show the AI toolbar selection if the toolbar is closed or when reviewing diff outputs
            if (
              this.storage.state.phase === "closed" ||
              (this.storage.state.phase === "reviewing" &&
                isAiToolbarDiffOutput(this.storage.state.output))
            ) {
              return DecorationSet.create(doc, []);
            }

            const { from, to } = this.storage.state.range ?? selection;
            const decorations: Decoration[] = [
              Decoration.inline(from, to, {
                class: "lb-root lb-selection lb-tiptap-active-selection",
              }),
            ];

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
