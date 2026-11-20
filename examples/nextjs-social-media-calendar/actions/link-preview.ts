"use server";

import { parse } from "node-html-parser";

export type LinkPreviewMetadata = {
  title: string | null;
  description: string | null;
  image: string | null;
};

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 512 * 1024;

// Some sites only serve Open Graph tags to crawlers; Twitter's bot UA is the
// one most pages are tuned for.
const USER_AGENT = "Mozilla/5.0 (compatible; Twitterbot/1.0)";

/**
 * Fetches a page on the server and reads its Open Graph / Twitter card tags:
 * the title, description, and image a network would show under a post that
 * links to it. Runs on the server so the browser never hits the page itself,
 * and so pages without CORS headers still work.
 */
export async function getLinkPreview(
  url: string
): Promise<
  { error: string; data?: never } | { data: LinkPreviewMetadata; error?: never }
> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return { error: "Invalid URL" };
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return { error: "Unsupported protocol" };
  }

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return { error: `Page responded with ${response.status}` };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      return { error: "Not an HTML page" };
    }

    // The tags live in <head>; don't read a whole large page for them.
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const $ = parse(html);
    // Redirects may have moved us; relative image URLs resolve from here.
    const base = new URL(response.url || target.href);

    const meta = (...selectors: string[]) => {
      for (const selector of selectors) {
        const content = $.querySelector(selector)
          ?.getAttribute("content")
          ?.trim();
        if (content) {
          return content;
        }
      }
      return null;
    };

    const rawImage = meta(
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image"]',
      'meta[name="og:image"]',
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]',
      'meta[name="twitter:image:src"]'
    );

    return {
      data: {
        title:
          meta('meta[property="og:title"]', 'meta[name="twitter:title"]') ??
          $.querySelector("title")?.text.trim() ??
          null,
        description: meta(
          'meta[property="og:description"]',
          'meta[name="twitter:description"]',
          'meta[name="description"]'
        ),
        image: rawImage ? resolveImageUrl(rawImage, base) : null,
      },
    };
  } catch (error) {
    console.error("Link preview:", error);
    return { error: "Can't fetch page" };
  }
}

function resolveImageUrl(raw: string, base: URL): string | null {
  try {
    const url = new URL(raw, base);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}
