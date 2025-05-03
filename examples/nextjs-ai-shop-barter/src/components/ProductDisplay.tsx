"use client";

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
    setCurrentPrice,
    setCurrentVariant,
    getCurrentVariant,
  } = useShop();

  const currentVariant = getCurrentVariant();

  // Handler for price change
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = parseFloat(e.target.value);
    if (!isNaN(newPrice)) {
      setCurrentPrice(newPrice);
    }
  };

  // Handler for variant change
  const handleVariantChange = (variantId: string) => {
    setCurrentVariant(variantId);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4">
      {/* Product Image */}
      <div className="relative w-full md:w-1/2 h-[400px]">
        {currentVariant && (
          <Image
            src={currentVariant.image}
            alt={`${name} - ${currentVariant.name}`}
            fill
            className="object-contain"
          />
        )}
      </div>

      {/* Product Details */}
      <div className="w-full md:w-1/2 space-y-4">
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="text-gray-600">{description}</p>

        {/* Price Display */}
        <div className="mt-4">
          <p className="text-gray-500">
            Starting price: ${startingPrice.toFixed(2)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <label htmlFor="price" className="font-medium">
              Current price:
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={currentPrice}
              onChange={handlePriceChange}
              className="border rounded px-2 py-1 w-24"
            />
          </div>
        </div>

        {/* Variant Selection */}
        <div className="mt-4">
          <h3 className="font-medium mb-2">Color Options:</h3>
          <div className="flex gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => handleVariantChange(variant.id)}
                className={`
                  border rounded-full w-8 h-8 flex items-center justify-center
                  ${currentVariantId === variant.id ? "ring-2 ring-blue-500" : ""}
                `}
                style={{ backgroundColor: variant.id.toLowerCase() }}
                title={variant.name}
              />
            ))}
          </div>
        </div>

        {/* Selected Variant Display */}
        <div className="mt-4">
          <p>Selected: {currentVariant?.name}</p>
        </div>
      </div>
    </div>
  );
}
