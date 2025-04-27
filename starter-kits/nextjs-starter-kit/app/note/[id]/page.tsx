import { getDocument } from "@/lib/actions";
import { getDocumentId } from "@/utils/urls";
import { NoteDocumentView } from "./NoteDocumentView";

export default async function Note(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const documentId = getDocumentId(id);
  const { data = null, error = null } = await getDocument({ documentId });

  return <NoteDocumentView initialDocument={data} initialError={error} />;
}
