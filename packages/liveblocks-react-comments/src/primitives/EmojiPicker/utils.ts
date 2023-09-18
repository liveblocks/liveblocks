import { fetchEmojis, fetchMessages } from "emojibase";

import { capitalize } from "../../utils/capitalize";
import type {
  Emoji,
  EmojiCategory,
  EmojiCategoryWithEmojis,
  EmojiData,
} from "./types";

export async function getEmojiData(): Promise<EmojiData> {
  // TODO: Handle fetching/caching (using ETag, localStorage, etc) ourselves
  const emojibaseEmojis = await fetchEmojis("en");
  const emojibaseMessages = await fetchMessages("en");

  // Filter component/modifier category and emojis
  const filteredGroups = emojibaseMessages.groups.filter(
    (group) => group.key !== "component"
  );
  const filteredEmojis = emojibaseEmojis.filter((emoji) => "group" in emoji);

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

// TODO: Optimize and take emoji.tags into account
export function filterEmojis(emojis: Emoji[], search?: string) {
  if (!search) {
    return emojis;
  }

  return emojis.filter((emoji) =>
    emoji.name.toLowerCase().includes(search.toLowerCase())
  );
}

export function groupEmojisByCategory(
  emojis: Emoji[],
  categories: EmojiCategory[]
): EmojiCategoryWithEmojis[] {
  return categories
    .map((category) => ({
      ...category,
      emojis: emojis.filter((emoji) => emoji.category === category.key),
    }))
    .filter((category) => category.emojis.length > 0);
}
