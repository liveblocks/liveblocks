import { fetchEmojis, fetchMessages } from "emojibase";

import { capitalize } from "../../utils/capitalize";
import { chunk } from "../../utils/chunk";
import type {
  Emoji,
  EmojiCategory,
  EmojiData,
  EmojiPickerData,
  EmojiPickerRow,
} from "./types";

const EMOJI_VERSION = 14;

export async function getEmojiData(): Promise<EmojiData> {
  // TODO: Handle fetching/caching (using ETag, localStorage, etc) ourselves
  const emojibaseEmojis = await fetchEmojis("en");
  const emojibaseMessages = await fetchMessages("en");

  // Filter out component/modifier category and emojis
  const filteredGroups = emojibaseMessages.groups.filter(
    (group) => group.key !== "component"
  );
  const filteredEmojis = emojibaseEmojis.filter(
    (emoji) => "group" in emoji && emoji.version <= EMOJI_VERSION
  );

  const categories = filteredGroups.map((group) => ({
    key: group.order,
    name: capitalize(group.message),
  }));

  const skinTones = emojibaseMessages.skinTones.map((skinTone) => ({
    key: skinTone.key,
    name: capitalize(skinTone.message),
  }));

  const emojis = filteredEmojis.map((emoji) => ({
    emoji: emoji.emoji,
    hexcode: emoji.hexcode,
    category: emoji.group!,
    name: capitalize(emoji.label),
    tags: emoji.tags,
  }));

  return {
    emojis,
    categories,
    skinTones,
  };
}

// TODO: Improve performance
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
  const rows: EmojiPickerRow[] = [];
  const categoriesRowCounts: number[] = [];
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

    rows.push(...categoryRows);
    categoriesRowCounts.push(categoryRows.length);
  }

  return {
    count: emojis.length,
    rows,
    categories,
    categoriesRowCounts,
  };
}
