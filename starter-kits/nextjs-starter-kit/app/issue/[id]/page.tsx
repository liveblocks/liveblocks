import { getDocument } from "@/lib/actions";
import { IssueDocumentView } from "./IssueDocumentView";

export default async function Whiteboard({
  params: { id },
}: {
  params: { id: string };
}) {
  const { data = null, error = null } = await getDocument({ documentId: id });

  return <IssueDocumentView initialDocument={data} initialError={error} />;
}
