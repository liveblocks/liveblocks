"use client";

import type { LiveText } from "@liveblocks/client";
import { useRoom } from "@liveblocks/react/suspense";
import type { FileContents, FileOptions } from "@pierre/diffs";
import { Editor, type EditorOptions } from "@pierre/diffs/edit";
import { EditProvider, File } from "@pierre/diffs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  bindEditorToLiveText,
  type LiveTextBinding,
  type RemoteSelection,
} from "@/lib/livetext-binding";
import { RemoteCarets } from "./remote-carets";

const fileOptions: FileOptions<undefined> = {
  // disableFileHeader: true,
  theme: { dark: "pierre-dark", light: "pierre-light" },
};

function createEditor(options: EditorOptions<undefined>) {
  return new Editor(options);
}

type CollaborativeEditorProps = {
  /** Path of the file, shown as the file name and used for presence. */
  path: string;
  /** The shared LiveText document backing this file. */
  text: LiveText;
};

/**
 * A `@pierre/diffs` edit-mode surface bound to a Liveblocks LiveText
 * document, with other users' carets and selections drawn on top.
 *
 * Remount this component (via `key`) when switching files.
 */
export function CollaborativeEditor({ path, text }: CollaborativeEditorProps) {
  const room = useRoom();
  const [remoteSelections, setRemoteSelections] = useState<RemoteSelection[]>(
    []
  );
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor<undefined> | null>(null);
  const bindingRef = useRef<LiveTextBinding | null>(null);

  // Snapshot for the initial render; every later update flows through the
  // binding (local edits → LiveText, remote edits → `editor.applyEdits`).
  const file = useMemo<FileContents>(
    () => ({ name: path, contents: text.toString(), cacheKey: path }),
    [path, text]
  );

  const editorOptions = useMemo<EditorOptions<undefined>>(
    () => ({
      onAttach(editor) {
        editorRef.current = editor;
        bindingRef.current?.destroy();
        const containerElement = containerRef.current;
        if (containerElement === null) {
          return;
        }
        bindingRef.current = bindEditorToLiveText({
          room,
          text,
          editor,
          path,
          container: containerElement,
          onRemoteSelections: setRemoteSelections,
        });
      },
      onChange(_file, _lineAnnotations, event) {
        bindingRef.current?.handleEditorChange(event);
      },
    }),
    [room, text, path]
  );

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [path, text]);

  const getDocumentText = useCallback(
    () => editorRef.current?.getText() ?? file.contents,
    [file]
  );

  return (
    <EditProvider createEditor={createEditor}>
      <div
        ref={(element) => {
          containerRef.current = element;
          setContainer(element);
        }}
        className="h-full overflow-auto bg-white"
      >
        <div className="relative" data-editor-surface="">
          <File
            file={file}
            options={fileOptions}
            edit
            editorOptions={editorOptions}
          />
          <RemoteCarets
            container={container}
            selections={remoteSelections}
            getDocumentText={getDocumentText}
          />
        </div>
      </div>
    </EditProvider>
  );
}
