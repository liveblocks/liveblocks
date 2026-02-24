import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { getUserOrganizations } from "@/lib/actions";
import { useDocumentsFunctionSWR } from "@/lib/hooks";

export function useCurrentOrganization() {
  const { data: session } = useSession();

  // Get a list of organizations for the current user
  const {
    data: organizations,
    mutate,
    error,
    isLoading,
  } = useDocumentsFunctionSWR([getUserOrganizations, []], {
    refreshInterval: 0,
  });

  const currentOrganization = useMemo(() => {
    if (!session || !organizations || organizations.length === 0) {
      return null;
    }

    const currentId = session.user.currentOrganizationId;
    const found = organizations.find((org) => org.id === currentId);

    if (found) {
      return found;
    }

    return organizations[0];
  }, [organizations, session]);

  return { currentOrganization, isLoading, error, mutate };
}
