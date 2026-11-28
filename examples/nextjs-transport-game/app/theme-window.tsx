"use client";

import { Window } from "@/components/window";
import { type Theme, themeColor, THEMES } from "@/game/render/theme";

// A few colors of the classic look, to show what each theme makes of them:
// grass, water, a roof, a wall and a road
const SAMPLES = ["#7fbb58", "#4b90d2", "#b5533c", "#e8dcc3", "#7b8088"];

// Lets the player pick how the map is drawn. Only their own view changes.
export function ThemeWindow({
  theme,
  onPick,
  onClose,
}: {
  theme: Theme;
  onPick: (theme: Theme) => void;
  onClose: () => void;
}) {
  return (
    <Window title="Theme" className="w-64" onClose={onClose}>
      <ul className="flex flex-col gap-px pt-[3px]">
        {THEMES.map((each) => (
          <li key={each.id}>
            <button
              type="button"
              className="win-button w-full justify-start gap-2 py-1 text-left"
              aria-pressed={each === theme}
              onClick={() => onPick(each)}
            >
              <span
                className="flex shrink-0 border border-black"
                style={each.pixel > 1 ? { imageRendering: "pixelated" } : {}}
              >
                {SAMPLES.map((color) => (
                  <span
                    key={color}
                    className={each.pixel > 1 ? "h-5 w-1.5" : "h-5 w-2"}
                    style={{
                      background: themeColor(each, color),
                      boxShadow: each.outline
                        ? `inset -1px 0 ${each.outline}`
                        : undefined,
                    }}
                  />
                ))}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-bold">{each.name}</span>
                <span className="whitespace-normal opacity-75">
                  {each.description}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="px-1 pt-1.5 pb-0.5 text-[#606060]">
        Only you see the theme you pick.
      </p>
    </Window>
  );
}
