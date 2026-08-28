import { useCallback } from "react";

interface ManageGroupParams {
  groupId: string;
  userId?: string;
  childId?: string;
}

interface GroupParams {
  groupId: string;
}

interface UseManageGroupsReturn {
  addToGroup: (params: ManageGroupParams) => Promise<void>;
  removeFromGroup: (params: ManageGroupParams) => Promise<void>;
  createGroup: (params: GroupParams) => Promise<void>;
  getGroup: (params: GroupParams) => Promise<void>;
}

export function useManageGroups(): UseManageGroupsReturn {
  const createGroup = useCallback(async ({ groupId }: GroupParams) => {
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ groupId }),
    });

    if (!response.ok) {
      throw new Error("Failed to create group");
    }

    return response.json();
  }, []);

  const addToGroup = useCallback(
    async ({ groupId, userId, childId }: ManageGroupParams) => {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, childId }),
      });

      if (!response.ok) {
        throw new Error("Failed to add to group");
      }

      return response.json();
    },
    []
  );

  const removeFromGroup = useCallback(
    async ({ groupId, userId, childId }: ManageGroupParams) => {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, childId }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove from group");
      }

      return response.json();
    },
    []
  );

  const getGroup = useCallback(async ({ groupId }: GroupParams) => {
    const response = await fetch(`/api/groups/${groupId}`);

    if (!response.ok) {
      throw new Error("Failed to get group");
    }

    return response.json();
  }, []);

  return {
    createGroup,
    addToGroup,
    removeFromGroup,
    getGroup,
  };
}
