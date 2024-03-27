import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardLayout } from "@/layouts/Dashboard";
import { DocumentsLayout } from "@/layouts/Documents";
import { getGroups } from "@/lib/server/database/getGroups";

type Props = {
  params: { groupId: string };
};

export default async function DashboardGroupPage({ params }: Props) {
  const session = await auth();

  // If not logged in, go to marketing page
  if (!session) {
    redirect("/");
  }

  const groups = await getGroups(session?.user.info.groupIds ?? []);

  return (
    <DashboardLayout groups={groups}>
      <DocumentsLayout
        filter="group"
        group={groups.find((group) => group.id === params.groupId)}
      />
    </DashboardLayout>
  );
}
