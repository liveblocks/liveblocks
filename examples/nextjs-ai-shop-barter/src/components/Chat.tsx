"use client";

import { AiChat } from "@liveblocks/react-ui";
import { useShop } from "./ShopProvider";

export function Chat() {
  const {
    id,
    currentPrice,
    setCurrentPrice,
    currentVariantId,
    setCurrentVariant,
  } = useShop();

  return (
    <AiChat
      chatId={id} /* TODO actions to change product price and variant */
    />
  );
}
