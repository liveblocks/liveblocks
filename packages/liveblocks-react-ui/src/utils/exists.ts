export function exists<T>(input: null | undefined | T): input is T {
  return input !== null && input !== undefined;
}
