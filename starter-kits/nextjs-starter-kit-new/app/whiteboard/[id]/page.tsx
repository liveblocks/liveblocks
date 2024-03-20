import WhiteboardDocumentView from "@/app/whiteboard/[id]/WhiteboardDocumentView";
import { getDocument } from "@/libnew/getDocument";

export default async function Whiteboard({
  params: { id },
}: {
  params: { id: string };
}) {
  const document = await getDocument({ documentId: id });
  const { data = null, error = null } = document;

  return <WhiteboardDocumentView initialDocument={data} initialError={error} />;
}
