"use client";

import { useRoom } from "@liveblocks/react";
import { getYjsProviderForRoom, type LiveblocksYjsProvider } from "@liveblocks/yjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import { useVersions } from "@/lib/use-versions";
import {
  duplicateVersion,
  ensureInitialVersion,
  snapshotCurrentVersion,
} from "@/lib/yjs-versions";

import { EditorCarousel } from "./EditorCarousel";
import { VersionSidebar } from "./VersionSidebar";
import { renameDoc } from "../actions";

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

  // `selectedIndex` is the FOCUSED (right-panel) version index. The LEFT
  // panel automatically shows its predecessor (or "(first version)" if 0).
  // When null we default to the latest, which is the editable one.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const effectiveSelectedIndex = useMemo(() => {
    if (versions.length === 0) return -1;
    if (selectedIndex === null) return versions.length - 1;
    return Math.min(Math.max(selectedIndex, 0), versions.length - 1);
  }, [selectedIndex, versions]);

  const [leftMode, setLeftMode] = useState<LeftPanelMode>("diff");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleCreateVersion = useCallback(() => {
    snapshotCurrentVersion(yDoc);
    setSelectedIndex(null);
  }, [yDoc]);

  // Cmd/Ctrl + Enter creates a new version from anywhere on the page,
  // including from inside a Monaco editor (Monaco doesn't bind this
  // combo by default, so the event bubbles up to the document).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        handleCreateVersion();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCreateVersion]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <VersionSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        versions={versions}
        selectedIndex={effectiveSelectedIndex}
        onSelectIndex={(i) => setSelectedIndex(i)}
        currentDocId={docId}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Toolbar
          docId={docId}
          initialTitle={initialTitle}
          leftMode={leftMode}
          onLeftModeChange={setLeftMode}
          onCreateVersion={handleCreateVersion}
          onDuplicateSelected={() => {
            if (effectiveSelectedIndex < 0) return;
            duplicateVersion(yDoc, effectiveSelectedIndex);
            setSelectedIndex(null);
          }}
          canDuplicate={
            effectiveSelectedIndex >= 0 &&
            versions.length > 0 &&
            // Duplicating the latest version is exactly what
            // "+ New version" already does, so disable the button
            // when the focused version IS the latest.
            effectiveSelectedIndex !== versions.length - 1
          }
          showLeftModeSwitch={versions.length >= 2}
        />
        <div className="bg-bg-muted relative min-h-0 flex-1 overflow-hidden">
          {bootstrapped && versions.length > 0 ? (
            <EditorCarousel
              yDoc={yDoc}
              provider={provider}
              versions={versions}
              selectedIndex={effectiveSelectedIndex}
              leftMode={leftMode}
            />
          ) : (
            <div className="text-text-muted flex h-full items-center justify-center text-[13px]">
              Preparing document…
            </div>
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
  showLeftModeSwitch,
}: {
  docId: string;
  initialTitle: string;
  leftMode: LeftPanelMode;
  onLeftModeChange: (mode: LeftPanelMode) => void;
  onCreateVersion: () => void;
  onDuplicateSelected: () => void;
  canDuplicate: boolean;
  showLeftModeSwitch: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  return (
    <div className="bg-bg-elev border-border flex h-[52px] flex-none items-center justify-between gap-3 border-b px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href="/docs"
          className="text-text-muted hover:text-text whitespace-nowrap text-xs"
        >
          ← Documents
        </Link>
        <input
          className="text-text focus:bg-bg-muted min-w-0 flex-1 rounded-md border-0 bg-transparent px-2 py-1.5 text-[15px] font-semibold outline-none"
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
      <div className="flex items-center gap-2">
        {showLeftModeSwitch ? (
          <div
            role="tablist"
            className="border-border-strong inline-flex overflow-hidden rounded-lg border"
            aria-label="Left panel mode"
          >
            <ModeButton
              label="Diff"
              active={leftMode === "diff"}
              onClick={() => onLeftModeChange("diff")}
            />
            <ModeButton
              label="Preview"
              active={leftMode === "preview"}
              onClick={() => onLeftModeChange("preview")}
              borderLeft
            />
          </div>
        ) : null}
        <button
          type="button"
          className="border-border-strong text-text hover:bg-bg-muted h-[30px] cursor-pointer rounded-lg border bg-transparent px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onDuplicateSelected}
          disabled={!canDuplicate}
          title={
            canDuplicate
              ? "Duplicate selected version as a new version"
              : "Use + New version to snapshot the current draft"
          }
        >
          Duplicate version
        </button>
        <button
          type="button"
          className="bg-accent text-accent-fg inline-flex h-[30px] cursor-pointer items-center gap-2 rounded-lg border border-transparent pl-3.5 pr-1.5 text-xs font-semibold hover:brightness-105"
          onClick={onCreateVersion}
          title={`New version (${isMac ? "⌘" : "Ctrl"}+Enter)`}
        >
          <span>+ New version</span>
          <kbd className="font-mono inline-flex h-5 items-center rounded border border-white/25 bg-white/10 px-1.5 text-[10px] tracking-wide">
            {isMac ? "⌘" : "Ctrl"}
            <span aria-hidden className="mx-0.5">
              +
            </span>
            ↵
          </kbd>
        </button>
      </div>
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
  borderLeft,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  borderLeft?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        "h-[30px] cursor-pointer border-0 bg-transparent px-3 text-xs font-semibold",
        active ? "bg-bg-muted text-text" : "text-text-muted",
        borderLeft && "border-border-strong border-l"
      )}
    >
      {label}
    </button>
  );
}
