"use client";

import { Window } from "@/components/window";
import { type Theme, themeColor, THEMES } from "@/game/render/theme";
import { UI_THEMES, type UiTheme } from "@/hooks/use-ui-theme";

// A few colors of the classic look, to show what each theme makes of them:
// grass, water, a roof, a wall and a road
const SAMPLES = ["#7fbb58", "#4b90d2", "#b5533c", "#e8dcc3", "#7b8088"];

// Lets the player pick how the map is drawn, and what the windows over it
// look like. The two go together in any combination, and only their own
// view changes.
export function ThemeWindow({
  theme,
  uiTheme,
  onPick,
  onPickUi,
  onClose,
}: {
  theme: Theme;
  uiTheme: UiTheme;
  onPick: (theme: Theme) => void;
  onPickUi: (theme: UiTheme) => void;
  onClose: () => void;
}) {
  return (
    <Window title="Theme" className="w-64" onClose={onClose}>
      <h3 className="px-1 pt-1.5 pb-1 font-bold">Map</h3>
      <ul className="flex flex-col gap-px">
        {THEMES.map((each) => (
          <li key={each.id}>
            <button
              type="button"
              className="win-button w-full justify-start gap-2 py-1 text-left"
              aria-pressed={each === theme}
              onClick={() => onPick(each)}
            >
              <span
                className="flex shrink-0 border border-ui-edge"
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
      <h3 className="px-1 pt-2.5 pb-1 font-bold">Interface</h3>
      {/* Every button is in the look it stands for */}
      <ul className="grid grid-cols-2 gap-1">
        {UI_THEMES.map((each) => (
          <li key={each.id} data-ui={each.id} className="flex">
            <button
              type="button"
              className="win-button flex-1"
              style={{ fontSize: "var(--ui-font-size)" }}
              aria-pressed={each === uiTheme}
              onClick={() => onPickUi(each)}
            >
              {each.name}
            </button>
          </li>
        ))}
      </ul>
      <p className="px-1 pt-1.5 pb-0.5 text-ui-muted">
        Only you see the themes you pick.
      </p>
    </Window>
  );
}
