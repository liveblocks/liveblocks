import { SidePanelFile } from "./SidePanelFile";
import { SidePanelFolder } from "./SidePanelFolder";
import { Tree } from "./utils";

interface TreeProps {
  fileTree: Tree;
  onFileChange: (filePath: string) => void;
  onDeleteFile: (filePath: string) => void;
  path: string;
  currentPath: string;
}

export function SidePanelNode({
  fileTree,
  onFileChange,
  onDeleteFile,
  path,
  currentPath,
}: TreeProps) {
  return (
    <ul>
      {Object.entries(fileTree).map(([name, node]) => {
        return node.type === "file" ? (
          <SidePanelFile
            key={name}
            name={name}
            node={node}
            onFileChange={onFileChange}
            onDeleteFile={onDeleteFile}
            path={path}
            currentPath={currentPath}
          />
        ) : (
          <SidePanelFolder
            key={name}
            name={name}
            node={node}
            onFileChange={onFileChange}
            onDeleteFile={onDeleteFile}
            path={path}
            currentPath={currentPath}
          />
        );
      })}
    </ul>
  );
}
