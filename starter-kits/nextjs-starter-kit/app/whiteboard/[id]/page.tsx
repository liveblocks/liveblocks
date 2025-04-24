import { getDocument } from "@/lib/actions";
import { WhiteboardDocumentView } from "./WhiteboardDocumentView";

export default async function Whiteboard(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;

  const { data = null, error = null } = await getDocument({ documentId: id });

  return <WhiteboardDocumentView initialDocument={data} initialError={error} />;
}
