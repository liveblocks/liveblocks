import { useRenderCount } from "../../hooks/useRenderCount";
import { useTheme } from "../theme";

export function Debug() {
  const renderCount = useRenderCount();
  const theme = useTheme();
  return (
    <h1 className="space-x-3">
      <span>Liveblocks ({theme})</span>
      <span className="text-gray-400">[#{renderCount}]</span>
    </h1>
  );
}
