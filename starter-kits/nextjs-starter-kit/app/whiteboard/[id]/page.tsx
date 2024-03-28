import { getDocument } from "@/lib/actions";
import { WhiteboardDocumentView } from "./WhiteboardDocumentView";

export default async function Whiteboard({
  params: { id },
}: {
  params: { id: string };
}) {
  const document = await getDocument({ documentId: id });
  const { data = null, error = null } = document;

  return <WhiteboardDocumentView initialDocument={data} initialError={error} />;
}
