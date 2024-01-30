const PLACEHOLDER_BASE_URL = "https://localhost:9999";
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;

export function setQueryParams(
  url: string,
  params: Record<string, string | number | undefined>
) {
  const isAbsolute = ABSOLUTE_URL_REGEX.test(url);
  const urlObject = new URL(url, isAbsolute ? undefined : PLACEHOLDER_BASE_URL);

  for (const [param, value] of Object.entries(params)) {
    if (value) {
      urlObject.searchParams.set(param, String(value));
    }
  }

  return isAbsolute
    ? urlObject.href
    : urlObject.href.replace(PLACEHOLDER_BASE_URL, "");
}
