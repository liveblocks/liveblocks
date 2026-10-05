import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clampPanelWidth,
  readPanelWidth,
  SIDEBAR_PANEL,
  THREAD_PANEL,
  usePanelWidth,
  writePanelWidth,
  type PanelWidthConfig,
} from "@/lib/panel-width";

const CONFIG: PanelWidthConfig = {
  storageKey: "test:panel-width",
  defaultWidth: 300,
  minWidth: 200,
  maxWidth: 500,
};

describe("panel widths", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("ships sane defaults for both panels", () => {
    for (const config of [SIDEBAR_PANEL, THREAD_PANEL]) {
      expect(config.minWidth).toBeLessThan(config.defaultWidth);
      expect(config.defaultWidth).toBeLessThan(config.maxWidth);
    }
    expect(SIDEBAR_PANEL.storageKey).not.toBe(THREAD_PANEL.storageKey);
  });

  describe("clampPanelWidth", () => {
    it("rounds values inside the range", () => {
      expect(clampPanelWidth(312.6, CONFIG)).toBe(313);
    });

    it("clamps values outside the range", () => {
      expect(clampPanelWidth(10, CONFIG)).toBe(200);
      expect(clampPanelWidth(9999, CONFIG)).toBe(500);
    });

    it("falls back to the default for non-finite values", () => {
      expect(clampPanelWidth(Number.NaN, CONFIG)).toBe(300);
      expect(clampPanelWidth(Number.POSITIVE_INFINITY, CONFIG)).toBe(300);
    });
  });

  describe("readPanelWidth / writePanelWidth", () => {
    it("returns the default when nothing is stored", () => {
      expect(readPanelWidth(CONFIG)).toBe(300);
    });

    it("round-trips a stored width", () => {
      writePanelWidth(CONFIG, 420);
      expect(localStorage.getItem(CONFIG.storageKey)).toBe("420");
      expect(readPanelWidth(CONFIG)).toBe(420);
    });

    it("clamps out-of-range stored values", () => {
      localStorage.setItem(CONFIG.storageKey, "9999");
      expect(readPanelWidth(CONFIG)).toBe(500);
    });

    it("ignores unparsable stored values", () => {
      localStorage.setItem(CONFIG.storageKey, "wide");
      expect(readPanelWidth(CONFIG)).toBe(300);
    });
  });

  describe("usePanelWidth", () => {
    it("starts from the stored width", () => {
      localStorage.setItem(CONFIG.storageKey, "260");
      const { result } = renderHook(() => usePanelWidth(CONFIG));
      expect(result.current[0]).toBe(260);
    });

    it("clamps and persists updates", () => {
      const { result } = renderHook(() => usePanelWidth(CONFIG));
      expect(result.current[0]).toBe(300);

      act(() => result.current[1](350.4));
      expect(result.current[0]).toBe(350);
      expect(localStorage.getItem(CONFIG.storageKey)).toBe("350");

      act(() => result.current[1](50));
      expect(result.current[0]).toBe(200);
      expect(localStorage.getItem(CONFIG.storageKey)).toBe("200");
    });
  });
});
