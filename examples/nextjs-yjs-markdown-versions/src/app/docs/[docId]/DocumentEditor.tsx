"use client";

import { useRoom } from "@liveblocks/react";
import { getYjsProviderForRoom, type LiveblocksYjsProvider } from "@liveblocks/yjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type * as Y from "yjs";

import { useVersions } from "@/lib/use-versions";
import {
  duplicateVersion,
  ensureInitialVersion,
  snapshotCurrentVersion,
} from "@/lib/yjs-versions";

import { EditorCarousel } from "./EditorCarousel";
import { VersionSidebar } from "./VersionSidebar";
import { renameDoc } from "../actions";
import styles from "./DocumentEditor.module.css";

export type LeftPanelMode = "diff" | "preview";

export function DocumentEditor({
  docId,
  initialTitle,
}: {
  docId: string;
  initialTitle: string;
}) {
  const room = useRoom();
  const provider = getYjsProviderForRoom(room) as LiveblocksYjsProvider;
  const yDoc = provider.getYDoc();

  // Ensure at least one version exists. We wait for the first sync before
  // bootstrapping so we don't race with the server-side doc state.
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const onSynced = () => {
      if (cancelled) return;
      ensureInitialVersion(yDoc);
      setBootstrapped(true);
    };
    if (provider.synced) {
      onSynced();
    } else {
      provider.on("sync", onSynced);
    }
    return () => {
      cancelled = true;
      provider.off?.("sync", onSynced);
    };
  }, [provider, yDoc]);

  const versions = useVersions(bootstrapped ? yDoc : null);

  // The user-selected version examined in the left panel. If null, we default
  // to the predecessor of the latest (i.e. diff "previous vs current").
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const effectiveSelectedIndex = useMemo(() => {
    if (versions.length === 0) return -1;
    if (selectedIndex === null) {
      return Math.max(0, versions.length - 2);
    }
    return Math.min(selectedIndex, versions.length - 1);
  }, [selectedIndex, versions]);

  const [leftMode, setLeftMode] = useState<LeftPanelMode>("diff");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={styles.layout}>
      <VersionSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        versions={versions}
        selectedIndex={effectiveSelectedIndex}
        onSelectIndex={(i) => setSelectedIndex(i)}
        currentDocId={docId}
      />
      <div className={styles.main}>
        <Toolbar
          docId={docId}
          initialTitle={initialTitle}
          leftMode={leftMode}
          onLeftModeChange={setLeftMode}
          onCreateVersion={() => {
            snapshotCurrentVersion(yDoc);
            setSelectedIndex(null);
          }}
          onDuplicateSelected={() => {
            if (effectiveSelectedIndex < 0) return;
            duplicateVersion(yDoc, effectiveSelectedIndex);
            setSelectedIndex(null);
          }}
          canDuplicate={effectiveSelectedIndex >= 0 && versions.length > 0}
        />
        <div className={styles.carouselWrap}>
          {bootstrapped && versions.length > 0 ? (
            <EditorCarousel
              yDoc={yDoc}
              provider={provider}
              versions={versions}
              selectedIndex={effectiveSelectedIndex}
              leftMode={leftMode}
            />
          ) : (
            <div className={styles.placeholder}>Preparing document…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Toolbar({
  docId,
  initialTitle,
  leftMode,
  onLeftModeChange,
  onCreateVersion,
  onDuplicateSelected,
  canDuplicate,
}: {
  docId: string;
  initialTitle: string;
  leftMode: LeftPanelMode;
  onLeftModeChange: (mode: LeftPanelMode) => void;
  onCreateVersion: () => void;
  onDuplicateSelected: () => void;
  canDuplicate: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <Link href="/docs" className={styles.backLink}>
          ← Documents
        </Link>
        <input
          className={styles.titleInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={async () => {
            if (title.trim() && title !== initialTitle) {
              await renameDoc(docId, title.trim());
            }
          }}
          spellCheck={false}
        />
      </div>
      <div className={styles.toolbarRight}>
        <div className={styles.modeSwitch} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={leftMode === "diff"}
            className={
              leftMode === "diff" ? styles.modeButtonActive : styles.modeButton
            }
            onClick={() => onLeftModeChange("diff")}
          >
            Diff
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={leftMode === "preview"}
            className={
              leftMode === "preview"
                ? styles.modeButtonActive
                : styles.modeButton
            }
            onClick={() => onLeftModeChange("preview")}
          >
            Preview
          </button>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onDuplicateSelected}
          disabled={!canDuplicate}
          title="Duplicate selected version as a new version"
        >
          Duplicate version
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onCreateVersion}
        >
          + New version
        </button>
      </div>
    </div>
  );
}
