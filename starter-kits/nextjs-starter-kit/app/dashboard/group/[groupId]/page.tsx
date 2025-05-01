import { DocumentsLayout } from "@/layouts/Documents";

type Props = {
  params: Promise<{ groupId: string }>;
};

export default async function DashboardGroupPage(props: Props) {
  const params = await props.params;
  return <DocumentsLayout filter="group" groupId={params.groupId} />;
}
