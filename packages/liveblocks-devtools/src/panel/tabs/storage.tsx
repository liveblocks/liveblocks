import { useRenderCount } from "../../hooks/useRenderCount";
import { Tree } from "../components/TreeView";
import { useStorage } from "../contexts/CurrentRoom";

export function Storage() {
  const renderCount = useRenderCount();
  const storage = useStorage();
  return (
    <div className="relative">
      <span className="absolute right-0 top-0 text-gray-400">
        [#{renderCount}]
      </span>
      {storage ? <Tree width={600} data={storage} /> : null}
    </div>
  );
}
