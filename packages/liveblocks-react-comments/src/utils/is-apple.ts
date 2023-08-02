const APPLE_REGEX = /Mac|iPod|iPhone|iPad/;

export function isApple() {
  return (
    typeof window !== "undefined" && APPLE_REGEX.test(window.navigator.platform)
  );
}
