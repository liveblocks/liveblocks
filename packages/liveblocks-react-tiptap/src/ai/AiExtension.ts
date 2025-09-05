import {
  autoRetry,
  type ContextualPromptResponse,
  HttpError,
} from "@liveblocks/core";
import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import type { CommandProps, Editor } from "@tiptap/core";
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
  type AiToolbarState,
  type ResolveContextualPromptResponse,
  type YSyncPluginState,
} from "../types";
import { getContextualPromptContext } from "../utils";

const DEFAULT_AI_NAME = "AI";
export const DEFAULT_STATE: AiToolbarState = { phase: "closed" };

const RESOLVE_AI_PROMPT_RETRY_ATTEMPTS = 3;
const RESOLVE_AI_PROMPT_RETRY_DELAYS = [1000, 2000, 4000];

function getYjsBinding(editor: Editor) {
  return (ySyncPluginKey.getState(editor.view.state) as YSyncPluginState)
    .binding;
}

function getLiveblocksYjsProvider(editor: Editor) {
  return editor.extensionStorage.liveblocksExtension?.provider as
    | LiveblocksYjsProvider
    | undefined;
}

export function isContextualPromptDiffResponse(
  response: ContextualPromptResponse
): response is Extract<
  ContextualPromptResponse,
  { type: "replace" | "insert" }
> {
  return response.type === "replace" || response.type === "insert";
}

function isResolveContextualPromptResponse(
  response: unknown
): response is ResolveContextualPromptResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    typeof (response as { text: unknown }).text === "string" &&
    typeof (response as { type: unknown }).type === "string" &&
    ["insert", "replace", "other"].includes((response as { type: string }).type)
  );
}

