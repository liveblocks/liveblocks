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
import type { Content, Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef, useCallback, useEffect } from "react";
import { yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";
import { applyUpdate, Doc } from "yjs";

const AUTHORS_TRUNCATE = 3;

export interface YjsVersionPreviewProps
  extends ComponentPropsWithoutRef<"div"> {
  version: VersionRef;
  editor: Editor;
  onVersionRestore?: (version: VersionRef) => void;
}

/**
 * @deprecated Use {@link YjsVersionPreviewProps} instead.
 */
export interface HistoryVersionPreviewProps
  extends ComponentPropsWithoutRef<"div"> {
  version: HistoryVersion;
  editor: Editor;
  onVersionRestore?: (version: HistoryVersion) => void;
}

/**
 * Displays a specific version of the current TipTap document.
 *
 * @example
 * <YjsVersionPreview version={version} />
 */
export const YjsVersionPreview = forwardRef<
  HTMLDivElement,
  YjsVersionPreviewProps
>(
  (
    { version, editor: parentEditor, onVersionRestore, className, ...props },
    forwardedRef
  ) => {
    const $ = useOverrides();
    const { isLoading, data, error } = useVersion(version.id);
    const bytes = data?.yjs;

    const previewEditor = useEditor({
      // ignore extensions, only get marks/nodes
      editable: false,
      immediatelyRender: false,
      extensions: parentEditor.extensionManager.extensions.filter(
        (e) => e.type !== "extension"
      ),
    });
    useEffect(() => {
      if (bytes && previewEditor) {
        const doc = new Doc();
        applyUpdate(doc, bytes);
        const root = doc.getXmlFragment("default"); // TODO: lookup field
        const node = yXmlFragmentToProseMirrorRootNode(
          root,
          parentEditor.schema
        );
        previewEditor.commands.setContent(node.toJSON() as Content);
      }
    }, [bytes, previewEditor, parentEditor]);
    const restore = useCallback(() => {
      parentEditor.commands.setContent(previewEditor?.getJSON() ?? "");
      onVersionRestore?.(version);
    }, [onVersionRestore, parentEditor, previewEditor, version]);

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
            <EditorContent editor={previewEditor} />
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
              disabled={!bytes}
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

/**
 * Displays a specific version of the current TipTap document.
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
