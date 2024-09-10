const PLACEHOLDER_BASE_URL = "https://localhost:9999";
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;

export function generateCommentUrl({
  roomUrl,
  commentId,
}: {
  roomUrl: string;
  commentId: string;
}): string {
  const isAbsolute = ABSOLUTE_URL_REGEX.test(roomUrl);
  const urlObject = new URL(
    roomUrl,
    isAbsolute ? undefined : PLACEHOLDER_BASE_URL
  );

  urlObject.hash = `#${commentId}`;

  return isAbsolute
    ? urlObject.href
    : urlObject.href.replace(PLACEHOLDER_BASE_URL, "");
}
