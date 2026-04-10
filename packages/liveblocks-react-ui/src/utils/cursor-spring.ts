import { makeEventSource } from "@liveblocks/core";

import { type Animatable, makeAnimationLoop } from "./animation-loop";

const STIFFNESS = 320;
const DAMPING = 32;
const EPSILON = 0.01;

type CursorCoordinates = {
  x: number;
  y: number;
};

// Shared animation loop for all active springs.
const loop = makeAnimationLoop();

export function makeCursorSpring() {
  const updates = makeEventSource<CursorCoordinates | null>();
  let value: CursorCoordinates | null = null;
  let target: CursorCoordinates | null = null;
  const velocity = { x: 0, y: 0 };

  const spring: Animatable = {
    active: false,
    step(dt: number) {
      if (value === null || target === null) {
        spring.active = false;
        return;
      }

      const k = STIFFNESS;
      const d = DAMPING;
      const dx = value.x - target.x;
      const dy = value.y - target.y;

      velocity.x += (-k * dx - d * velocity.x) * dt;
      velocity.y += (-k * dy - d * velocity.y) * dt;

      const nx = value.x + velocity.x * dt;
      const ny = value.y + velocity.y * dt;

      if (nx !== value.x || ny !== value.y) {
        value.x = nx;
        value.y = ny;
        updates.notify(value);
      }

      if (
        Math.abs(velocity.x) < EPSILON &&
        Math.abs(velocity.y) < EPSILON &&
        Math.abs(target.x - value.x) < EPSILON &&
        Math.abs(target.y - value.y) < EPSILON
      ) {
        if (value.x !== target.x || value.y !== target.y) {
          value.x = target.x;
          value.y = target.y;
          updates.notify(value);
        }

        velocity.x = 0;
        velocity.y = 0;
        spring.active = false;
      }
    },
  };

  return {
    get() {
      return value;
    },
    set(point: CursorCoordinates | null) {
      if (point === null) {
        value = null;
        target = null;
        velocity.x = 0;
        velocity.y = 0;
        spring.active = false;
        loop.remove(spring);
        updates.notify(null);
        return;
      }

      if (value === null) {
        value = { x: point.x, y: point.y };
        target = point;
        velocity.x = 0;
        velocity.y = 0;
        updates.notify(value);
        return;
      }

      target = point;

      if (!spring.active && (value.x !== target.x || value.y !== target.y)) {
        spring.active = true;
        loop.add(spring);
      }
    },
    subscribe: updates.subscribe,
    dispose() {
      spring.active = false;
      loop.remove(spring);
      updates.dispose();
    },
  };
}
