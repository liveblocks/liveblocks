"use client";

import { AiChat } from "@liveblocks/react-ui";
import { ProductVariant, useShop } from "./ShopProvider";
import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { toast } from "sonner";

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

  const knowledge = useMemo(() => {
    return [
      {
        description: "The name of the product",
        value: `${name}`,
      },
      {
        description: "The description of the product",
        value: `${renderToStaticMarkup(<>{description}</>)}`,
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

  console.table(knowledge);

  return (
    <div className="h-full flex flex-col max-h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-medium mb-0.5">Negotiate a Discount</h2>
        <p className="text-sm text-gray-500">Chat with AI to lower the price</p>
      </div>

      <div className="grow shrink min-h-0">
        <AiChat
          chatId={
            id + "safdsxssscsdvsgdsxsf-3"
          } /* TODO actions to change product price, variant, and offer to throw in another small product or free delivery */
          knowledge={knowledge}
          tools={{
            "change-variant": {
              description: "Change the variant of the product",
              parameters: {
                type: "object",
                properties: {
                  variantId: { type: "string" },
                },
              },
              execute: ({ variantId }) => {
                console.log({ variantId });
                if (variantId && variants.some((v) => v.id === variantId)) {
                  setCurrentVariant(variantId);
                  console.log("setting variant", variantId);
                  return {
                    success: true,
                    hint: `The variant has been changed to ${variantId}. Do not reply to this.`,
                  };
                }

                return {
                  success: false,
                  hint: "The variant has not been changed",
                };
              },
            },
            "change-price": {
              description: "Change the price of the product",
              parameters: {
                type: "object",
                properties: {
                  price: { type: "number" },
                },
              },
              execute: ({ price }) => {
                setCurrentPrice(price);
                return {
                  success: true,
                  price,
                  hint: `The price has been changed to ${price}`,
                };
              },
              render: ({ result, ...other }) => {
                console.log("render args", result);
                console.log("other", other);
                if (result?.success === true) {
                  toast.success(`Price updated to ${result?.price}`);
                  return (
                    <div className="italic font-normal my-3 text-green-700 rounded-l-0 rounded-r-lg bg-green-50 border-green-400 border-l-3 inline-block py-1.5 px-3">
                      Price updated to{" "}
                      <span className="font-medium">${result?.price}</span>
                    </div>
                  );
                  // return (
                  //   <div className="bg-green-50 text-green-700 font-medium border-l-3 border-green-500 my-3 px-3 py-2">
                  //     Price updated to ${result?.price}
                  //   </div>
                  // );
                }
                return (
                  <div className="bg-gray-50 text-gray-700 font-medium border-l-3 border-gray-500 my-3 px-3 py-2">
                    Price not changed
                  </div>
                );
              },
            },
            "buy-button": {
              description:
                "Buy button. Show it when the user is ready to purchase.",
              parameters: {
                type: "object",
                properties: {
                  price: { type: "number" },
                },
              },
              render: BuyButton,
            },
          }}
          // dev other models
          //copilotId="co_8NZRRpZM0dk5Qgs9RpsFs"

          // dev
          copilotId="co_0gAplN8pwB451g5MQksZ9"

          // prod
          // copilotId="co_EMwwotoh1Z5QlU1xNcY1Q"
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

function BuyButton() {
  return (
    <button
      onClick={() => toast.success("Product has been bought")}
      className="bg-black text-white py-1.5 px-3 font-medium rounded-md hover:bg-gray-800 transition-colors"
    >
      Buy now
    </button>
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
