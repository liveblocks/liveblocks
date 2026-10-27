"use client";

import { toast } from "sonner";
import { useShop } from "./ShopProvider";
import Image from "next/image";

export function ProductDisplay() {
  const {
    name,
    description,
    startingPrice,
    currentPrice,
    variants,
    currentVariantId,
    setCurrentVariant,
    getCurrentVariant,
  } = useShop();

  const currentVariant = getCurrentVariant();

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4 pt-12">
      {/* Product Image */}
      <div className="relative w-full md:w-1/2 h-[500px]">
        {currentVariant && (
          <Image
            src={currentVariant.image}
            alt={`${name} - ${currentVariant.name}`}
            fill
            className="object-cover rounded-lg aspect-[5/4]"
          />
        )}
      </div>

      {/* Product Details */}
      <div className="w-full md:w-1/2 flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium flex justify-between items-center">
            {name}{" "}
            {startingPrice === currentPrice ? (
              <span className="">${startingPrice.toFixed(2)} or less</span>
            ) : (
              <span className="">
                <span className="line-through">
                  ${startingPrice.toFixed(2)}
                </span>{" "}
                ${currentPrice.toFixed(2)}
              </span>
            )}
          </h1>

          {/* Stars */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">4.4</span>
            <div className="flex items-center">
              <svg
                className="size-5 shrink-0 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                data-slot="icon"
              >
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
                  clipRule="evenodd"
                />
              </svg>
              <svg
                className="size-5 shrink-0 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                data-slot="icon"
              >
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
                  clipRule="evenodd"
                />
              </svg>
              <svg
                className="size-5 shrink-0 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                data-slot="icon"
              >
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
                  clipRule="evenodd"
                />
              </svg>
              <svg
                className="size-5 shrink-0 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                data-slot="icon"
              >
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
                  clipRule="evenodd"
                />
              </svg>
              <svg
                className="size-5 shrink-0"
                viewBox="0 0 20 20"
                aria-hidden="true"
                data-slot="icon"
              >
                <defs>
                  <linearGradient
                    id="partialStarGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="rgb(250 204 21)" />
                    <stop offset="44%" stopColor="rgb(250 204 21)" />
                    <stop offset="44%" stopColor="rgb(229 231 235)" />
                    <stop offset="100%" stopColor="rgb(229 231 235)" />
                  </linearGradient>
                </defs>
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
                  clipRule="evenodd"
                  fill="url(#partialStarGradient)"
                />
              </svg>
            </div>{" "}
            <span className="text-gray-300">•</span>
            <a
              href="#reviews"
              className="text-neutral-900 hover:underline text-sm font-medium"
            >
              Reviews
            </a>
          </div>
        </div>

        {/* Variant Selection */}
        <div className="">
          <h3 className="font-medium mb-2 text-sm">Variant</h3>
          <div className="flex gap-2">
            {variants.map((variant) => (
              <label
                key={variant.id}
                aria-label={variant.name}
                className={`relative flex cursor-pointer items-center justify-center rounded-full p-0.5 ${
                  currentVariantId === variant.id
                    ? "ring-3 ring-neutral-800 ring-offset-[0.5px]"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="color-choice"
                  value={variant.name}
                  className="sr-only"
                  checked={currentVariantId === variant.id}
                  onChange={() => setCurrentVariant(variant.id)}
                />
                <span
                  aria-hidden="true"
                  className="h-8 w-8 rounded-full border border-black/10"
                  style={{ backgroundColor: variant.id.toLowerCase() }}
                ></span>
              </label>
            ))}
          </div>
        </div>

        {/* Add to Basket Button */}
        <div className="mt-2">
          <button
            type="button"
            className="w-full bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 transition-colors"
            onClick={() => {
              // Add to basket functionality would go here
              console.log(`Added ${name} - ${currentVariant?.name} to basket`);
              toast.success("Product has been bought");
            }}
          >
            Buy for{" "}
            <strong className="font-semibold">
              ${currentPrice.toFixed(2)}
            </strong>
          </button>
        </div>

        <div>
          <h3 className="font-medium mb-2 text-sm">Description</h3>
          <div className="text-gray-500 leading-relaxed">{description}</div>
        </div>
      </div>
    </div>
  );
}
