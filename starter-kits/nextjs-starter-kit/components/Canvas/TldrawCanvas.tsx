import "tldraw/tldraw.css";
import { useSelf } from "@liveblocks/react/suspense";
import { Tldraw } from "tldraw";
import { useStorageStore } from "./useStorageStore";

export function TldrawCanvas() {
  const store = useStorageStore();
  const canWrite = useSelf((me) => me.canWrite);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Tldraw
        store={store}
        onMount={(editor) => {
          editor.updateInstanceState({ isReadonly: !canWrite });
        }}
        autoFocus
        inferDarkMode
      />
    </div>
  );
}
