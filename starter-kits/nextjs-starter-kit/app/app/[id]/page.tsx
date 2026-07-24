import { getDocument } from "@/lib/actions";
import { AppDocumentView } from "./AppDocumentView";

export default async function App(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;
  const { data = null, error = null } = await getDocument({ documentId: id });
  return <AppDocumentView initialDocument={data} initialError={error} />;
}
