import { notFound } from "next/navigation";
import { getLiveblocks } from "@/lib/liveblocksServer";
import { getRoomId } from "@/lib/room";
import { getHtmlBoxDataFromShapeLike } from "@/lib/htmlBox";
import { toRenderableHtmlDocument } from "@/lib/htmlPreview";

export default async function ReadonlyShapeAliasPage({
  params,
}: {
  params: Promise<{ id: string; shapeId: string }>;
}) {
  const { id, shapeId } = await params;
  const roomId = getRoomId(id);
  const liveblocks = getLiveblocks();

  const doc = (await liveblocks.getStorageDocument(roomId, "json")) as {
    records?: Record<string, unknown>;
  };
  const record = doc.records?.[shapeId];
  const htmlBoxData = getHtmlBoxDataFromShapeLike(record);

  if (!htmlBoxData) {
    notFound();
  }

  return (
    <iframe
      title={htmlBoxData.title}
      sandbox="allow-same-origin"
      srcDoc={toRenderableHtmlDocument(htmlBoxData.html)}
      className="h-screen w-screen border-0"
    />
  );
}
