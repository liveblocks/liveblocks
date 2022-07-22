import { useList, useMap, useObject } from "../liveblocks.config";
import Loading from "./Loading";
import Document from "./Document";

export default function DocumentLoader() {
  const blocks = useMap("blocks");
  const blockIds = useList("blockIds");
  const meta = useObject("meta");

  if (blockIds == null || blocks == null || meta == null) {
    return <Loading />;
  }

  return <Document meta={meta} blocks={blocks} blockIds={blockIds} />;
}
