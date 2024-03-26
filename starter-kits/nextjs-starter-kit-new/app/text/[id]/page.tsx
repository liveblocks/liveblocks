import { getDocument } from "@/libnew/actions/getDocument";
import { TextDocumentView } from "./TextDocumentView";

export default async function Whiteboard({
  params: { id },
}: {
  params: { id: string };
}) {
  const document = await getDocument({ documentId: id });
  const { data = null, error = null } = document;

  return <TextDocumentView initialDocument={data} initialError={error} />;
}
