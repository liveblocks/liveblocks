import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { Extension } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
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

import type {
  AiExtensionOptions,
  AiExtensionStorage,
  LiveblocksExtensionStorage,
  YSyncBinding,
} from "../types";

const DEFAULT_AI_NAME = "AI";

const AiExtension = Extension.create<AiExtensionOptions, AiExtensionStorage>({
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
      snapshot: undefined,
      prompt: undefined,
      previousPrompt: undefined,
      state: "closed",
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
      acceptAi:
        () =>
        ({ editor, tr }) => {
          this.storage.state = "closed";
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const binding = ySyncPluginKey.getState(
            this.editor.view.state
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ).binding as YSyncBinding;
          if (binding !== null) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            binding.mapping.clear();

            const fragmentContent = yXmlFragmentToProseMirrorFragment(
              binding.type,
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
          }

          const provider = (
            editor.extensionStorage
              .liveblocksExtension as LiveblocksExtensionStorage
          ).provider as LiveblocksYjsProvider;
          provider.unpause();
          this.storage.snapshot = undefined;
          this.editor.setEditable(true);
          return true;
        },
      closeAi:
        () =>
        ({ editor, tr }) => {
          this.storage.state = "closed";
          this.storage.prompt = undefined;
          this.storage.previousPrompt = undefined;
          if (!this.storage.snapshot) {
            return false;
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const binding = ySyncPluginKey.getState(
            this.editor.view.state
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          ).binding as YSyncBinding;
          if (binding === null) {
            return false;
          }
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          binding.mapping.clear();
          const docFromSnapshot = createDocFromSnapshot(
            binding.doc,
            this.storage.snapshot
          );
          const type = docFromSnapshot.getXmlFragment("default"); // TODO, field
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

          const provider = (
            editor.extensionStorage
              .liveblocksExtension as LiveblocksExtensionStorage
          ).provider as LiveblocksYjsProvider;
          provider.unpause();
          docFromSnapshot.gc = true;

          this.editor.setEditable(true);

          this.storage.snapshot = undefined;
          this.editor.setEditable(true);
          return true;
        },

      applyPrompt:
        (result: string, isContinue: boolean = false) =>
        ({ commands, state }) => {
          if (!this.options.doc) {
            return false;
          }
          const { from, to } = state.selection;
          this.options.doc.gc = false;
          this.storage.snapshot = snapshot(this.options.doc);
          setTimeout(() => {
            if (this.storage.snapshot) {
              this.storage.state = "reviewing"; // waiting for input ?
              this.storage.previousPrompt = this.storage.prompt;
              this.storage.prompt = "";
              this.editor.commands.compareSnapshot(this.storage.snapshot);
            }
          }, 1);
          return commands.insertContentAt(
            isContinue ? to : { from, to },
            isContinue ? " " + result : result
          );
          //return true;
        },
      askAi:
        (prompt: string | undefined, isContinue: boolean = false) =>
        ({ editor }) => {
          if (
            !this.options.doc ||
            (this.editor.state.selection.empty && !isContinue)
          ) {
            return false;
          }
          if (!prompt) {
            this.storage.state = "asking";
            return true;
          }
          this.storage.state = "thinking";
          this.storage.prompt = prompt;
          this.editor.setEditable(false);
          const { from, to } = this.editor.state.selection;
          const text = this.editor.state.doc.textBetween(
            isContinue ? 0 : from,
            to,
            " "
          );

          const provider = (
            editor.extensionStorage
              .liveblocksExtension as LiveblocksExtensionStorage
          ).provider as LiveblocksYjsProvider;
          const executePrompt = async () => {
            await provider.pause();

            const responseText = await this.options.resolveAiPrompt(
              prompt,
              text
            );
            // TODO: handle error
            if (responseText) {
              //this.editor.commands.insertContent(responseText);
              setTimeout(() => {
                this.editor.commands.applyPrompt(responseText, isContinue);
              }, 1);
            } else {
              console.log("no response from ai");
              this.storage.state = "closed";
              this.editor.setEditable(true);
            }
          };

          void executePrompt();

          return true;
        },
      retryAskAi: () => () => {
        if (this.storage.state !== "reviewing") {
          return false;
        }
        this.storage.prompt = this.storage.previousPrompt ?? "";
        this.storage.previousPrompt = undefined;
        this.editor.commands.askAi(this.storage.prompt);
        return true;
      },
      setAiPrompt: (prompt: string | ((prompt: string) => string)) => () => {
        this.storage.prompt =
          typeof prompt === "function"
            ? prompt(this.storage.prompt ?? "")
            : prompt;
        return true;
      },
      cancelAskAi: () => () => {
        if (this.storage.state !== "thinking") {
          return false;
        }

        // TODO: actually cancel the execution
        this.storage.state = "asking";

        return true;
      },
      compareSnapshot: (previous?: Snapshot) => () => {
        if (!this.options.doc) {
          return false;
        }
        const prevSnapshot: Snapshot = previous ?? emptySnapshot;
        const currentSnapshot = snapshot(this.options.doc);

        if (equalSnapshots(prevSnapshot, currentSnapshot)) {
          return false;
        }

        /*this.editor.view.dispatch(
          this.editor.view.state.tr.setMeta(ySyncPluginKey, {
            permanentUserData: this.options.pud,
            snapshot: currentSnapshot,
            prevSnapshot,
          })
        );*/
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const binding = ySyncPluginKey.getState(
          this.editor.view.state
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ).binding;
        if (binding !== null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          binding.renderSnapshot(currentSnapshot, prevSnapshot);
          return true;
        }
        return false;
      },
    };
  },
});

export { AiExtension };
