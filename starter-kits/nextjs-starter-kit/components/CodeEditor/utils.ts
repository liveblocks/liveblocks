export type FileArray = [string, unknown][];

export type FileNode = {
  type: "file";
  content: string;
};

export type FolderNode = {
  type: "folder";
  children: Tree;
};

export type TreeNode = FileNode | FolderNode;
export type Tree = Record<string, TreeNode>;

export function convertFilesToFileTree(fileArray: FileArray): Tree {
  const root: Tree = {};

  fileArray.forEach(([path, _]) => {
    let currentLevel = root;
    const parts = path.split("/");

    parts.forEach((part, idx) => {
      if (!currentLevel[part]) {
        if (idx === parts.length - 1) {
          currentLevel[part] = { type: "file", content: path };
        } else {
          currentLevel[part] = { type: "folder", children: {} };
        }
      }
      if (currentLevel[part].type === "folder") {
        currentLevel = currentLevel = (currentLevel[part] as FolderNode)
          .children;
      }
    });
  });

  return root;
}
