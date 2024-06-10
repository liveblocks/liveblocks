/**
 * Before: "@liveblocks/react-comments": "^1.12.0"
 *  After: "@liveblocks/react-ui": "^1.12.0"
 */
export function replaceReactCommentsInPackageJson(file: string) {
  return file.replace(
    /(["'])@liveblocks\/react-comments\1:/g,
    "$1@liveblocks/react-ui$1:"
  );
}

/**
 * Before: @import "@liveblocks/react-comments/styles.css"
 *  After: @import "@liveblocks/react-ui/styles.css"
 */
export function replaceReactCommentsImportsInCss(file: string) {
  return file.replace(
    /(@import\s+(?:url\()?(['"]))@liveblocks\/react-comments\/styles((?:.*)\.css\2\)?)/g,
    "$1@liveblocks/react-ui/styles$3"
  );
}
