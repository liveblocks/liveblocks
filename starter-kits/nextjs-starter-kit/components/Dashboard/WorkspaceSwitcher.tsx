"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getWorkspaces } from "@/lib/actions/getWorkspaces";
import { switchWorkspace } from "@/lib/actions/switchWorkspace";
import { Select } from "@/primitives/Select";
import { Workspace } from "@/types";
import styles from "./WorkspaceSwitcher.module.css";

export function WorkspaceSwitcher() {
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    if (session?.user?.info?.id) {
      getWorkspaces().then(setWorkspaces);
    }
  }, [session?.user?.info?.id]);

  const workspaceItems = useMemo(() => {
    if (workspaces.length === 0) {
      return [];
    }

    return workspaces.map((workspace) => ({
      value: workspace.id,
      title: workspace.name,
    }));
  }, [workspaces]);

  const handleWorkspaceChange = useCallback(
    async (workspaceId: string) => {
      if (workspaceId === session?.user.currentWorkspaceId) {
        return;
      }

      const result = await switchWorkspace(workspaceId);

      if (result.error) {
        console.error("Failed to switch workspace:", result.error);
        return;
      }

      // Refresh the page to re-authenticate with Liveblocks for the new tenant
      // This will cause the auth callback to read the new workspace from the cookie
      window.location.reload();
    },
    [session]
  );

  if (!session || workspaceItems.length === 0) {
    return null;
  }

  // Don't show switcher if user only has one workspace
  if (workspaceItems.length <= 1) {
    return null;
  }

  return (
    <div className={styles.workspaceSwitcher}>
      <Select
        value={session.user.currentWorkspaceId || workspaceItems[0]?.value}
        items={workspaceItems}
        onChange={handleWorkspaceChange}
        placeholder="Select workspace"
      />
    </div>
  );
}
