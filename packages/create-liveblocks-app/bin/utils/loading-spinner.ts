import ora from "ora";
import c from "ansi-colors";

export function loadingSpinner(text?: string, customIcon?: string) {
  const i = customIcon || "🖱";

  return ora({
    spinner: {
      interval: 80,
      frames: [
        c.magentaBright(`${i}    `),
        c.magentaBright(` ${i}   `),
        c.magentaBright(`  ${i}  `),
        c.magentaBright(`   ${i} `),
        c.magentaBright(`    ${i}`),
        c.magentaBright(`   ${i} `),
        c.magentaBright(`  ${i}  `),
        c.magentaBright(` ${i}   `),
        c.magentaBright(`${i}    `),
      ],
    },
    text: text,
  }) as any;
}
