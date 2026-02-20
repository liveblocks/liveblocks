import { organizations } from "@/data/organizations";
import { Organization } from "@/types";
import { getUser } from "./getUser";

type Props = {
  userId: string;
};

/**
 * Get Organizations
 *
 * Simulates calling your database and returning a list of organizations
 *
 * @param userId - The user id to get organizations for
 */
export async function getUserOrganizations({ userId }: Props) {
  const user = await getUser(userId);
  if (!user) {
    return [];
  }

  const userOrganizations: Organization[] = [];

  // Add user's organizations from your database
  for (const organizationId of user.organizationIds) {
    const organization = organizations.find((org) => org.id === organizationId);
    if (organization) {
      userOrganizations.push(organization);
    }
  }

  return userOrganizations;
}
