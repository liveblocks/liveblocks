import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardLayout } from "@/layouts/Dashboard";
import { DocumentsLayout } from "@/layouts/Documents";
import { getGroups } from "@/lib/server/database/getGroups";

export default async function DashboardPage({}) {
  const session = await auth();

  // If not logged in, go to marketing page
  if (!session) {
    redirect("/");
  }

  console.log(session);

  const groups = await getGroups(session?.user.info.groupIds ?? []);

  return (
    <DashboardLayout groups={groups}>
      <DocumentsLayout filter="all" />
    </DashboardLayout>
  );
}
