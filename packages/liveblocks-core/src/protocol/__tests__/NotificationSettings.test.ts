import { assertEq } from "tosti";
import { describe, test } from "vitest";

import { captureConsole } from "../../__tests__/_utils";
import {
  createNotificationSettings,
  type NotificationSettingsPlain,
} from "../NotificationSettings";

describe("NotificationSettings protocol", () => {
  test("should create an object with getters for each known notification channel", () => {
    const { any } = captureConsole();

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

    assertEq(settings.email, plain.email);
    assertEq(settings.slack, plain.slack);

    assertEq(any.mock.calls, []);
  });

  test("should return null and log an error if a channel is not defined in plain and is accessed later", () => {
    const { error } = captureConsole();

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

    assertEq(slackSettings, null);
    assertEq(teamsSettings, null);
    assertEq(webPushSettings, null);

    // Callback should be called three times now
    assertEq(error.mock.calls, [
      [/In order to use the 'slack' channel, please set up your project first/], // Call 1
      [/In order to use the 'teams' channel, please set up your project first/], // Call 1
      [
        /In order to use the 'webPush' channel, please set up your project first/,
      ], // Call 3
    ]);
  });

  test("should return an object where properties are enumerable except `[kPlain]`", () => {
    const plain: NotificationSettingsPlain = {
      email: { thread: true, textMention: true },
      slack: { thread: true, textMention: true },
      teams: { thread: true, textMention: true },
      webPush: { thread: true, textMention: true },
    };
    const settings = createNotificationSettings(plain);

    // TODO Use Set-based comparison here when available in tosti
    const keys = Object.keys(settings);
    assertEq(keys.sort(), ["email", "slack", "teams", "webPush"].sort());
  });
});
