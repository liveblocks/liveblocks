import { getDocument } from "@/lib/actions";
import { AiChatDocumentView } from "./AiChatDocumentView";

export default async function Whiteboard(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;

  const { data = null, error = null } = await getDocument({ documentId: id });

  return <AiChatDocumentView initialDocument={data} initialError={error} />;
}
