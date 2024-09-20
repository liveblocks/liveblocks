import { exists } from "./exists";

export function getFiles(dataTransfer: DataTransfer) {
  if (!dataTransfer.types.includes("Files")) {
    return [];
  }

  // We start by attempting to get files with `webkitGetAsEntry` as
  // it allows us to filter out directories.
  //
  // Example: Copying a local file
  let files = Array.from(dataTransfer.items)
    .map((item) => {
      const entry = item.webkitGetAsEntry();

      return entry && entry.isFile ? item.getAsFile() : null;
    })
    .filter(exists);

  // Then, since `dataTransfer.types` specifies that there are files
  // but we couldn't get any with `webkitGetAsEntry`, we try to get
  // them with `files`
  //
  // Example: Copying an image from a website
  if (!files.length) {
    files = Array.from(dataTransfer.files).filter((file) => file.type !== "");
  }

  return files;
}
