"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { PropsWithChildren } from "react";
import { ShopProvider } from "../components/ShopProvider";

// Default product data
const defaultProduct = {
  id: "vintage-leather-jacket",
  name: "Vintage Leather Jacket",
  description:
    "A premium quality leather jacket with a classic vintage design. Made with genuine leather and featuring a comfortable cotton lining.",
  startingPrice: 199.99,
  variants: [
    {
      id: "black",
      name: "Black",
      price: 199.99,
      image: "/images/leather-jacket-black.jpg",
    },
    {
      id: "brown",
      name: "Brown",
      price: 219.99,
      image: "/images/leather-jacket-brown.jpg",
    },
    {
      id: "tan",
      name: "Tan",
      price: 229.99,
      image: "/images/leather-jacket-tan.jpg",
    },
  ],
};

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      // Get users' info from their ID
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        const users = await response.json();
        return users;
      }}
      // Find a list of users that match the current search term
      resolveMentionSuggestions={async ({ text }) => {
        const response = await fetch(
          `/api/users/search?${new URLSearchParams({ text })}`
        );

        if (!response.ok) {
          throw new Error("Problem resolving mention suggestions");
        }

        const userIds = await response.json();
        return userIds;
      }}
    >
      <ShopProvider initialProduct={defaultProduct}>{children}</ShopProvider>
    </LiveblocksProvider>
  );
}
