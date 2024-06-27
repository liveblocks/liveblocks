export function buildSearchRegex(searchText: string): RegExp {
  // Interpret the search string as a regular expression if the search string
  // starts and ends with "/".
  if (
    searchText.startsWith("/") &&
    searchText.endsWith("/") &&
    searchText.length >= 3
  ) {
    try {
      return new RegExp(searchText.substring(1, searchText.length - 1), "i");
    } catch {
      // Fall through, interpret the invalid regex as a literal string match
      // instead
    }
  }

  // Still build a regex to use internally, but simply build one that will
  // match the input literally
  return new RegExp(searchText.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
}
