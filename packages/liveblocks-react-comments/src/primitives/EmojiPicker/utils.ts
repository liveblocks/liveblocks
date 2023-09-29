import type {
  Emoji as EmojibaseEmoji,
  Locale as EmojibaseLocale,
  MessagesDataset as EmojibaseMessagesDataset,
} from "emojibase";

import { EMOJI_FONT_FAMILY } from "../../constants";
import { capitalize } from "../../utils/capitalize";
import { chunk } from "../../utils/chunk";
import type {
  Emoji,
  EmojiCategory,
  EmojiData,
  EmojiPickerData,
  EmojiPickerRow,
} from "./types";

const EMOJIBASE_VERSION = "15.0.0";
const EMOJIBASE_CDN_URL = `https://cdn.jsdelivr.net/npm/emojibase-data@${EMOJIBASE_VERSION}`;
const EMOJIBASE_EMOJIS_URL = (locale: EmojibaseLocale) =>
  `${EMOJIBASE_CDN_URL}/${locale}/data.json`;
const EMOJIBASE_MESSAGES_URL = (locale: EmojibaseLocale) =>
  `${EMOJIBASE_CDN_URL}/${locale}/messages.json`;
const EMOJIBASE_LOCALES: EmojibaseLocale[] = [
  "da",
  "de",
  "en",
  "en-gb",
  "es",
  "es-mx",
  "et",
  "fi",
  "fr",
  "hu",
  "it",
  "ja",
  "ko",
  "lt",
  "ms",
  "nb",
  "nl",
  "pl",
  "pt",
  "ru",
  "sv",
  "th",
  "uk",
  "zh",
  "zh-hant",
];
const EMOJIBASE_DEFAULT_LOCALE: EmojibaseLocale = "en";

const CACHE_EMOJI_DATA_KEY = (locale: string) => `lb-emoji-data-${locale}`;
const CACHE_EMOJI_METADATA_KEY = (locale: string) =>
  `lb-emoji-metadata-${locale}`;
const CACHE_EMOJI_SESSION_METADATA_KEY = "lb-emoji-metadata";

const EMOJI_DETECTION_CANVAS_WIDTH = 20;
const EMOJI_DETECTION_CANVAS_HEIGHT = 25;

type EmojiMetadata = {
  emojisEtag: string | null;
  messagesEtag: string | null;
};

type EmojiSessionMetadata = {
  emojiVersion: number;
};

function generateRangeIndices(start: number, end: number) {
  const range: number[] = [];

  for (let i = start; i <= end; i++) {
    range.push(i);
  }

  return range;
}

function getStorageItem<T>(storage: Storage, key: string) {
  const item = storage.getItem(key);

  return item ? (JSON.parse(item) as T) : null;
}

function setStorageItem<T>(storage: Storage, key: string, value: T) {
  storage.setItem(key, JSON.stringify(value));
}

async function fetchEtag(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD" });

    return response.headers.get("etag");
  } catch (error) {
    return null;
  }
}

function getEmojibaseSupportedLocale(locale: string): EmojibaseLocale {
  return EMOJIBASE_LOCALES.includes(locale as EmojibaseLocale)
    ? (locale as EmojibaseLocale)
    : EMOJIBASE_DEFAULT_LOCALE;
}

async function fetchEmojibaseData(locale: EmojibaseLocale) {
  const [{ emojis, emojisEtag }, { messages, messagesEtag }] =
    await Promise.all([
      fetch(EMOJIBASE_EMOJIS_URL(locale)).then(async (response) => {
        return {
          emojis: (await response.json()) as EmojibaseEmoji[],
          emojisEtag: response.headers.get("etag"),
        };
      }),
      fetch(EMOJIBASE_MESSAGES_URL(locale)).then(async (response) => {
        return {
          messages: (await response.json()) as EmojibaseMessagesDataset,
          messagesEtag: response.headers.get("etag"),
        };
      }),
    ]);

  return {
    emojis,
    messages,
    emojisEtag,
    messagesEtag,
  };
}

