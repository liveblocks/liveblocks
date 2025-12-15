import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { auth } from "@/auth";
import { DashboardLayout } from "@/layouts/Dashboard";
import { getGroups } from "@/lib/actions";
import { getCurrentOrganizationGroupIds } from "@/lib/utils/getCurrentOrganizationGroupIds";

export default async function Dashboard({ children }: { children: ReactNode }) {
  const session = await auth();

  // If not logged in, go to marketing page
  if (!session) {
    redirect("/");
  }

  const groupIds = await getCurrentOrganizationGroupIds(session.user.info.id);
  const groups = await getGroups(groupIds);

  return <DashboardLayout groups={groups}>{children}</DashboardLayout>;
}
