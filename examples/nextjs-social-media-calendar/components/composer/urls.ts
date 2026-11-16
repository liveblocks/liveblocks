// A link in the text: `https://…`, `http://…`, or a bare `www.…`. Trailing
// punctuation that usually ends a sentence rather than the URL is left out.
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[.,:;!?)\]}'"…]+$/;

/**
 * The last link in a post's text, normalized to an absolute URL, or `null`
 * when there is none. Networks preview the last link in a post, so that's the
 * one whose card and image are shown.
 */
export function findLastUrl(text: string): string | null {
  const matches = Array.from(text.matchAll(URL_PATTERN));
  const match = matches[matches.length - 1];
  if (!match) {
    return null;
  }
  const raw = match[0].replace(TRAILING_PUNCTUATION, "");
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    // "https://" alone or a scheme with no real host isn't a link yet.
    return url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}

/** The host of a URL without a leading `www.`, as shown on a link card. */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
