import { getDocument } from "@/lib/actions";
import { WhiteboardDocumentView } from "./WhiteboardDocumentView";

// Stop Next.js caching getDocument and causing issues
export const dynamic = "force-dynamic";

export default async function Whiteboard({
  params: { id },
}: {
  params: { id: string };
}) {
  const { data = null, error = null } = await getDocument({ documentId: id });

  return <WhiteboardDocumentView initialDocument={data} initialError={error} />;
}
