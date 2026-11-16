// A link in the text: `https://…`, `http://…`, or a bare `www.…`. Trailing
// punctuation that usually ends a sentence rather than the URL is left out.
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/i;
const TRAILING_PUNCTUATION = /[.,:;!?)\]}'"…]+$/;

/**
 * The first link in a post's text, normalized to an absolute URL, or `null`
 * when there is none. Used to show a preview card under the post.
 */
export function findFirstUrl(text: string): string | null {
  const match = URL_PATTERN.exec(text);
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
