"use client";

// Builds the CSS that html-to-image should inline into a slide snapshot so
// webfonts (e.g. Google Fonts) survive the export. We can't rely on the
// library's own font detection: it walks the target's children with the
// parent window's `instanceof HTMLElement`, which is always false for
// elements inside the slide iframe (a different JS realm), so it considers
// every webfont "unused" and embeds nothing. Instead, collect every
// @font-face rule from the slide document ourselves — inline <style> tags
// and fetched <link> stylesheets — and inline their font files as data URLs.

const FONT_FACE_PATTERN = /@font-face\s*{[^}]*}/g;
const URL_PATTERN = /url\((['"]?)([^'")]+)\1\)/g;

export async function collectFontEmbedCss(document: Document): Promise<string> {
  const sources: { cssText: string; baseUrl: string | null }[] = [];

  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel~="stylesheet"]')
  );
  await Promise.all(
    links.map(async (link) => {
      if (!link.href) {
        return;
      }
      try {
        const response = await fetch(link.href);
        if (response.ok) {
          sources.push({ cssText: await response.text(), baseUrl: link.href });
        }
      } catch {
        // Unreachable stylesheets simply contribute no fonts.
      }
    })
  );

  for (const style of Array.from(document.querySelectorAll("style"))) {
    sources.push({ cssText: style.textContent ?? "", baseUrl: null });
  }

  const fontFaces: string[] = [];
  for (const source of sources) {
    for (const match of source.cssText.match(FONT_FACE_PATTERN) ?? []) {
      fontFaces.push(await inlineFontUrls(match, source.baseUrl));
    }
  }

  return fontFaces.join("\n");
}

async function inlineFontUrls(
  fontFaceCss: string,
  baseUrl: string | null
): Promise<string> {
  const replacements = new Map<string, string>();

  await Promise.all(
    Array.from(fontFaceCss.matchAll(URL_PATTERN)).map(async ([token, , url]) => {
      if (url.startsWith("data:")) {
        return;
      }
      try {
        const absoluteUrl = new URL(url, baseUrl ?? undefined).href;
        const response = await fetch(absoluteUrl);
        if (response.ok) {
          replacements.set(token, `url(${await blobToDataUrl(await response.blob())})`);
        }
      } catch {
        // Leave the original URL in place; the font just won't embed.
      }
    })
  );

  let result = fontFaceCss;
  for (const [token, replacement] of replacements) {
    result = result.replaceAll(token, replacement);
  }
  return result;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Expected a data URL from readAsDataURL"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
