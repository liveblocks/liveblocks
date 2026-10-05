import type { HistoryVersion } from "@liveblocks/core";
import {
  getLiveblocksProsemirrorDocument,
  liveblocksProsemirrorNodeToJson,
} from "@liveblocks/prosemirror";
import {
  useHistoryVersionStorageData,
  useHistoryVersionYjsData,
} from "@liveblocks/react";
import { useOverrides } from "@liveblocks/react-ui";
import {
  Button,
  cn,
  List,
  RestoreIcon,
  SpinnerIcon,
  User,
} from "@liveblocks/react-ui/_private";
import type { Content, Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";
import { applyUpdate, Doc } from "yjs";

const AUTHORS_TRUNCATE = 3;

export interface HistoryVersionPreviewProps extends ComponentPropsWithoutRef<"div"> {
  version: HistoryVersion;
  editor: Editor;
  onVersionRestore?: (version: HistoryVersion) => void;
}

type VersionPreviewLayoutProps = HistoryVersionPreviewProps & {
  children: ReactNode;
  error: Error | undefined;
  isLoading: boolean;
  onRestore: () => void;
  restoreDisabled: boolean;
};

const VersionPreviewLayout = forwardRef<
  HTMLDivElement,
  VersionPreviewLayoutProps
>(
  (
    {
      version,
      editor: _editor,
      onVersionRestore: _onVersionRestore,
      children,
      error,
      isLoading,
      onRestore,
      restoreDisabled,
      className,
      ...props
    },
    forwardedRef
  ) => {
    const $ = useOverrides();

    return (
      <div
        {...props}
        className={cn(
          "lb-root lb-history-version-preview lb-tiptap-version-preview",
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
          <div className="lb-history-version-preview-content lb-tiptap-editor-container lb-tiptap-version-preview-editor-container">
            {children}
          </div>
        )}
        <div className="lb-history-version-preview-footer">
          <span className="lb-history-version-preview-authors">
            {$.HISTORY_VERSION_PREVIEW_AUTHORS_LIST(
              version.authors.length > 0 ? (
                <List
                  values={version.authors.map((author) => (
                    <User key={author.id} userId={author.id} replaceSelf />
                  ))}
                  formatRemaining={$.LIST_REMAINING_USERS}
                  truncate={AUTHORS_TRUNCATE}
                  locale={$.locale}
                />
              ) : undefined
            )}
          </span>
          <div className="lb-history-version-preview-actions">
            <Button
              onClick={onRestore}
              disabled={restoreDisabled}
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
  }
);

function usePreviewEditor(parentEditor: Editor) {
  return useEditor({
    // Ignore extensions, only get marks/nodes.
    editable: false,
    immediatelyRender: false,
    extensions: parentEditor.extensionManager.extensions.filter(
      (extension) => extension.type !== "extension"
    ),
  });
}

function useRestorePreview(
  version: HistoryVersion,
  parentEditor: Editor,
  previewEditor: Editor | null,
  onVersionRestore: ((version: HistoryVersion) => void) | undefined
) {
  return useCallback(() => {
    parentEditor.commands.setContent(previewEditor?.getJSON() ?? "");
    onVersionRestore?.(version);
  }, [onVersionRestore, parentEditor, previewEditor, version]);
}

const YjsHistoryVersionPreview = forwardRef<
  HTMLDivElement,
  HistoryVersionPreviewProps
>((props, forwardedRef) => {
  const { version, editor: parentEditor, onVersionRestore } = props;
  const { field } = parentEditor.storage.liveblocksExtension;
  const { isLoading, data, error } = useHistoryVersionYjsData(version.id);
  const previewEditor = usePreviewEditor(parentEditor);

  useEffect(() => {
    if (data && previewEditor) {
      const doc = new Doc();
      applyUpdate(doc, data);
      const root = doc.getXmlFragment(field);
      const node = yXmlFragmentToProseMirrorRootNode(root, parentEditor.schema);
      // ProseMirror types Node.toJSON() as any, but it returns JSON content.
      previewEditor.commands.setContent(node.toJSON() as Content);
    }
  }, [data, field, previewEditor, parentEditor]);

  const restore = useRestorePreview(
    version,
    parentEditor,
    previewEditor,
    onVersionRestore
  );

  return (
    <VersionPreviewLayout
      {...props}
      error={error}
      isLoading={isLoading}
      onRestore={restore}
      restoreDisabled={!data || !previewEditor}
      ref={forwardedRef}
    >
      <EditorContent editor={previewEditor} />
    </VersionPreviewLayout>
  );
});

const LiveblocksHistoryVersionPreview = forwardRef<
  HTMLDivElement,
  HistoryVersionPreviewProps
>((props, forwardedRef) => {
  const { version, editor: parentEditor, onVersionRestore } = props;
  const { field } = parentEditor.storage.liveblocksExtension;
  const { isLoading, data, error } = useHistoryVersionStorageData(version.id);
  const previewEditor = usePreviewEditor(parentEditor);
  const document = useMemo(
    () =>
      data === undefined
        ? undefined
        : getLiveblocksProsemirrorDocument(data, field),
    [data, field]
  );
  const documentError = useMemo(
    () =>
      data !== undefined && document === undefined
        ? new Error(
            `The Storage version does not contain a text editor document for field "${field}".`
          )
        : undefined,
    [data, document, field]
  );

  useEffect(() => {
    if (document && previewEditor) {
      previewEditor.commands.setContent(
        liveblocksProsemirrorNodeToJson(document)
      );
    }
  }, [document, previewEditor]);

  const restore = useRestorePreview(
    version,
    parentEditor,
    previewEditor,
    onVersionRestore
  );

  return (
    <VersionPreviewLayout
      {...props}
      error={error ?? documentError}
      isLoading={isLoading}
      onRestore={restore}
      restoreDisabled={!document || !previewEditor}
      ref={forwardedRef}
    >
      <EditorContent editor={previewEditor} />
    </VersionPreviewLayout>
  );
});

/**
 * Displays a specific version of the current TipTap document.
 *
 * @example
 * <HistoryVersionPreview version={version} />
 */
export const HistoryVersionPreview = forwardRef<
  HTMLDivElement,
  HistoryVersionPreviewProps
>((props, forwardedRef) => {
  return props.editor.storage.liveblocksExtension.mode === "liveblocks" ? (
    <LiveblocksHistoryVersionPreview {...props} ref={forwardedRef} />
  ) : (
    <YjsHistoryVersionPreview {...props} ref={forwardedRef} />
  );
});
