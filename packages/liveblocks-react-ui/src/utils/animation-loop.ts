const MAX_DELTA_TIME = 0.05;

export type Animatable = { active: boolean; step(deltaTime: number): void };

export function makeAnimationLoop() {
  const items = new Set<Animatable>();
  let animationFrame: number | null = null;
  let lastTime = 0;

  function tick(currentTime: number) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, MAX_DELTA_TIME);
    lastTime = currentTime;

    for (const item of items) {
      item.step(deltaTime);
    }

    for (const item of items) {
      if (!item.active) {
        items.delete(item);
      }
    }

    if (items.size > 0) {
      animationFrame = requestAnimationFrame(tick);
    } else {
      animationFrame = null;
    }
  }

  return {
    add(item: Animatable) {
      items.add(item);

      if (animationFrame === null) {
        lastTime = performance.now();
        animationFrame = requestAnimationFrame(tick);
      }
    },
    remove(item: Animatable) {
      items.delete(item);

      if (items.size === 0 && animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    },
  };
}
