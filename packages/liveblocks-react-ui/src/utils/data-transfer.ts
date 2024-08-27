import { exists } from "./exists";

export function hasFiles(dataTransfer: DataTransfer) {
  return dataTransfer.types.includes("Files");
}

export function getFiles(dataTransfer: DataTransfer) {
  const files = Array.from(dataTransfer.items)
    .map((item) => {
      const entry = item.webkitGetAsEntry();

      return entry && entry.isFile ? item.getAsFile() : null;
    })
    .filter(exists);

  return files;
}
