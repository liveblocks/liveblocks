import { AiChatsSidebar } from "@/components/AiChats";
import { DocumentHeader, DocumentHeaderSkeleton } from "@/components/Document";
import { DocumentLayout, DocumentProviders } from "@/layouts/Document";
import { ErrorLayout } from "@/layouts/Error";
import { getDocument } from "@/lib/actions";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data = null, error = null } = await getDocument({ documentId: id });

  if (error) {
    return <ErrorLayout error={error} />;
  }

  if (!data) {
    return <DocumentLayout header={<DocumentHeaderSkeleton />} />;
  }

  return (
    <DocumentProviders roomId={id} initialDocument={data}>
      <DocumentLayout header={<DocumentHeader documentId={data.id} />}>
        <div>
          <AiChatsSidebar />
          {children}
        </div>
      </DocumentLayout>
    </DocumentProviders>
  );
}
