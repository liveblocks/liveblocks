import { DocumentsLayout } from "@/layouts/Documents";

type Props = {
  params: { groupId: string };
};

export default async function DashboardGroupPage({ params }: Props) {
  return <DocumentsLayout filter="group" groupId={params.groupId} />;
}
