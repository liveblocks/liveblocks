import { getDocument } from "@/lib/actions";
import { SlideshowDocumentView } from "./SlideshowDocumentView";

export default async function Slideshow(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { id } = params;
  const { data = null, error = null } = await getDocument({ documentId: id });
  return <SlideshowDocumentView initialDocument={data} initialError={error} />;
}
