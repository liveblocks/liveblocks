import type { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { Extension } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import {
  ySyncPluginKey,
  yXmlFragmentToProseMirrorFragment,
} from "y-prosemirror";
import type { Doc, PermanentUserData, RelativePosition, Snapshot } from "yjs";
import {
  createDocFromSnapshot,
  emptySnapshot,
  equalSnapshots,
  snapshot,
} from "yjs";

import type { LiveblocksExtensionStorage, YSyncBinding } from "../types";
import {
  getRangeFromRelativeSelections,
  getRelativeSelectionFromState,
} from "../utils";

type AiExtensionOptions = {
  doc: Doc | undefined;
  pud: PermanentUserData | undefined;
  resolveAiPrompt?: (prompt: string, selectionText: string) => Promise<string>;
};

type AiExtensionStorage = {
  snapshot: Snapshot | null;
  prompt: string | null;
  relativeSelection: {
    anchor: RelativePosition;
    head: RelativePosition;
  } | null;
  state: null | "thinking" | "waiting_for_input";
};

const AiExtension = Extension.create<AiExtensionOptions, AiExtensionStorage>({
  name: "liveblocksAi",
  addOptions() {
    return {
      doc: undefined,
      pud: undefined,
      resolveAiPrompt: undefined,
    };
  },
  addStorage() {
    return {
      snapshot: null,
      prompt: null,
      relativeSelection: null,
      state: null,
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
          this.storage.state = null;
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
          this.storage.snapshot = null;
          this.editor.setEditable(true);
          return true;
        },
      rejectAi:
        () =>
        ({ editor, tr }) => {
          this.storage.state = null;
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
          this.storage.snapshot = null;
          this.editor.setEditable(true);
          return true;
        },

      applyPrompt:
        (result: string, isContinue: boolean = false) =>
        ({ commands, state }) => {
          if (!this.options.doc || !this.storage.relativeSelection) {
            return false;
          }
          const { from, to } = getRangeFromRelativeSelections(
            this.storage.relativeSelection,
            state
          );
          this.options.doc.gc = false;
          this.storage.snapshot = snapshot(this.options.doc);
          setTimeout(() => {
            if (this.storage.snapshot) {
              this.storage.state = "waiting_for_input";
              this.editor.commands.compareSnapshot(this.storage.snapshot);
            }
          }, 1);
          return commands.insertContentAt(
            isContinue ? to : { from, to },
            isContinue ? " " + result : result
          );
          //return true;
        },
      doPrompt:
        (prompt: string, isContinue: boolean = false) =>
        ({ editor, state }) => {
          if (
            !this.options.doc ||
            (this.editor.state.selection.empty && !isContinue)
          ) {
            return false;
          }
          this.storage.state = "thinking";
          this.editor.setEditable(false);
          this.storage.relativeSelection = getRelativeSelectionFromState(state);
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

            console.log("DO PROMPT", prompt);
            const responseText = this.options.resolveAiPrompt
              ? await this.options.resolveAiPrompt(prompt, text)
              : "not implemented";
            // TODO: handle error
            if (responseText) {
              //this.editor.commands.insertContent(responseText);
              setTimeout(() => {
                this.editor.commands.applyPrompt(responseText, isContinue);
              }, 5_000);
            } else {
              console.log("no response from ai");
              this.storage.state = null;
              this.editor.setEditable(true);
            }
          };

          void executePrompt();

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
