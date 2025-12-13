"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useMemo } from "react";
import { CheckIcon, SignOutIcon } from "@/icons";
import { getUserOrganizations } from "@/lib/actions/getUserOrganizations";
import { switchOrganization } from "@/lib/actions/switchOrganization";
import { useDocumentsFunctionSWR } from "@/lib/hooks/useDocumentsFunctionSWR";
import { Popover } from "@/primitives/Popover";
import styles from "./OrganizationPopover.module.css";

function OrganizationPopoverContent() {
  const { data: session } = useSession();

  // Get a list of organizations for the current user
  const {
    data: organizations,
    // mutate: revalidateOrganizations,
    // error: organizationsError,
  } = useDocumentsFunctionSWR([getUserOrganizations, []], {
    refreshInterval: 0,
  });

  const currentOrganization = useMemo(() => {
    if (!session || !organizations) {
      return null;
    }

    const currentId = session.user.currentOrganizationId;
    return (
      organizations.find((org) => org.id === currentId) || organizations[0]
    );
  }, [organizations, session]);

  const handleOrganizationChange = useCallback(
    async (organizationId: string) => {
      if (organizationId === session?.user.currentOrganizationId) {
        return;
      }

      const result = await switchOrganization(organizationId);

      if (result.error) {
        console.error("Failed to switch organization:", result.error);
        return;
      }

      // Refresh the page to re-authenticate with Liveblocks for the new organization
      // This will cause the auth callback to read the new organization from the cookie
      window.location.reload();
    },
    [session]
  );

  if (!session) {
    return null;
  }

  return (
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
          <div className={styles.organizationsLabel}>Workplaces</div>
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
        <div className={styles.organizationItem}>
          <SignOutIcon className={styles.organizationItemAvatar} />
          Sign out
        </div>
      </div>
    </div>
  );
}

export function OrganizationPopover() {
  const { data: session } = useSession();

  if (!session) {
    return null;
  }

  return (
    <Popover
      align="start"
      alignOffset={-6}
      content={<OrganizationPopoverContent />}
      side="bottom"
      sideOffset={6}
    >
      <button className={styles.profileButton}>
        <Image
          width={24}
          height={24}
          src={session.user.info.avatar ?? ""}
          alt={session.user.info.name}
          className={styles.profileAvatar}
        />
        <span className={styles.profileButtonName}>
          {session.user.info.name}
        </span>
      </button>
    </Popover>
  );
}
