import { getDocument } from "@/lib/actions";
import { FlowchartDocumentView } from "./FlowchartDocumentView";

export default async function Flowchart(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;
  const { data = null, error = null } = await getDocument({ documentId: id });
  return <FlowchartDocumentView initialDocument={data} initialError={error} />;
}
