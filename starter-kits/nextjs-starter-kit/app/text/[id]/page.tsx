import { getDocument } from "@/lib/actions";
import { getDocumentId } from "@/utils/urls";
import { TextDocumentView } from "./TextDocumentView";

export default async function Whiteboard(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;

  const documentId = getDocumentId(id);
  const { data = null, error = null } = await getDocument({ documentId });

  return <TextDocumentView initialDocument={data} initialError={error} />;
}
