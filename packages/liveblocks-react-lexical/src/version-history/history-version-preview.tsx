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
import type { HistoryVersion, VersionRef } from "@liveblocks/core";
import { useVersion } from "@liveblocks/react";
import { useOverrides } from "@liveblocks/react-ui";
import {
  Button,
  cn,
  List,
  RestoreIcon,
  SpinnerIcon,
  User,
} from "@liveblocks/react-ui/_private";
import type { LexicalEditor } from "lexical";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import type { Transaction, YEvent } from "yjs";
import { applyUpdate, Doc } from "yjs";

import { liveblocksConfig } from "../liveblocks-config";

const AUTHORS_TRUNCATE = 3;

export interface YjsVersionPreviewProps
  extends ComponentPropsWithoutRef<"div"> {
  version: VersionRef;
  onVersionRestore?: (version: VersionRef) => void;
}

/**
 * @deprecated Use {@link YjsVersionPreviewProps} instead.
 */
export interface HistoryVersionPreviewProps
  extends ComponentPropsWithoutRef<"div"> {
  version: HistoryVersion;
  onVersionRestore?: (version: HistoryVersion) => void;
}

function createNoOpProvider(): Provider {
  const emptyFunction = () => {};

  return {
    awareness: {
      getLocalState: () => null,
      setLocalStateField: emptyFunction,
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
 * <YjsVersionPreview version={version} />
 */
export const YjsVersionPreview = forwardRef<
  HTMLDivElement,
  YjsVersionPreviewProps
>(({ version, onVersionRestore, className, ...props }, forwardedRef) => {
  const [parentEditor, parentContext] = useLexicalComposerContext();
  const editor = useRef<LexicalEditor>();
  const $ = useOverrides();
  const { isLoading, data, error } = useVersion(version.id);
  const bytes = data?.yjs;

  const initialConfig = useMemo(() => {
    const nodes = Array.from(parentEditor._nodes.values()).map((n) => n.klass);

    return liveblocksConfig({
      namespace: "VersionPreview",
      theme: parentContext.getTheme() || {},
      nodes,
      editable: false,
      onError: (err) => console.error(err),
    });
  }, [parentEditor, parentContext]);

  useEffect(() => {
    if (error || !bytes || !editor.current || !bytes.length) {
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

    try {
      applyUpdate(doc, bytes);
    } catch (err) {
      console.warn(err);
    }

    return unsubscribe;
  }, [bytes, version.id, isLoading, error]);

  const restore = useCallback(() => {
    if (!editor.current || !parentEditor) {
      return;
    }

    parentEditor.setEditorState(editor.current.getEditorState());
    onVersionRestore?.(version);
  }, [parentEditor, onVersionRestore, version]);

  return (
    <div
      {...props}
      className={cn(
        "lb-root lb-history-version-preview lb-lexical-version-preview",
        className
      )}
      ref={forwardedRef}
    >
      {isLoading ? (
        <div className="lb-loading lb-history-version-preview-loading">
          <SpinnerIcon />
        </div>
      ) : error ? (
        <div className="lb-error lb-history-version-preview-error">
          {$.HISTORY_VERSION_PREVIEW_ERROR(error)}
        </div>
      ) : (
        <div className="lb-history-version-preview-content lb-lexical-editor-container lb-lexical-version-preview-editor-container">
          <LexicalComposer initialConfig={initialConfig}>
            <EditorRefPlugin editorRef={editor} />
            <RichTextPlugin
              contentEditable={<ContentEditable />}
              placeholder={
                <div className="lb-empty lb-history-version-preview-empty">
                  {$.HISTORY_VERSION_PREVIEW_EMPTY}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </LexicalComposer>
        </div>
      )}
      <div className="lb-history-version-preview-footer">
        <span className="lb-history-version-preview-authors">
          {$.HISTORY_VERSION_PREVIEW_AUTHORS_LIST(
            <List
              values={version.authors.map((author) => (
                <User key={author.id} userId={author.id} replaceSelf />
              ))}
              formatRemaining={$.LIST_REMAINING_USERS}
              truncate={AUTHORS_TRUNCATE}
              locale={$.locale}
            />
          )}
        </span>
        <div className="lb-history-version-preview-actions">
          <Button
            onClick={restore}
            disabled={!bytes || !parentEditor}
            variant="primary"
            size="large"
            className="lb-history-version-preview-action"
            icon={<RestoreIcon />}
          >
            {$.HISTORY_VERSION_PREVIEW_RESTORE}
          </Button>
        </div>
      </div>
    </div>
  );
});

/**
 * Displays a specific version of the current Lexical document.
 *
 * @deprecated Use {@link YjsVersionPreview} instead.
 *
 * @example
 * <HistoryVersionPreview version={version} />
 */
export const HistoryVersionPreview = forwardRef<
  HTMLDivElement,
  HistoryVersionPreviewProps
>(({ version, onVersionRestore, ...props }, forwardedRef) => (
  <YjsVersionPreview
    ref={forwardedRef}
    version={{
      // The server guarantees version ids carry the `vh_` prefix.
      id: version.id as `vh_${string}`,
      createdAt: version.createdAt,
      authors: version.authors,
    }}
    onVersionRestore={
      onVersionRestore
        ? (v) =>
            onVersionRestore({
              type: "historyVersion",
              kind: "yjs",
              id: v.id,
              createdAt: v.createdAt,
              authors: v.authors,
            })
        : undefined
    }
    {...props}
  />
));
