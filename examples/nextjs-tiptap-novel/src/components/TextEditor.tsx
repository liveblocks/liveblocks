"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { DocumentSpinner } from "@/primitives/Spinner";
import { Avatars } from "@/components/Avatars";
import { AdvancedEditor } from "@/components/Editor/advanced-editor";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./TextEditor.module.css";

export function TextEditor() {
  return (
    <ClientSideSuspense fallback={<DocumentSpinner />}>
      <Editor />
    </ClientSideSuspense>
  );
}

export function Editor() {
  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <ThemeToggle />
        <Avatars />
      </div>
      <div className={styles.editorPanel}>
        <div className={styles.editorContainer}>
          <AdvancedEditor />
        </div>
      </div>
    </div>
  );
}

// Prevents a matchesNode error on hot reloading
// EditorView.prototype.updateState = function updateState(state) {
//   // @ts-ignore
//   if (!this.docView) return;
//   // @ts-ignore
//   this.updateStateInner(state, this.state.plugins != state.plugins);
// };
