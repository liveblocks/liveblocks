<script>
  import { spring } from "svelte/motion";

  export let color = "";
  export let x = 0;
  export let y = 0;

  // Spring animation for cursor
  const coords = spring(
    { x, y },
    {
      stiffness: 0.07,
      damping: 0.35,
    }
  );

  // Update spring when x and y change
  $: coords.set({ x, y });
</script>

<svg
  class="cursor"
  fill="none"
  height="36"
  style={`transform: translateX(${$coords.x}px) translateY(${$coords.y}px)`}
  viewBox="0 0 24 36"
  width="24"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
    fill={color}
  />
</svg>

<style>
  .cursor {
    position: absolute;
    top: 0;
    left: 0;
  }
</style>
