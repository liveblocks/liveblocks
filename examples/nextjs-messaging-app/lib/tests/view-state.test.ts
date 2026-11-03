import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_VIEW_STATE,
  getViewStateKey,
  parseViewState,
  readViewState,
  writeViewState,
  type ViewState,
} from "@/lib/view-state";

const ROOM = "room-a";
const KEY = getViewStateKey(ROOM);

const DM_THREAD: ViewState = {
  view: "activity",
  selection: { type: "dm", userId: "mislav.abha@example.com" },
  threadMessageId: "msg_1",
};

describe("view state", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("parseViewState", () => {
    it("returns null for missing or invalid JSON", () => {
      expect(parseViewState(null)).toBeNull();
      expect(parseViewState("{nope")).toBeNull();
      expect(parseViewState('"home"')).toBeNull();
    });

    it("rejects unknown tabs", () => {
      expect(parseViewState(JSON.stringify({ view: "settings" }))).toBeNull();
    });

    it("keeps valid channel and dm selections", () => {
      expect(
        parseViewState(
          JSON.stringify({
            view: "home",
            selection: { type: "channel", channelId: "general" },
          })
        )
      ).toEqual({
        view: "home",
        selection: { type: "channel", channelId: "general" },
        threadMessageId: null,
      });
      expect(parseViewState(JSON.stringify(DM_THREAD))).toEqual(DM_THREAD);
    });

    it("drops malformed selections and thread ids", () => {
      expect(
        parseViewState(
          JSON.stringify({
            view: "dms",
            selection: { type: "dm" },
            threadMessageId: 42,
          })
        )
      ).toEqual({ view: "dms", selection: null, threadMessageId: null });
    });
  });

  describe("readViewState / writeViewState", () => {
    it("returns the default when nothing is stored", () => {
      expect(readViewState(ROOM)).toEqual(DEFAULT_VIEW_STATE);
    });

    it("writes to both session and local storage and round-trips", () => {
      writeViewState(ROOM, DM_THREAD);
      expect(sessionStorage.getItem(KEY)).toBe(JSON.stringify(DM_THREAD));
      expect(localStorage.getItem(KEY)).toBe(JSON.stringify(DM_THREAD));
      expect(readViewState(ROOM)).toEqual(DM_THREAD);
    });

    it("prefers this tab's session storage over the shared local storage", () => {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          view: "home",
          selection: { type: "channel", channelId: "random" },
        })
      );
      sessionStorage.setItem(KEY, JSON.stringify(DM_THREAD));
      expect(readViewState(ROOM)).toEqual(DM_THREAD);
    });

    it("falls back to local storage for a fresh tab", () => {
      localStorage.setItem(KEY, JSON.stringify(DM_THREAD));
      expect(readViewState(ROOM)).toEqual(DM_THREAD);
    });

    it("falls back to the default when the stored value is corrupt", () => {
      sessionStorage.setItem(KEY, "{nope");
      localStorage.setItem(KEY, "{nope");
      expect(readViewState(ROOM)).toEqual(DEFAULT_VIEW_STATE);
    });

    it("scopes state per room", () => {
      writeViewState(ROOM, DM_THREAD);
      expect(readViewState("room-b")).toEqual(DEFAULT_VIEW_STATE);
    });
  });
});
