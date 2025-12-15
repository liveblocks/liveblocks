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
export async function getOrganizations({
  userId,
}: Props): Promise<Organization[]> {
  const user = await getUser(userId);

  if (!user) {
    return [];
  }

  // Add user's organizations from your database
  const userOrganizations = organizations.filter((organization) =>
    user.organizationIds.includes(organization.id)
  );

  return userOrganizations;
}
