import { getDocument } from "@/lib/actions";
import { TextDocumentView } from "./TextDocumentView";

// Stop Next.js caching getDocument and causing issues
export const dynamic = "force-dynamic";

export default async function Whiteboard({
  params: { id },
}: {
  params: { id: string };
}) {
  const { data = null, error = null } = await getDocument({ documentId: id });

  return <TextDocumentView initialDocument={data} initialError={error} />;
}
