"use client";

import { createContext, useContext, type ReactNode } from "react";

// Current visual order of the grid, provided by the Table to its cell renderer
// so each cell can translate its visual (row, col) into stable (rowId, colId).
export type Order = {
  rowIds: string[];
  colIds: string[];
};

const OrderContext = createContext<Order | null>(null);

export function OrderProvider({
  order,
  children,
}: {
  order: Order;
  children: ReactNode;
}) {
  return <OrderContext.Provider value={order}>{children}</OrderContext.Provider>;
}

export function useOrder(): Order {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrder must be used within an OrderProvider");
  }
  return context;
}
