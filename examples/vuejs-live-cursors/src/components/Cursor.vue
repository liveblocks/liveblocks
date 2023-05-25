<script lang="ts" setup>
const { color, x, y } = defineProps<{
  color: string;
  x: number;
  y: number;
}>();
</script>

<template>
  <svg
    :style="{ transform: `translateX(${x}px) translateY(${y}px)` }"
    fill="none"
    height="36"
    viewBox="0 0 24 36"
    width="24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      :style="{ fill: color }"
      d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
    />
  </svg>
</template>

<style scoped>
svg {
  position: absolute;
  left: 0;
  top: 0;
}
</style>
