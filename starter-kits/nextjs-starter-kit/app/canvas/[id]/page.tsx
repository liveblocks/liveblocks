import { getDocument } from "@/lib/actions";
import { getDocumentId } from "@/utils/urls";
import { CanvasDocumentView } from "./CanvasDocumentView";

export default async function Canvas(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;

  const documentId = getDocumentId(id);
  const { data = null, error = null } = await getDocument({ documentId });

  return <CanvasDocumentView initialDocument={data} initialError={error} />;
}