function createParagraph(editor: Editor, text: string) {
  const paragraph =
    editor.schema.nodes.paragraph ??
    Object.values(editor.schema.nodes).find((node) => node.isBlock);

  if (!paragraph) {
    throw new Error("Could not create a paragraph.");
  }

  return paragraph.create(null, text ? editor.schema.text(text) : undefined);
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
      resolveContextualPrompt: () => Promise.reject(),
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

      closeAi: () => () => {
        (this.editor.commands as unknown as AiCommands).$closeAiToolbar();

        return true;
      },

      $acceptAiToolbarResponse:
        () =>
        ({ tr, view }: CommandProps) => {
          const currentState = this.storage.state;

          // 1. If NOT in "reviewing" phase, do nothing
          if (currentState.phase !== "reviewing") {
            return false;
          }

          // 2. Accept the response
          if (isContextualPromptDiffResponse(currentState.response)) {
            // 2.a. If the response is a diff, apply it definitely
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
            // 2.b. If the response is not a diff, insert it below the selection

            const paragraphs = currentState.response.text
              .split("\n")
              .map((paragraph) => createParagraph(this.editor, paragraph));

            tr.insert(this.editor.state.selection.$to.end(), paragraphs);
            tr.setMeta("addToHistory", true);
            view.dispatch(tr);
            // Prevent TipTap from dispatching this transaction, because we already did (this is a hack)
            tr.setMeta("preventDispatch", true);
          }

          // 3. Unblock the editor
          getLiveblocksYjsProvider(this.editor)?.unpause();
          this.editor.setEditable(true);

          // 4. Set to "closed" phase
          this.storage.state = { phase: "closed" };

          return true;
        },

      $closeAiToolbar:
        () =>
        ({ tr, view }: CommandProps) => {
          const currentState = this.storage.state;

          // 1. If already in "closed" phase, do nothing
          if (currentState.phase === "closed") {
            return false;
          }

          // 2. If in "thinking" phase, cancel the current AI request
          if (currentState.phase === "thinking") {
            currentState.abortController.abort();
          }

          // 3. If in "thinking" or "reviewing" phase, revert the editor if possible and unblock it
          if (
            currentState.phase === "thinking" ||
            currentState.phase === "reviewing"
          ) {
            // Get the revert transaction and dispatch it
            const revertTr = getRevertTransaction(
              tr,
              this.editor,
              this.storage,
              this.options.doc
            );
            if (revertTr) {
              view.dispatch(revertTr);
              // Prevent TipTap from dispatching this transaction, because we already did (this is a hack)
              tr.setMeta("preventDispatch", true);
            }
          }

          // 4. Restore the initial selection
          this.editor.commands.setTextSelection(currentState.initialSelection);

          // 5. Unblock the editor
          getLiveblocksYjsProvider(this.editor)?.unpause();
          this.editor.setEditable(true);

          // 6. Set to "closed" phase
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
          // Store the initial selection
          initialSelection: {
            from: this.editor.state.selection.from,
            to: this.editor.state.selection.to,
          },
          // Initialize the custom prompt as empty
          customPrompt: "",
        };

        return true;
      },

      $startAiToolbarThinking:
        (prompt: string, withPreviousResponse?: boolean) =>
        ({ tr, view }: CommandProps) => {
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

          // 3. If this is a retry or a refinement, revert the editor and restore the initial selection
          if (currentState.phase === "reviewing") {
            // 3.a. Revert the editor
            const revertTr = getRevertTransaction(
              tr,
              this.editor,
              this.storage,
              this.options.doc
            );
            if (revertTr) {
              // Important: in this scenario we do not unpause the provider
              view.dispatch(revertTr);
              // Prevent Tiptap from dispatching this transaction, because we already did (this is a hack)
              tr.setMeta("preventDispatch", true);
            }

            // 3.b. Restore the initial selection
            this.editor.commands.setTextSelection(
              currentState.initialSelection
            );
          }

          // 4. Set to "thinking" phase
          this.storage.state = {
            phase: "thinking",
            // Store the initial selection if the toolbar is opened directly in the "thinking" phase
            initialSelection: currentState.initialSelection ?? {
              from: this.editor.state.selection.from,
              to: this.editor.state.selection.to,
            },
            // Initialize the custom prompt as empty if the toolbar is opened directly in the "thinking" phase
            customPrompt: currentState.customPrompt ?? "",
            prompt,
            abortController,
            previousResponse: currentState.response,
          };

          // 5. Block the editor
          this.editor.setEditable(false);

          // 6. Start the AI request
          autoRetry(
            async () => {
              await provider?.pause();

              // 6.a. Resolve the AI prompt
              const response = (await this.options.resolveContextualPrompt({
                prompt,
                context: getContextualPromptContext(this.editor, 3_000),
                signal: abortController.signal,
                previous:
                  withPreviousResponse && currentState.phase === "reviewing"
                    ? {
                        prompt: currentState.prompt,
                        response: {
                          type: currentState.response?.type,
                          text: currentState.response?.text,
                        },
                      }
                    : undefined,
              })) as unknown;

              // 6.b. Validate the response
              if (isResolveContextualPromptResponse(response)) {
                return response;
              } else {
                throw new Error("Failed to resolve AI prompt.");
              }
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
            .then((response) => {
              if (abortController.signal.aborted) {
                return;
              }

              // 6.a. If the AI request succeeds, set to "reviewing" phase with the response
              (
                this.editor.commands as unknown as AiCommands
              )._handleAiToolbarThinkingSuccess({
                type: response.type,
                text: response.text,
              });
            })
            .catch((error) => {
              if (abortController.signal.aborted) {
                return;
              }

              // 6.b. If the AI request fails, set to "asking" phase with error
              (
                this.editor.commands as unknown as AiCommands
              )._handleAiToolbarThinkingError(error);
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
          initialSelection: currentState.initialSelection,
          // If the custom prompt is different than the prompt, reset it
          customPrompt:
            currentState.prompt === currentState.customPrompt
              ? currentState.customPrompt
              : "",
        };

        return true;
      },

      _showAiToolbarReviewingDiff: () => () => {
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
        (response: ContextualPromptResponse) =>
        ({ view, tr }: CommandProps) => {
          const currentState = this.storage.state;

          // 1. If NOT in "thinking" phase, do nothing
          if (currentState.phase !== "thinking") {
            return false;
          }

          // 2. If this is not a diff, the response will just be in the toolbar, set to "reviewing" phase directly with the response
          if (!isContextualPromptDiffResponse(response)) {
            this.storage.state = {
              phase: "reviewing",
              initialSelection: currentState.initialSelection,
              customPrompt: "",
              prompt: currentState.prompt,
              response,
            };

            return true;
          }

          if (!this.options.doc) {
            return false;
          }

          // 3. Otherwise, the response is a diff, apply it to the editor
          this.options.doc.gc = false;
          this.storage.snapshot = takeSnapshot(this.options.doc);

          // 4. Set to "reviewing" phase with the new range
          this.storage.state = {
            phase: "reviewing",
            initialSelection: currentState.initialSelection,
            customPrompt: "",
            prompt: currentState.prompt,
            response,
          };

          // 5. Insert the response's text as inline first (and replace the selection if it's a replace) then as block if there are multiple paragraphs
          const [firstParagraph, ...otherParagraphs] =
            response.text.split("\n");

          tr.insertText(
            firstParagraph,
            response.type === "insert"
              ? this.editor.state.selection.to
              : this.editor.state.selection.from,
            this.editor.state.selection.to
          );

          if (otherParagraphs.length > 0) {
            const paragraphs = otherParagraphs.map((paragraph) =>
              createParagraph(this.editor, paragraph)
            );

            tr.insert(tr.selection.$to.pos, paragraphs);
          }

          view.dispatch(tr);
          // Prevent Tiptap from dispatching this transaction, because we already did (this is a hack)
          tr.setMeta("preventDispatch", true);

          // 6. Show the diff
          (
            this.editor.commands as unknown as AiCommands
          )._showAiToolbarReviewingDiff();

          // We moved to the "reviewing" phase, so even if `_showAiToolbarReviewingDiff`
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
          initialSelection: currentState.initialSelection,
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
            // Don't show the AI toolbar selection if the toolbar is closed or when reviewing diff responses
            if (
              this.storage.state.phase === "closed" ||
              (this.storage.state.phase === "reviewing" &&
                isContextualPromptDiffResponse(this.storage.state.response))
            ) {
              return DecorationSet.create(doc, []);
            }

            const { from, to } = selection;
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
