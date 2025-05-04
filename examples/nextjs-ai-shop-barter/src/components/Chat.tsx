"use client";

import { AiChat } from "@liveblocks/react-ui";
import { ProductVariant, useShop } from "./ShopProvider";
import { useMemo } from "react";

export function Chat() {
  const {
    id,
    name,
    description,
    currentPrice,
    setCurrentPrice,
    currentVariantId,
    setCurrentVariant,
    getCurrentVariant,
    variants,
  } = useShop();

  const contexts = useMemo(() => {
    return [
      {
        description: "The name of the product",
        value: `${name}`,
      },
      {
        description: "The description of the product",
        value: `${description}`,
      },
      {
        description: "The current price of the product",
        value: `$${currentPrice}`,
      },
      {
        description: "The current variant of the product",
        value: JSON.stringify(filterVariantInfoForAi(getCurrentVariant())),
      },
      {
        description: "All variants of the product",
        value: JSON.stringify(variants.map(filterVariantInfoForAi)),
      },
    ];
  }, [currentPrice, getCurrentVariant, variants]);

  console.log(contexts);

  return (
    <div className="h-full flex flex-col max-h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-medium mb-0.5">Negotiate a Discount</h2>
        <p className="text-sm text-gray-500">Chat with AI to lower the price</p>
      </div>

      <div className="grow shrink min-h-0">
        <AiChat
          chatId={
            id
          } /* TODO actions to change product price, variant, and offer to throw in another small product or free delivery */
          contexts={contexts}
        />
      </div>
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Price:</span>
          <span className="font-bold">${currentPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function filterVariantInfoForAi(variant: ProductVariant | undefined) {
  if (!variant) {
    return undefined;
  }

  return {
    name: variant.name,
    id: variant.id,
  };
}
