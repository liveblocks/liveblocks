import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardLayout } from "@/layouts/Dashboard";
import { DocumentsLayout } from "@/layouts/Documents";
import { getGroups } from "@/lib/server/database/getGroups";

export default async function DashboardDraftsPage() {
  const session = await auth();

  // If not logged in, go to marketing page
  if (!session) {
    redirect("/");
  }

  const groups = await getGroups(session?.user.info.groupIds ?? []);

  return (
    <DashboardLayout groups={groups}>
      <DocumentsLayout filter="drafts" />
    </DashboardLayout>
  );
}
