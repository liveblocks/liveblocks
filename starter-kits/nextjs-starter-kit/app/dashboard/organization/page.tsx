import { DocumentsList } from "@/components/DocumentsList";

export default async function DashboardPage() {
  return <DocumentsList filter="organization" />;
}
