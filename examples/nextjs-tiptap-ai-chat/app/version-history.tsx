"use client";

import { LiveMap, LiveObject } from "@liveblocks/client";
import {
  useHistoryVersions,
  useHistoryVersionStorageData,
  useRestoreToStorageVersion,
} from "@liveblocks/react";
import {
  HistoryVersionSummary,
  HistoryVersionSummaryList,
} from "@liveblocks/react-ui";
import {
  liveblocksProsemirrorNodeToJson,
  type LiveblocksProsemirrorNode,
  type ProseMirrorJsonNode,
} from "@liveblocks/prosemirror";
import { EditorContent, useEditor } from "@tiptap/react";
import { HistoryIcon, Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { getBaseExtensions } from "./editor-extensions";
import { DOCUMENT_FIELD } from "./initial-document";

/**
 * Google Docs-style version history. The sidebar (shown in place of the chat)
 * lists the room's versions; the preview (shown in place of the editor)
 * renders the selected version's document, reconstructed from its Storage
 * data, with a button to restore it.
 *
 * A version is created automatically right before every AI edit, so each AI
 * change can be undone from here (or from the "Revert" action in the chat).
 */

const EMPTY_DOCUMENT: ProseMirrorJsonNode = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function VersionHistorySidebar({
  selectedVersionId,
  onSelectVersion,
  onClose,
}: {
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
  onClose: () => void;
}) {
  const { versions, isLoading } = useHistoryVersions();

  const sorted = useMemo(
    () =>
      [...(versions ?? [])].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
    [versions]
  );

  // Select the most recent version when the panel opens.
  useEffect(() => {
    if (!selectedVersionId && sorted.length > 0) {
      onSelectVersion(sorted[0].id);
    }
  }, [selectedVersionId, sorted, onSelectVersion]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-sm font-medium">Version history</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close version history"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader size={20} />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <HistoryIcon className="size-6" />
            <p className="text-sm">
              No versions yet. A version is saved automatically before every AI
              edit.
            </p>
          </div>
        ) : (
          <HistoryVersionSummaryList>
            {sorted.map((version) => (
              <HistoryVersionSummary
                key={version.id}
                version={version}
                selected={version.id === selectedVersionId}
                onClick={() => onSelectVersion(version.id)}
              />
            ))}
          </HistoryVersionSummaryList>
        )}
      </div>
    </div>
  );
}

export function VersionHistoryPreview({
  versionId,
  onRestored,
}: {
  versionId: string;
  onRestored: () => void;
}) {
  const { data, isLoading, error } = useHistoryVersionStorageData(versionId);
  const restoreToVersion = useRestoreToStorageVersion(versionId);
  const [restoring, setRestoring] = useState(false);

  // Reconstruct the Tiptap document from the version's Storage tree.
  const document = useMemo(() => {
    if (!data) {
      return undefined;
    }

    const documents = data.get("_tiptap_docs");
    if (!(documents instanceof LiveMap)) {
      return EMPTY_DOCUMENT;
    }

    const documentNode = documents.get(DOCUMENT_FIELD);
    if (!(documentNode instanceof LiveObject)) {
      return EMPTY_DOCUMENT;
    }

    // Nodes under `_tiptap_docs` are always LiveblocksProsemirrorNode trees;
    // there is no runtime check beyond `instanceof LiveObject`.
    return liveblocksProsemirrorNodeToJson(
      documentNode as LiveblocksProsemirrorNode,
      () => EMPTY_DOCUMENT
    );
  }, [data]);

  const restore = async () => {
    if (restoring) {
      return;
    }
    setRestoring(true);
    try {
      await restoreToVersion();
      onRestored();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-950/5 px-4 py-2">
        <span className="text-sm text-muted-foreground">
          Previewing a previous version — the live document is unchanged until
          you restore.
        </span>
        <Button size="sm" onClick={restore} disabled={restoring || !data}>
          {restoring ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Restore this version
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
            Could not load this version: {error.message}
          </div>
        ) : isLoading || !document ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader size={20} />
          </div>
        ) : (
          <div className="mx-auto max-w-[720px] px-12 py-10">
            <PreviewEditor key={versionId} document={document} />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewEditor({ document }: { document: ProseMirrorJsonNode }) {
  const editor = useEditor({
    editable: false,
    content: document,
    extensions: getBaseExtensions({ editable: false }),
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} />;
}
