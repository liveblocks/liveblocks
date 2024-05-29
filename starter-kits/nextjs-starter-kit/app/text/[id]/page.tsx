import { getDocument } from "@/lib/actions";
import { TextDocumentView } from "./TextDocumentView";

export default async function Whiteboard({
  params: { id },
}: {
  params: { id: string };
}) {
  const { data = null, error = null } = await getDocument({ documentId: id });

  return <TextDocumentView initialDocument={data} initialError={error} />;
}
