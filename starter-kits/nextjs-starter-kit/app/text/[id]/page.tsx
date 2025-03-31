import { getDocument } from "@/lib/actions";
import { TextDocumentView } from "./TextDocumentView";

export default async function Whiteboard(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;

  const { data = null, error = null } = await getDocument({ documentId: id });

  return <TextDocumentView initialDocument={data} initialError={error} />;
}
