"use client";

import { useIsInsideRoom } from "@liveblocks/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useMemo } from "react";
import { DASHBOARD_URL } from "@/constants";
import { CheckIcon, SelectIcon, SignOutIcon } from "@/icons";
import {
  getOrganizations,
  getUserOrganizations,
  switchOrganization,
} from "@/lib/actions";
import { useInitialDocument } from "@/lib/hooks";
import { useDocumentsFunctionSWR } from "@/lib/hooks/useDocumentsFunctionSWR";
import { Popover } from "@/primitives/Popover";
import { Organization } from "@/types";
import styles from "./OrganizationPopover.module.css";

export function OrganizationPopover() {
  const router = useRouter();
  const { data: session } = useSession();
  const isInsideRoom = useIsInsideRoom();

  // Get a list of organizations for the current user
  const {
    data: organizations,
    // mutate: revalidateOrganizations,
    // error: organizationsError,
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

  // Changes organizations then go to dashboard
  const handleOrganizationChange = useCallback(
    async (organizationId: string) => {
      if (organizationId === session?.user.currentOrganizationId) {
        // If current organization is clicked, go to dashboard
        router.push(DASHBOARD_URL);
        return;
      }

      const result = await switchOrganization(organizationId);

      if (result.error) {
        console.error("Failed to switch organization:", result.error);
        return;
      }

      // Always hard refresh/replace the page to re-authenticate with Liveblocks
      // for a new organization. This will cause the Liveblocks auth callback to
      // read the new organization from the cookie. Goes to the dashboard.
      window.location.replace(DASHBOARD_URL);
    },
    [session, router]
  );

  if (!session) {
    return null;
  }

  return (
    <Popover
      align="start"
      alignOffset={-6}
      content={
        <div className={styles.profilePopover}>
          <div className={styles.profilePopoverInfo}>
            <Image
              width={40}
              height={40}
              src={session.user.info.avatar ?? ""}
              alt={session.user.info.name}
              className={styles.profilePopoverAvatar}
            />
            <div className={styles.profilePopoverInfoText}>
              <span className={styles.profilePopoverName}>
                {session.user.info.name}
              </span>
              <span className={styles.profilePopoverId}>
                {session.user.info.id}
              </span>
            </div>
          </div>

          {organizations && organizations.length > 0 && (
            <div className={styles.organizationsSection}>
              <div className={styles.organizationsLabel}>Workspaces</div>
              {organizations.map((organization) => {
                const isSelected = organization.id === currentOrganization?.id;
                const avatar =
                  organization.id === session.user.info.id
                    ? session.user.info.avatar
                    : organization.avatar;

                return (
                  <button
                    key={organization.id}
                    className={styles.organizationItem}
                    onClick={() => handleOrganizationChange(organization.id)}
                  >
                    {avatar && (
                      <Image
                        src={avatar}
                        width={20}
                        height={20}
                        alt={organization.name}
                        className={styles.organizationItemAvatar}
                      />
                    )}
                    <span className={styles.organizationItemName}>
                      {organization.name}
                    </span>
                    {isSelected && <CheckIcon className={styles.checkIcon} />}
                  </button>
                );
              })}
            </div>
          )}

          <div className={styles.profilePopoverActions}>
            <button
              className={styles.organizationItem}
              onClick={() => signOut()}
            >
              <SignOutIcon className={styles.organizationItemAvatar} />
              Sign out
            </button>
          </div>
        </div>
      }
      side="bottom"
      sideOffset={6}
    >
      <button
        className={styles.profileButton}
        data-loading={!currentOrganization || undefined}
        suppressHydrationWarning={true}
      >
        {currentOrganization ? (
          isInsideRoom ? (
            <DocumentOrganizationTrigger
              currentOrganization={currentOrganization}
            />
          ) : (
            <OrganizationTrigger organization={currentOrganization} />
          )
        ) : (
          <OrganizationTriggerPlaceholder />
        )}
        <SelectIcon className={styles.profileButtonIcon} />
      </button>
    </Popover>
  );
}

// If inside a document, show this documents organization in the trigger
function DocumentOrganizationTrigger({
  currentOrganization,
}: {
  currentOrganization: Organization;
}) {
  const document = useInitialDocument();

  // Get the current document's organization
  const { data: documentOrganizations, error: organizationsError } =
    useDocumentsFunctionSWR(
      [getOrganizations, { organizationIds: [document.organization] }],
      {
        refreshInterval: 0,
      }
    );

  // Skip the loading placeholder if in the correct organization already
  if (currentOrganization.id === document.organization) {
    return <OrganizationTrigger organization={currentOrganization} />;
  }

  if (
    !documentOrganizations ||
    documentOrganizations.length === 0 ||
    organizationsError
  ) {
    return <OrganizationTriggerPlaceholder />;
  }

  // Show the current document's organization after fetchingit
  return (
    <OrganizationTrigger organization={documentOrganizations?.[0] ?? null} />
  );
}

function OrganizationTrigger({ organization }: { organization: Organization }) {
  return (
    <>
      <Image
        width={24}
        height={24}
        src={organization.avatar}
        alt={organization.name}
        className={styles.profileAvatar}
      />
      <span className={styles.profileButtonName}>{organization.name}</span>
    </>
  );
}

function OrganizationTriggerPlaceholder() {
  return (
    <>
      <div className={styles.profileButtonPlaceholderAvatar} />
      <div className={styles.profileButtonPlaceholderName} />
    </>
  );
}
