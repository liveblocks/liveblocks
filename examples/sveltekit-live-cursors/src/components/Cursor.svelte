<script>
  export let color = "";
  export let x = 0;
  export let y = 0;
</script>

<svg
  fill="none"
  class="cursor"
  style={`transform: translateX(${x}px) translateY(${y}px)`}
  viewBox="0 0 24 36"
  width="24"
  height="36"
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
    transition: transform 0.5s cubic-bezier(0.17, 0.93, 0.38, 1);
  }
</style>
