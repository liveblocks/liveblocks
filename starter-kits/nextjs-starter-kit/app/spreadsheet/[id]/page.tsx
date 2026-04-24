import { getDocument } from "@/lib/actions";
import { SpreadsheetDocumentView } from "./SpreadsheetDocumentView";

export default async function Spreadsheet(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;

  const { data = null, error = null } = await getDocument({ documentId: id });

  return (
    <SpreadsheetDocumentView initialDocument={data} initialError={error} />
  );
}
