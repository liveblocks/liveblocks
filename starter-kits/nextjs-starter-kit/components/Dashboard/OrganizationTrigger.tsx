"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { getUserOrganizations } from "@/lib/actions/getUserOrganizations";
import { Organization } from "@/types";
import styles from "./DashboardHeader.module.css";

export function OrganizationTrigger() {
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    if (session?.user?.info?.id) {
      getUserOrganizations().then(setOrganizations);
    }
  }, [session?.user?.info?.id]);

  const currentOrganization = useMemo(() => {
    if (!session?.user?.info?.id) {
      return null;
    }

    const currentId = session.user.currentOrganizationId;

    // Otherwise find it in the organizations list
    return organizations.find((org) => org.id === currentId) || null;
  }, [organizations, session?.user]);

  if (!session || !currentOrganization) {
    return null;
  }

  const avatar =
    currentOrganization.id === session.user.info.id
      ? session.user.info.avatar
      : currentOrganization.avatar;

  return (
    <button className={styles.organizationTrigger}>
      {avatar && (
        <img
          src={avatar}
          alt={currentOrganization.name}
          className={styles.organizationAvatar}
        />
      )}
      <span className={styles.organizationName}>
        {currentOrganization.name}
      </span>
    </button>
  );
}
