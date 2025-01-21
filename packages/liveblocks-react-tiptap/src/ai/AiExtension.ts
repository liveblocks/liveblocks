import { autoRetry, HttpError } from "@liveblocks/core";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type { CommandProps, Editor } from "@tiptap/core";
import { Extension } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  ySyncPluginKey,
  yXmlFragmentToProseMirrorFragment,
} from "y-prosemirror";
import type { Snapshot } from "yjs";
import {
  createDocFromSnapshot,
  emptySnapshot,
  equalSnapshots,
  snapshot,
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
        ({ tr }: CommandProps) => {
          const currentState = this.storage.state;
          if (currentState.phase !== "reviewing") {
            return false;
          }
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

          // TODO: move this cleanup to somewhere that closeAIToolbar can share
          getLiveblocksYjsProvider(this.editor)?.unpause();
          this.editor.setEditable(true);
          this.storage.snapshot = undefined;
          this.storage.state = { phase: "closed" };
          return true;
        },

      $closeAiToolbar:
        () =>
        ({ tr }: CommandProps) => {
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
            if (this.storage.snapshot) {
              const binding = getYjsBinding(this.editor);

              if (binding) {
                binding.mapping.clear();

                const docFromSnapshot = createDocFromSnapshot(
                  binding.doc,
                  this.storage.snapshot
                );
                const type = docFromSnapshot.getXmlFragment("default"); // TODO: field
                const fragmentContent = yXmlFragmentToProseMirrorFragment(
                  type,
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

                getLiveblocksYjsProvider(this.editor)?.unpause();

                if (this.options.doc) {
                  this.options.doc.gc = true;
                }

                this.storage.snapshot = undefined;
              }
            }

            this.editor.setEditable(true);
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

        if (currentState.phase === "reviewing") {
          // TODO: this is a retry, we should actually retry and start thinking again
          //       Maybe not, it could be a refinement prompt
          return (
            this.editor.commands as unknown as AiCommands
          ).$closeAiToolbar();
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
            )._handleAiToolbarThinkingError(error as Error);
          });

        return true;
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

      _handleAiToolbarThinkingSuccess: (output: AiToolbarOutput) => () => {
        const currentState = this.storage.state;

        // 1. If NOT in "thinking" phase, do nothing
        if (currentState.phase !== "thinking" || !this.options.doc) {
          return false;
        }

        let selection: { from: number; to: number } =
          this.editor.state.selection;

        // 2. If the output is a diff, apply it to the editor
        if (["modification", "insert"].includes(output.type)) {
          this.options.doc.gc = false;
          this.storage.snapshot = snapshot(this.options.doc);

          const { empty, from, to } = this.editor.state.selection;

          // if the selection is empty, insert at the end of the selection
          const contentTarget =
            empty || output.type === "insert"
              ? to
              : {
                  from,
                  to,
                };

          // when inserting, use the "to" position, otherwise when modifing, use the "from" position
          const targetTo = output.type === "insert" ? to : from;

          // 2.a. Insert the output.
          this.editor.commands.insertContentAt(contentTarget, output.text);

          // 2.b. Diff the output in the editor
          // TODO: setTimeout will make this execute after the current transaction is committed, which is returned by the insert content command.
          setTimeout(() => {
            if (this.storage.snapshot) {
              (
                this.editor.commands as unknown as AiCommands
              )._renderAiToolbarDiffInEditor(this.storage.snapshot);
            }
          }, 100);

          selection = {
            from,
            to: targetTo + output.text.length, // take into account the new length with output
          };
        }

        // 3. Set to "reviewing" phase with the output
        this.storage.state = {
          phase: "reviewing",
          customPrompt: "",
          prompt: currentState.prompt,
          output,
          selection,
        };

        return true;
      },

      _handleAiToolbarThinkingError: (error: Error) => () => {
        const currentState = this.storage.state;

        // 1. If NOT in "thinking" phase, do nothing
        if (currentState.phase !== "thinking") {
          return false;
        }

        // 2. Unblock the editor
        this.editor.setEditable(true);

        // 3. Set to "asking" phase with error
        this.storage.state = {
          phase: "asking",
          // If the custom prompt is different than the prompt, reset it
          customPrompt:
            currentState.prompt === currentState.customPrompt
              ? currentState.customPrompt
              : "",
          // TODO: Improve error handling
          error,
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

      _renderAiToolbarDiffInEditor: (previous?: Snapshot) => () => {
        if (!this.options.doc) {
          return false;
        }

        const previousSnapshot: Snapshot = previous ?? emptySnapshot;
        const currentSnapshot = snapshot(this.options.doc);

        if (equalSnapshots(previousSnapshot, currentSnapshot)) {
          return true;
        }

        const binding = getYjsBinding(this.editor);

        if (binding) {
          binding.renderSnapshot(currentSnapshot, previousSnapshot);
          return true;
        }

        return false;
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: AI_TOOLBAR_SELECTION_PLUGIN,
        props: {
          decorations: ({ doc, selection }) => {
            if (
              this.storage.state.phase === "closed" ||
              // TODO: Don't show the selection when reviewing diff outputs
              (this.storage.state.phase === "reviewing" &&
                this.storage.state.output.type !== "other")
            ) {
              return DecorationSet.create(doc, []);
            }
            const { from, to } = this.storage.state.selection ?? selection;
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
