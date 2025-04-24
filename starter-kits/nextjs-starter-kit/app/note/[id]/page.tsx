import { getDocument } from "@/lib/actions";
import { NoteDocumentView } from "./NoteDocumentView";

export default async function Note(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const { data = null, error = null } = await getDocument({ documentId: id });

  return <NoteDocumentView initialDocument={data} initialError={error} />;
}
