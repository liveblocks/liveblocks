import ora from "ora";
import c from "ansi-colors";

export function loadingSpinner(text?: string) {
  return ora({
    spinner: {
      interval: 80,
      frames: [
        c.whiteBright.magentaBright("🖱    "),
        c.whiteBright.magentaBright(" 🖱   "),
        c.whiteBright.magentaBright("  🖱  "),
        c.whiteBright.magentaBright("   🖱 "),
        c.whiteBright.magentaBright("    🖱"),
        c.whiteBright.magentaBright("   🖱 "),
        c.whiteBright.magentaBright("  🖱  "),
        c.whiteBright.magentaBright(" 🖱   "),
        c.whiteBright.magentaBright("🖱    "),
      ],
    },
    text: text,
  }) as any;
}
