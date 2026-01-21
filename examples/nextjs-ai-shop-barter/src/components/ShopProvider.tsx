"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

// Product variant type
export type ProductVariant = {
  id: string;
  name: string;
  image: string;
};

// Shop state type
type ShopState = {
  id: string;
  name: string;
  description: ReactNode;
  startingPrice: number;
  currentPrice: number;
  variants: ProductVariant[];
  currentVariantId: string;
};

// Shop context type
type ShopContextType = ShopState & {
  setCurrentPrice: (price: number) => void;
  setCurrentVariant: (variantId: string) => void;
  getCurrentVariant: () => ProductVariant | undefined;
};

// Default values for the shop state
const defaultShopState: ShopState = {
  id: "default-product",
  name: "T-Shirt",
  description: <>A comfortable cotton t-shirt with a modern fit.</>,
  startingPrice: 29.99,
  currentPrice: 29.99,
  variants: [
    {
      id: "white",
      name: "White",
      image: "/images/t-shirt-white.jpg",
    },
    {
      id: "red",
      name: "Red",
      image: "/images/t-shirt-red.jpg",
    },
    {
      id: "blue",
      name: "Blue",
      image: "/images/t-shirt-blue.jpg",
    },
  ],
  currentVariantId: "white",
};

// Create context with default values
const ShopContext = createContext<ShopContextType>({
  ...defaultShopState,
  setCurrentPrice: () => {},
  setCurrentVariant: () => {},
  getCurrentVariant: () => undefined,
});

// ShopProvider props
type ShopProviderProps = {
  children: ReactNode;
  initialProduct: {
    id: string;
    name: string;
    description: ReactNode;
    startingPrice: number;
    variants: ProductVariant[];
  };
};

export function ShopProvider({ children, initialProduct }: ShopProviderProps) {
  // Initialize state with provided props
  const [shopState, setShopState] = useState<ShopState>({
    id: initialProduct.id,
    name: initialProduct.name,
    description: initialProduct.description,
    startingPrice: initialProduct.startingPrice,
    currentPrice: initialProduct.startingPrice,
    variants: initialProduct.variants,
    currentVariantId:
      initialProduct.variants[0]?.id || defaultShopState.currentVariantId,
  });

  // Function to set current price
  const setCurrentPrice = (price: number) => {
    setShopState((prevState) => ({
      ...prevState,
      currentPrice: price,
    }));
  };

  // Function to set current variant by ID
  const setCurrentVariant = (variantId: string) => {
    const variant = shopState.variants.find((v) => v.id === variantId);
    if (variant) {
      setShopState((prevState) => ({
        ...prevState,
        currentVariantId: variantId,
      }));
    }
  };

  // Function to get current variant
  const getCurrentVariant = () => {
    return shopState.variants.find((v) => v.id === shopState.currentVariantId);
  };

  // Create value object
  const value: ShopContextType = {
    ...shopState,
    setCurrentPrice,
    setCurrentVariant,
    getCurrentVariant,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

// Custom hook to use shop context
export function useShop() {
  const context = useContext(ShopContext);

  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider");
  }

  return context;
}