async function fetchEmojibaseEtags(locale: EmojibaseLocale) {
  const [emojisEtag, messagesEtag] = await Promise.all([
    fetchEtag(EMOJIBASE_EMOJIS_URL(locale)),
    fetchEtag(EMOJIBASE_MESSAGES_URL(locale)),
  ]);

  return {
    emojisEtag,
    messagesEtag,
  };
}

async function fetchEmojiData(locale: EmojibaseLocale): Promise<EmojiData> {
  const { emojis, emojisEtag, messages, messagesEtag } =
    await fetchEmojibaseData(locale);

  // Filter out component/modifier category and emojis
  const filteredGroups = messages.groups.filter(
    (group) => group.key !== "component"
  );
  const filteredEmojis = emojis.filter((emoji) => {
    return "group" in emoji;
  });

  // Pick and compact the data
  const categories = filteredGroups.map((group) => ({
    key: group.order,
    name: capitalize(group.message),
  }));
  const skinTones = messages.skinTones.map((skinTone) => ({
    key: skinTone.key,
    name: capitalize(skinTone.message),
  }));
  const compactEmojis = filteredEmojis.map((emoji) => ({
    emoji: emoji.emoji,
    category: emoji.group!,
    version: emoji.version,
    name: capitalize(emoji.label),
    tags: emoji.tags,
  }));

  const emojiData = {
    emojis: compactEmojis,
    categories,
    skinTones,
  };

  // Cache the data and metadata
  setStorageItem<EmojiData>(
    localStorage,
    CACHE_EMOJI_DATA_KEY(locale),
    emojiData
  );
  setStorageItem<EmojiMetadata>(
    localStorage,
    CACHE_EMOJI_METADATA_KEY(locale),
    {
      emojisEtag,
      messagesEtag,
    }
  );

  return emojiData;
}

// Adapted from https://github.com/koala-interactive/is-emoji-supported/tree/master
function detectEmojiSupport(
  canvasContext: CanvasRenderingContext2D,
  emoji: string
): boolean {
  canvasContext.clearRect(
    0,
    0,
    EMOJI_DETECTION_CANVAS_WIDTH * 2,
    EMOJI_DETECTION_CANVAS_HEIGHT
  );

  // Draw in red on the left
  canvasContext.fillStyle = "#f00";
  canvasContext.fillText(emoji, 0, 22);

  // Draw in blue on right
  canvasContext.fillStyle = "#00f";
  canvasContext.fillText(emoji, EMOJI_DETECTION_CANVAS_WIDTH, 22);

  const pixels = canvasContext.getImageData(
    0,
    0,
    EMOJI_DETECTION_CANVAS_WIDTH,
    EMOJI_DETECTION_CANVAS_HEIGHT
  ).data;
  const pixelCount = pixels.length;
  let i = 0;

  // Search for the first visible pixel
  for (; i < pixelCount && !pixels[i + 3]; i += 4);

  // No visible pixel
  if (i >= pixelCount) {
    return false;
  }

  // Emojis have an immutable color, so we check the color of the emoji in two
  // different colors, the result should be the same
  const x =
    EMOJI_DETECTION_CANVAS_WIDTH + ((i / 4) % EMOJI_DETECTION_CANVAS_WIDTH);
  const y = Math.floor(i / 4 / EMOJI_DETECTION_CANVAS_WIDTH);
  const pixel = canvasContext.getImageData(x, y, 1, 1).data;

  if (pixels[i] !== pixel[0] || pixels[i + 2] !== pixel[2]) {
    return false;
  }

  // Unsupported ZWJ sequence emojis show up as separate emojis
  if (canvasContext.measureText(emoji).width >= EMOJI_DETECTION_CANVAS_WIDTH) {
    return false;
  }

  return true;
}

