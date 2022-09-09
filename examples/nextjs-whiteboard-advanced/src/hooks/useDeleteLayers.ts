import { useSelf, useMutation } from "../../liveblocks.config";

/**
 * Delete all the selected layers.
 */
export default function useDeleteLayers() {
  const selection = useSelf((me) => me.presence.selection);
  return useMutation(
    ({ root }) => {
      const liveLayers = root.get("layers");
      const liveLayerIds = root.get("layerIds");
      for (const id of selection) {
        // Delete the layer from the layers LiveMap
        liveLayers.delete(id);
        // Find the layer index in the z-index list and remove it
        const index = liveLayerIds.indexOf(id);
        if (index !== -1) {
          liveLayerIds.delete(index);
        }
      }
    },
    [selection]
  );
}
