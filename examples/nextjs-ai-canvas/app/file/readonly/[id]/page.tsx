import { FileRoom } from "@/components/canvas/FileRoom";

export default async function ReadonlyFilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FileRoom fileId={id} readonly />;
}
