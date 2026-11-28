"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/game/economy";

type Floater = { id: number; x: number; y: number; amount: number };

// Shows amounts of money floating up from the cursor: red when the player
// spends some (laying track, buying a vehicle), green when they receive some
export function useMoneyFloaters() {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  // A positive amount is money received, a negative one money spent
  const floatMoney = useCallback((amount: number) => {
    const { x, y } = pointer.current ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const id = nextId.current++;
    setFloaters((current) => [...current, { id, x, y, amount }]);
  }, []);

  const moneyFloaters = floaters.map((floater) => (
    <span
      key={floater.id}
      className="money-float"
      style={{
        left: floater.x,
        top: floater.y - 6,
        color: floater.amount < 0 ? "#ff5148" : "#7dff6b",
      }}
      onAnimationEnd={() =>
        setFloaters((current) =>
          current.filter((each) => each.id !== floater.id)
        )
      }
    >
      {floater.amount > 0 ? "+" : ""}
      {formatMoney(floater.amount)}
    </span>
  ));

  return { floatMoney, moneyFloaters };
}
