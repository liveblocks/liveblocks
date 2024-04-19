import { DocumentsLayout } from "@/layouts/Documents";

export default async function DashboardDraftsPage() {
  return <DocumentsLayout filter="drafts" />;
}