function detectEmojiVersion(emojis: Emoji[]): number {
  const versions = new Map<number, string>();

  for (const emoji of emojis) {
    if (!versions.has(emoji.version)) {
      versions.set(emoji.version, emoji.emoji);
    }
  }

  const descendingVersions = [...versions.keys()].sort((a, b) => b - a);

  const canvasContext = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });

  if (!canvasContext) {
    return descendingVersions[0];
  }

  canvasContext.font = `${Math.floor(
    EMOJI_DETECTION_CANVAS_HEIGHT / 2
  )}px ${EMOJI_FONT_FAMILY}`;
  canvasContext.textBaseline = "top";
  canvasContext.canvas.width = EMOJI_DETECTION_CANVAS_WIDTH * 2;
  canvasContext.canvas.height = EMOJI_DETECTION_CANVAS_HEIGHT;

  for (const version of descendingVersions) {
    const emoji = versions.get(version)!;
    const isSupported = detectEmojiSupport(canvasContext, emoji);

    if (isSupported) {
      return version;
    }
  }

  return descendingVersions[0];
}

export async function getEmojiData(locale: string): Promise<EmojiData> {
  const emojibaseLocale = getEmojibaseSupportedLocale(locale);

  const sessionMetadata = getStorageItem<EmojiSessionMetadata>(
    sessionStorage,
    CACHE_EMOJI_SESSION_METADATA_KEY
  );
  const cachedData = getStorageItem<EmojiData>(
    localStorage,
    CACHE_EMOJI_DATA_KEY(emojibaseLocale)
  );
  let data: EmojiData;

  // If there is data already cached, check if the ETags are the same.
  // If they are, return the cached data, otherwise fetch it again.
  if (cachedData) {
    // ETags only need to be checked once per session
    if (sessionMetadata) {
      data = cachedData;
    } else {
      const { emojisEtag, messagesEtag } =
        await fetchEmojibaseEtags(emojibaseLocale);
      const cachedMetadata = getStorageItem<EmojiMetadata>(
        localStorage,
        CACHE_EMOJI_METADATA_KEY(emojibaseLocale)
      );

      if (
        cachedMetadata &&
        emojisEtag === cachedMetadata.emojisEtag &&
        messagesEtag === cachedMetadata.messagesEtag
      ) {
        data = cachedData;
      } else {
        data = await fetchEmojiData(emojibaseLocale);
      }
    }
  } else {
    data = await fetchEmojiData(emojibaseLocale);
  }

  const emojiVersion =
    sessionMetadata?.emojiVersion ?? detectEmojiVersion(data.emojis);
  setStorageItem(sessionStorage, CACHE_EMOJI_SESSION_METADATA_KEY, {
    ...sessionMetadata,
    emojiVersion,
  });

  // Filter out unsupported emojis
  const filteredEmojis = data.emojis.filter(
    (emoji) => emoji.version <= emojiVersion
  );

  return {
    emojis: filteredEmojis,
    categories: data.categories,
    skinTones: data.skinTones,
  };
}

export function filterEmojis(emojis: Emoji[], search?: string) {
  if (!search) {
    return emojis;
  }

  const searchText = search.toLowerCase().trim();

  return emojis.filter(
    (emoji) =>
      emoji.name.toLowerCase().includes(searchText) ||
      emoji.tags?.some((tag) => tag.toLowerCase().includes(searchText))
  );
}

export function generateEmojiPickerData(
  emojis: Emoji[],
  categories: EmojiCategory[],
  columns: number
): EmojiPickerData {
  let currentIndex = 0;
  const rows: EmojiPickerRow[] = [];
  const categoriesRowCounts: number[] = [];
  const categoriesRowIndices: number[][] = [];
  const categoriesNames: string[] = [];
  const categorizedEmojis = categories
    .map((category) => ({
      ...category,
      emojis: emojis.filter((emoji) => emoji.category === category.key),
    }))
    .filter((category) => category.emojis.length > 0);

  for (const category of categorizedEmojis) {
    const categoryRows = chunk(category.emojis, columns).map(
      (emojis) => ({ type: "emojis", emojis }) as const
    );
    const nextIndex = currentIndex + categoryRows.length;

    rows.push(...categoryRows);
    categoriesNames.push(category.name);
    categoriesRowCounts.push(categoryRows.length);
    categoriesRowIndices.push(
      generateRangeIndices(currentIndex, nextIndex - 1)
    );
    currentIndex = nextIndex;
  }

  return {
    count: emojis.length,
    rows,
    categories: categoriesNames,
    categoriesRowCounts,
    categoriesRowIndices,
  };
}
