<script>
  export let color = "";
  export let x = 100;
  export let y = 100;
</script>

<svg
  fill="none"
  height="24"
  style={`transform: translateX(${x}px) translateY(${y}px)`}
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
  svg {
    position: absolute;
    left: 0;
    top: 0;
    transition: transform 0.5s cubic-bezier(.17, .93, .38, 1);
  }
</style>
