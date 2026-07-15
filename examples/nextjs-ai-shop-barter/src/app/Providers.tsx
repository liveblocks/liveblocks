"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { PropsWithChildren } from "react";
import { ShopProvider } from "../components/ShopProvider";
import { Toaster } from "sonner";

// Default product data
const defaultProduct = {
  id: "t-shirt",
  name: "T-Shirt",
  description: (
    <>
      <p>
        A comfortable and stylish t-shirt made with soft cotton fabric that's
        perfect for everyday wear. The premium quality material ensures
        breathability and durability, while the modern fit flatters all body
        types.
      </p>
      <p className="mt-3">
        Each t-shirt features reinforced stitching at the seams for longevity
        and a tagless collar for maximum comfort. Available in multiple vibrant
        colors that won't fade after washing. An essential addition to any
        casual wardrobe.
      </p>
    </>
  ),
  startingPrice: 79.99,
  variants: [
    {
      id: "blue",
      name: "Blue",
      price: 79.99,
      image: "/blue-t-shirt.jpg",
    },
    {
      id: "green",
      name: "Green",
      price: 79.99,
      image: "/green-t-shirt.jpg",
    },
    {
      id: "purple",
      name: "Purple",
      price: 79.99,
      image: "/purple-t-shirt.jpg",
    },
  ],
};

export function Providers({ children }: PropsWithChildren) {
  return (
    <LiveblocksProvider
      // @ts-expect-error DEV env for now
      baseUrl={process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!}
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
      <Toaster toastOptions={{ duration: 1500 }} />
      <ShopProvider initialProduct={defaultProduct}>{children}</ShopProvider>
    </LiveblocksProvider>
  );
}
