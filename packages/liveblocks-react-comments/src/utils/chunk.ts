export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0, j = array.length; i < j; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}
