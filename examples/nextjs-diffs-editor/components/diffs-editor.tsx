"use client";

import type { EditorChange, FileContents, FileOptions } from "@pierre/diffs";
import { Editor, type EditorOptions } from "@pierre/diffs/edit";
import { EditProvider, File, Virtualizer } from "@pierre/diffs/react";
import { AvatarStack } from "@liveblocks/react-ui";
import {
  useMutation,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveCarets } from "./live-carets";
import { rangeToSelection } from "./text-position";

const FILE_NAME = "review-summary.ts";

const cleanupBySurface = new WeakMap<HTMLElement, () => void>();

function createEditor(options: EditorOptions<undefined>) {
  return new Editor(options);
}

export function DiffsEditor() {
  const liveText = useStorage((root) => root.text);
  const text = liveText.map(([segmentText]) => segmentText).join("");
  const updateMyPresence = useUpdateMyPresence();
  const editorRef = useRef<Editor<undefined> | null>(null);
  const hasFocusRef = useRef(false);
  const [surfaceElement, setSurfaceElement] = useState<HTMLElement | null>(
    null
  );

  const applyEditorChanges = useMutation(
    (
      { storage },
      changes: EditorChange[],
      nextContents: string
    ) => {
      const liveText = storage.get("text");

      if (liveText.toString() === nextContents) {
        return;
      }

      if (changes.length === 0) {
        liveText.replace(0, liveText.toString().length, nextContents);
        return;
      }

      for (const change of [...changes].sort((a, b) => b.start - a.start)) {
        liveText.replace(change.start, change.end - change.start, change.text);
      }
    },
    []
  );

  const publishSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !hasFocusRef.current) {
      return;
    }

    const selection = editor.getState().selections?.at(-1);
    updateMyPresence({
      selection: selection ? rangeToSelection(editor.getText(), selection) : null,
    });
  }, [updateMyPresence]);

  const file = useMemo<FileContents>(
    () => ({
      name: FILE_NAME,
      contents: text,
      cacheKey: "liveblocks-diffs-editor",
    }),
    [text]
  );

  const fileOptions = useMemo<FileOptions<undefined>>(
    () => ({
      theme: {
        dark: "pierre-dark",
        light: "pierre-light",
      },
      overflow: "wrap",
      onPostRender(node, _instance, phase) {
        if (phase === "unmount") {
          cleanupBySurface.get(node)?.();
          cleanupBySurface.delete(node);
          setSurfaceElement(null);
          return;
        }

        setSurfaceElement(node);

        if (cleanupBySurface.has(node)) {
          return;
        }

        const shadowRoot = node.shadowRoot;
        if (!shadowRoot) {
          return;
        }

        const publishSoon = () => {
          window.requestAnimationFrame(publishSelection);
        };
        const markFocused = () => {
          hasFocusRef.current = true;
          publishSoon();
        };
        const clearPresence = () => {
          hasFocusRef.current = false;
          updateMyPresence({ selection: null });
        };

        shadowRoot.addEventListener("keyup", publishSoon);
        shadowRoot.addEventListener("pointerup", publishSoon);
        shadowRoot.addEventListener("focusin", markFocused);
        shadowRoot.addEventListener("focusout", clearPresence);
        document.addEventListener("selectionchange", publishSoon);

        cleanupBySurface.set(node, () => {
          shadowRoot.removeEventListener("keyup", publishSoon);
          shadowRoot.removeEventListener("pointerup", publishSoon);
          shadowRoot.removeEventListener("focusin", markFocused);
          shadowRoot.removeEventListener("focusout", clearPresence);
          document.removeEventListener("selectionchange", publishSoon);
        });
      },
    }),
    [publishSelection, updateMyPresence]
  );

  const editorOptions = useMemo<EditorOptions<undefined>>(
    () => ({
      onAttach(editor) {
        editorRef.current = editor;
        hasFocusRef.current = true;
        editor.focus({ lineNumber: "first-visible", preventScroll: true });
        publishSelection();
      },
      onChange(file, _lineAnnotations, event) {
        applyEditorChanges(event.changes, file.contents);
        publishSelection();
      },
      onFocus() {
        hasFocusRef.current = true;
        publishSelection();
      },
      onBlur() {
        hasFocusRef.current = false;
        updateMyPresence({ selection: null });
      },
    }),
    [applyEditorChanges, publishSelection, updateMyPresence]
  );

  useEffect(() => {
    publishSelection();
  }, [publishSelection, text]);

  return (
    <div className="editor-container">
      <header className="editor-header">
        <div>
          <p className="eyebrow">Diffs edit mode + LiveText</p>
          <h1>Multiplayer code review editor</h1>
          <p>
            Edit the file below in multiple tabs. Diffs renders the code editor,
            while LiveText syncs text and presence powers live carets.
          </p>
        </div>
        <AvatarStack className="avatars" size={32} />
      </header>
      <div className="editor-wrapper">
        <EditProvider createEditor={createEditor}>
          <Virtualizer className="diffs-virtualizer">
            <File file={file} options={fileOptions} edit editorOptions={editorOptions} />
          </Virtualizer>
        </EditProvider>
        <LiveCarets text={text} surfaceElement={surfaceElement} />
      </div>
    </div>
  );
}
