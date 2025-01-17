import { Extension } from "@tiptap/core";

import type {
  AiCommands,
  AiExtensionOptions,
  AiExtensionStorage,
  AiToolbarState,
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
    //if (this.options.doc) {
    //this.options.doc.gc = false;
    //}
  },
  addCommands() {
    return {
      askAi: (prompt) => () => {
        if (typeof prompt === "string") {
          (this.editor.commands as AiCommands<boolean>).$startAiToolbarThinking(
            prompt
          );
        } else {
          (this.editor.commands as AiCommands<boolean>).$openAiToolbarAsking();
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
          .resolveAiPrompt(
            prompt,
            "TODO: The selected text OR the last results if it's a refinement prompt"
          )
          .then((results) => {
            // 3.a. If the AI request succeeds, set to "reviewing" phase with results
            (
              this.editor.commands as AiCommands<boolean>
            ).$handleAiToolbarThinkingSuccess(results);
          })
          .catch((error) => {
            // 3.b. If the AI request fails, set to "asking" phase with error
            (
              this.editor.commands as AiCommands<boolean>
            ).$handleAiToolbarThinkingError(error as Error);
          });

        return true;
      },

      $handleAiToolbarThinkingSuccess: (results: string) => () => {
        const currentState = this.storage.state;

        // 1. If NOT in "thinking" phase, do nothing
        if (currentState.phase !== "thinking") {
          return false;
        }

        // 2. Set to "reviewing" phase with results
        this.storage.state = {
          phase: "reviewing",
          customPrompt: "",
          prompt: currentState.prompt,
          results,
        };

        return true;
      },

      $handleAiToolbarThinkingError: (error: Error) => () => {
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

      $updateAiToolbarCustomPrompt: (customPrompt) => () => {
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
});
