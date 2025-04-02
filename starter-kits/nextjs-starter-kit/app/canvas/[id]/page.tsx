import { getDocument } from "@/lib/actions";
import { CanvasDocumentView } from "./CanvasDocumentView";

export default async function Canvas(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;

  const { data = null, error = null } = await getDocument({ documentId: id });

  return <CanvasDocumentView initialDocument={data} initialError={error} />;
}
