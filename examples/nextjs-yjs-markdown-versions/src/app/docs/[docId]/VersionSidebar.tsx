"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { listMyDocs } from "../actions";
import { parseRoomId, type DocRoom } from "@/lib/room-ids";
import type { VersionInfo } from "@/lib/yjs-versions";

import styles from "./VersionSidebar.module.css";

type SidebarSection = "documents" | "versions";

export function VersionSidebar({
  open,
  onToggle,
  versions,
  selectedIndex,
  onSelectIndex,
  currentDocId,
}: {
  open: boolean;
  onToggle: () => void;
  versions: VersionInfo[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  currentDocId: string;
}) {
  const [section, setSection] = useState<SidebarSection>("versions");

  return (
    <aside
      className={open ? styles.sidebar : styles.sidebarCollapsed}
      aria-label="Document and version navigation"
    >
      <button
        type="button"
        className={styles.toggleButton}
        onClick={onToggle}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        title={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        {open ? "‹" : "›"}
      </button>

      {open ? (
        <>
          <div className={styles.tabRow} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={section === "documents"}
              className={
                section === "documents" ? styles.tabActive : styles.tab
              }
              onClick={() => setSection("documents")}
            >
              Documents
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === "versions"}
              className={
                section === "versions" ? styles.tabActive : styles.tab
              }
              onClick={() => setSection("versions")}
            >
              Versions ({versions.length})
            </button>
          </div>

          {section === "documents" ? (
            <DocumentsSection currentDocId={currentDocId} />
          ) : (
            <VersionsSection
              versions={versions}
              selectedIndex={selectedIndex}
              onSelectIndex={onSelectIndex}
            />
          )}
        </>
      ) : null}
    </aside>
  );
}

function VersionsSection({
  versions,
  selectedIndex,
  onSelectIndex,
}: {
  versions: VersionInfo[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}) {
  return (
    <ul className={styles.list}>
      {versions.map((v, i) => {
        const isCurrent = i === versions.length - 1;
        const isSelected = i === selectedIndex;
        return (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onSelectIndex(i)}
              className={isSelected ? styles.itemSelected : styles.item}
            >
              <span className={styles.itemIndex}>v{i + 1}</span>
              <span className={styles.itemBody}>
                <span className={styles.itemLabel}>
                  {v.label ?? (isCurrent ? "Current draft" : "Snapshot")}
                </span>
                <span className={styles.itemTime}>
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </span>
              {isCurrent ? (
                <span className={styles.currentBadge}>current</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function DocumentsSection({ currentDocId }: { currentDocId: string }) {
  const [docs, setDocs] = useState<DocRoom[] | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const list = await listMyDocs();
      if (!cancelled) setDocs(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (docs === null) {
    return <div className={styles.empty}>Loading documents…</div>;
  }

  if (docs.length === 0) {
    return <div className={styles.empty}>No other documents.</div>;
  }

  return (
    <ul className={styles.list}>
      {docs.map((room) => {
        const parsed = parseRoomId(room.id);
        const docId = parsed?.docId ?? room.id;
        const isCurrent = docId === currentDocId;
        const title = room.metadata?.title || "Untitled document";
        return (
          <li key={room.id}>
            {isCurrent ? (
              <div className={styles.itemSelected}>
                <span className={styles.docDot} />
                <span className={styles.itemBody}>
                  <span className={styles.itemLabel}>{title}</span>
                  <span className={styles.itemTime}>opened</span>
                </span>
              </div>
            ) : (
              <Link href={`/docs/${docId}`} className={styles.item}>
                <span className={styles.docDot} />
                <span className={styles.itemBody}>
                  <span className={styles.itemLabel}>{title}</span>
                  <span className={styles.itemTime}>
                    {new Date(
                      room.lastConnectionAt ?? room.createdAt
                    ).toLocaleDateString()}
                  </span>
                </span>
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
