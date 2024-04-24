import { getDocument } from "@/lib/actions";
import { WhiteboardDocumentView } from "./WhiteboardDocumentView";

export default async function Whiteboard({
  params: { id },
}: {
  params: { id: string };
}) {
  const { data = null, error = null } = await getDocument({ documentId: id });

  return <WhiteboardDocumentView initialDocument={data} initialError={error} />;
}
