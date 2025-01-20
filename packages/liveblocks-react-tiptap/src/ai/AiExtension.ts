import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import {
  AI_TOOLBAR_SELECTION_PLUGIN,
  type AiCommands,
  type AiExtensionOptions,
  type AiExtensionStorage,
  type AiToolbarOutput,
  type AiToolbarState,
} from "../types";

const DEFAULT_AI_NAME = "AI";
export const DEFAULT_STATE: AiToolbarState = { phase: "closed" };

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
  onCreate() {
    // Turn off gc for snapshots to work
    // TODO: remove this later, we only need to compare two full copies
    // if (this.options.doc) {
    // this.options.doc.gc = false;
    // }
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

      $closeAiToolbar: () => () => {
        const currentState = this.storage.state;

        // 1. If in "thinking" phase, cancel the current AI request
        if (currentState.phase === "thinking") {
          currentState.abortController.abort();
        }

        // TODO: 2. If in "reviewing" phase, revert the editor

        // 3. Set to "closed" phase
        this.storage.state = { phase: "closed" };

        return true;
      },

      $openAiToolbarAsking: () => () => {
        const currentState = this.storage.state;

        // 1. If NOT in "closed" phase, do nothing
        if (currentState.phase !== "closed") {
          return false;
        }

        // 2. Set to "asking" phase
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

        const abortController = new AbortController();

        // 2. Set to "thinking" phase
        this.storage.state = {
          phase: "thinking",
          customPrompt: currentState.customPrompt ?? "",
          prompt,
          abortController,
        };

        // TODO: Use abortController.signal (and handle its errors when aborted)

        // 3. Execute the AI request
        this.options
          .resolveAiPrompt({
            prompt,
            selectionText:
              "TODO: The selected text OR the last output if it's a refinement prompt",

            // TODO: Add doc context
            context: "",
            signal: abortController.signal,
          })
          .then((output) => {
            if (abortController.signal.aborted) {
              return;
            }

            // 3.a. If the AI request succeeds, set to "reviewing" phase with the output
            (
              this.editor.commands as unknown as AiCommands
            )._handleAiToolbarThinkingSuccess({
              type: "other",
              text: output,
            });
          })
          .catch((error) => {
            if (abortController.signal.aborted) {
              return;
            }

            // 3.b. If the AI request fails, set to "asking" phase with error
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

        // 3. Set to "asking" phase
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
        if (currentState.phase !== "thinking") {
          return false;
        }

        // 2. Set to "reviewing" phase with the output
        this.storage.state = {
          phase: "reviewing",
          customPrompt: "",
          prompt: currentState.prompt,
          output,
        };

        return true;
      },

      _handleAiToolbarThinkingError: (error: Error) => () => {
        const currentState = this.storage.state;

        // 1. If NOT in "thinking" phase, do nothing
        if (currentState.phase !== "thinking") {
          return false;
        }

        // 2. Set to "asking" phase with error
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
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: AI_TOOLBAR_SELECTION_PLUGIN,
        props: {
          decorations: ({ doc, selection }) => {
            if (this.storage.state.phase === "closed") {
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
