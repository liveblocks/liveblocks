import { type MockInstance, vi } from "vitest";

import * as console from "../../lib/fancy-console";
import {
  createNotificationSettings,
  type NotificationSettingsPlain,
} from "../NotificationSettings";

describe("NotificationSettings protocol", () => {
  let consoleErrorMock: MockInstance;

  beforeEach(() => {
    consoleErrorMock = vi.fn();
    vi.spyOn(console, "error").mockImplementation(consoleErrorMock as any);
  });
  afterEach(() => {
    consoleErrorMock.mockRestore();
  });

  it("should create an object with getters for each known notification channel", () => {
    const plain: NotificationSettingsPlain = {
      email: {
        thread: true,
        textMention: false,
      },
      slack: {
        thread: false,
        textMention: true,
      },
    };

    const settings = createNotificationSettings(plain);

    expect(settings.email).not.toBeNull();
    expect(settings.slack).not.toBeNull();

    expect(settings.email).toEqual(plain.email);
    expect(settings.slack).toEqual(plain.slack);

    expect(consoleErrorMock).not.toHaveBeenCalled();
  });

  it("should return null and log an error if a channel is not defined in plain and is accessed later", () => {
    const plain: NotificationSettingsPlain = {
      email: {
        thread: true,
        textMention: true,
      },
    };
    const settings = createNotificationSettings(plain);

    const slackSettings = settings.slack;
    const teamsSettings = settings.teams;
    const webPushSettings = settings.webPush;

    expect(slackSettings).toBeNull();
    expect(teamsSettings).toBeNull();
    expect(webPushSettings).toBeNull();

    expect(consoleErrorMock).toHaveBeenCalledTimes(3);
    expect(consoleErrorMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        "In order to use the 'slack' channel, please set up your project first"
      )
    );
    expect(consoleErrorMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "In order to use the 'teams' channel, please set up your project first"
      )
    );
    expect(consoleErrorMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(
        "In order to use the 'webPush' channel, please set up your project first"
      )
    );
  });

  it("should return an object where properties are enumerable except `[kPlain]`", () => {
    const plain: NotificationSettingsPlain = {
      email: { thread: true, textMention: true },
      slack: { thread: true, textMention: true },
      teams: { thread: true, textMention: true },
      webPush: { thread: true, textMention: true },
    };
    const settings = createNotificationSettings(plain);

    const keys = Object.keys(settings);
    expect(keys.sort()).toEqual(["email", "slack", "teams", "webPush"].sort());
  });
});
