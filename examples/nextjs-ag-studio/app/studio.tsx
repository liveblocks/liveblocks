"use client";

import { useMutation, useStorage } from "@liveblocks/react/suspense";
import type { AgReportState, AgStudioStateUpdatedEvent } from "ag-studio";
import { AgStudioLicenseManager } from "ag-studio";
import { AgStudio } from "ag-studio-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildPagesFromSnapshot,
  deepEqual,
  reconcileStorage,
  stripLocalPageState,
} from "./report-sync";
import { PRODUCT_DATA } from "./product-data";

// AG Studio runs watermark-free on localhost without a licence key; one is
// only needed on deployed domains. https://www.ag-grid.com/studio/react/licence-install/
if (process.env.NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY) {
  AgStudioLicenseManager.setLicenseKey(
    process.env.NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY
  );
}

/**
 * AG Studio wired up to Liveblocks Storage:
 *
 * - Local edits: every `stateUpdated` event is reconciled into Storage,
 *   writing only the widgets/pages that actually changed (per-widget sync).
 * - Remote edits: whenever the Storage snapshot changes, the shared pages are
 *   rebuilt and applied with `api.setState()`, keeping this user's page
 *   selection, widget selection, and sidebar panels untouched.
 *
 * The loop is safe in both directions: applying a remote update re-emits
 * `stateUpdated`, but reconciling it back into Storage writes nothing because
 * the values are already equal.
 */
export default function CollaborativeStudio() {
  // The AgStudio component instance, which exposes the Studio API
  const studioRef = useRef<AgStudio>(null);

  // The whole Storage snapshot. Liveblocks keeps unchanged subtrees
  // reference-equal across updates, which report-sync.ts relies on to avoid
  // re-rendering unchanged pages.
  const snapshot = useStorage((root) => root);

  const data = useMemo(
    () => ({ sources: [{ id: "products", data: PRODUCT_DATA }] }),
    []
  );

  // True while a remote update is being applied via api.setState(), so the
  // resulting stateUpdated event is not immediately written back to Storage.
  const applyingRemoteRef = useRef(false);
  const apiReadyRef = useRef(false);

  // The state Studio boots with: whatever is in Storage when this client
  // loads (Storage is seeded via initialStorage, so pages always exist),
  // showing the report's first page.
  const [initialState] = useState<AgReportState>(() => {
    const pages = buildPagesFromSnapshot(snapshot);
    return {
      pages,
      selectedPageId: pages[0].id,
      version: snapshot.version ?? undefined,
    };
  });

  const writeLocalChange = useMutation(({ storage }, state: AgReportState) => {
    reconcileStorage(storage, state);
  }, []);

  const onStateUpdated = useCallback(
    ({ state }: AgStudioStateUpdatedEvent) => {
      if (applyingRemoteRef.current) {
        return;
      }
      writeLocalChange(state);
    },
    [writeLocalChange]
  );

  // Apply the current Storage snapshot to Studio, preserving this user's
  // local view (selected page, sidebar panels, active selection).
  const applySnapshot = useCallback(() => {
    const api = studioRef.current?.api;
    if (!api || !apiReadyRef.current) {
      return;
    }

    const targetPages = buildPagesFromSnapshot(snapshot);
    const current = api.getState();

    const sharedChanged =
      (current.version ?? null) !== snapshot.version ||
      !deepEqual(current.pages.map(stripLocalPageState), targetPages);
    if (!sharedChanged) {
      return;
    }

    // Carry each page's local selection over, so a remote change doesn't
    // close the configuration panel this user is working in.
    const currentPagesById = new Map(
      current.pages.map((page) => [page.id, page])
    );
    const pages = targetPages.map((page) => {
      const selection = currentPagesById.get(page.id)?.selection;
      return selection !== undefined ? { ...page, selection } : page;
    });

    // Keep the user on their page, unless it was deleted remotely.
    const selectedPageId = pages.some(
      (page) => page.id === current.selectedPageId
    )
      ? current.selectedPageId
      : pages[0].id;

    applyingRemoteRef.current = true;
    try {
      api.setState({
        ...current,
        pages,
        selectedPageId,
        version: snapshot.version ?? undefined,
      });
    } finally {
      applyingRemoteRef.current = false;
    }
  }, [snapshot]);

  useEffect(() => {
    applySnapshot();
  }, [applySnapshot]);

  const applySnapshotRef = useRef(applySnapshot);
  applySnapshotRef.current = applySnapshot;

  const onApiReady = useCallback(() => {
    apiReadyRef.current = true;
    // Catch up on remote changes that arrived while Studio was booting.
    applySnapshotRef.current();
  }, []);

  return (
    <AgStudio
      ref={studioRef}
      style={{ height: "100%", width: "100%" }}
      data={data}
      mode="edit"
      initialState={initialState}
      onApiReady={onApiReady}
      onStateUpdated={onStateUpdated}
    />
  );
}
