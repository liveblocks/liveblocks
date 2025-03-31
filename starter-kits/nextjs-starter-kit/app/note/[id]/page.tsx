import { getDocument } from "@/lib/actions";
import { NoteDocumentView } from "./NoteDocumentView";
import "@blocknote/mantine/style.css";
import "@/components/NoteEditor/blocknote.css";

export default async function Note({
  params: { id },
}: {
  params: { id: string };
}) {
  const { data = null, error = null } = await getDocument({ documentId: id });

  return <NoteDocumentView initialDocument={data} initialError={error} />;
}
