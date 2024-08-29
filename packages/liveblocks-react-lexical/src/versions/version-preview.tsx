import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { EditorRefPlugin } from "@lexical/react/LexicalEditorRefPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import type { Binding, Provider } from "@lexical/yjs";
import {
  createBinding,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
} from "@lexical/yjs";
import { kInternal, type Version } from "@liveblocks/core";
import { useRoom, useVersionData } from "@liveblocks/react";
import { useOverrides } from "@liveblocks/react-ui";
import {
  Button,
  SpinnerIcon,
  VersionHistoryIcon,
} from "@liveblocks/react-ui/_private";
import type { LexicalEditor } from "lexical";
import type { ComponentPropsWithoutRef } from "react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { Transaction, YEvent } from "yjs";
import { applyUpdate, Doc } from "yjs";

import { classNames } from "../classnames";
import { liveblocksConfig } from "../liveblocks-config";

export interface VersionPreviewProps extends ComponentPropsWithoutRef<"div"> {
  version: Version;
  onVersionRestore?: (version: Version) => void;
}

function createNoOpProvider(): Provider {
  const emptyFunction = () => {};

  return {
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off: emptyFunction,
      on: emptyFunction,
      setLocalState: emptyFunction,
    },
    connect: emptyFunction,
    disconnect: emptyFunction,
    off: emptyFunction,
    on: emptyFunction,
  };
}

function registerCollaborationListeners(
  editor: LexicalEditor,
  provider: Provider,
  binding: Binding
): () => void {
  const unsubscribeUpdateListener = editor.registerUpdateListener(
    ({
      dirtyElements,
      dirtyLeaves,
      editorState,
      normalizedNodes,
      prevEditorState,
      tags,
    }) => {
      if (tags.has("skip-collab") === false) {
        syncLexicalUpdateToYjs(
          binding,
          provider,
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags
        );
      }
    }
  );

  const observer = (events: Array<YEvent<any>>, transaction: Transaction) => {
    if (transaction.origin !== binding) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      syncYjsChangesToLexical(binding, provider, events, false);
    }
  };

  binding.root.getSharedType().observeDeep(observer);

  return () => {
    unsubscribeUpdateListener();
    binding.root.getSharedType().unobserveDeep(observer);
  };
}

/**
 * Displays a specific version of the current Lexical document.
 *
 * @example
 * <VersionPreview version={version} />
 */
export const VersionPreview = forwardRef<HTMLDivElement, VersionPreviewProps>(
  ({ version, onVersionRestore, className, ...props }, forwardedRef) => {
    const [parentEditor, parentContext] = useLexicalComposerContext();
    const room = useRoom();
    const editor = useRef<LexicalEditor>();
    const $ = useOverrides();
    const { isLoading, data, error } = useVersionData(version.id);

    const initialConfig = useMemo(() => {
      const nodes = Array.from(parentEditor._nodes.values()).map(
        (n) => n.klass
      );

      return liveblocksConfig({
        namespace: "VersionPreview",
        theme: parentContext.getTheme() || {},
        nodes,
        editable: false,
        onError: (err) => console.error(err),
      });
    }, [parentEditor, parentContext]);

    useEffect(() => {
      if (!data || !editor.current) {
        return;
      }
      const doc = new Doc();
      const docMap = new Map([[version.id, doc]]);
      const provider = createNoOpProvider();
      const binding = createBinding(
        editor.current,
        provider,
        version.id,
        doc,
        docMap
      );
      const unsubscribe = registerCollaborationListeners(
        editor.current,
        provider,
        binding
      );

      applyUpdate(doc, data);

      return unsubscribe;
    }, [data, version.id, isLoading]);

    const restore = useCallback(() => {
      if (!editor.current || !parentEditor) {
        return;
      }

      parentEditor.setEditorState(editor.current.getEditorState());
      // create a new version after restoring
      // TODO: this should be done from a command that waits for synchronization
      void room[kInternal].createTextVersion();
      onVersionRestore?.(version);
    }, [parentEditor, room, onVersionRestore, version]);

    return (
      <div
        {...props}
        className={classNames(
          "lb-root lb-version-preview lb-lexical-version-preview",
          className
        )}
        ref={forwardedRef}
      >
        {isLoading ? (
          <div className="lb-loading lb-version-preview-loading">
            <SpinnerIcon />
          </div>
        ) : error ? (
          <div className="lb-error lb-version-preview-error">
            {$.VERSION_PREVIEW_ERROR(error)}
          </div>
        ) : (
          <div className="lb-version-preview-content lb-lexical-editor-container lb-lexical-version-preview-editor-container">
            <LexicalComposer initialConfig={initialConfig}>
              <EditorRefPlugin editorRef={editor} />
              <RichTextPlugin
                contentEditable={<ContentEditable />}
                placeholder={
                  <div className="lb-empty lb-version-preview-empty">
                    {$.VERSION_PREVIEW_EMPTY}
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            </LexicalComposer>
          </div>
        )}
        <div className="lb-version-preview-footer">
          <div className="lb-version-preview-actions">
            <Button
              onClick={restore}
              disabled={!data || !parentEditor}
              variant="primary"
              size="large"
              className="lb-version-preview-action"
            >
              <VersionHistoryIcon className="lb-button-icon" />
              <span className="lb-button-label">
                {$.VERSION_PREVIEW_RESTORE}
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  }
);
