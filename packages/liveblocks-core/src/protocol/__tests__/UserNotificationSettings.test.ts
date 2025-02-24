import {
  createUserNotificationSettings,
  type UserNotificationSettingsPlain,
} from "../UserNotificationSettings";

describe("UserNotificationSettings protocol", () => {
  it("should create an object with getters for each known notification channel", () => {
    const initial: UserNotificationSettingsPlain = {
      email: {
        thread: true,
        textMention: false,
      },
      slack: {
        thread: false,
        textMention: true,
      },
    };

    const settings = createUserNotificationSettings(initial);

    expect(settings.email.thread).toBe(true);
    expect(settings.email.textMention).toBe(false);

    expect(settings.slack.thread).toBe(false);
    expect(settings.slack.textMention).toBe(true);
  });

  it("should throw if a channel is not defined in initial and is accessed later", () => {
    const initial: UserNotificationSettingsPlain = {
      email: {
        thread: true,
        textMention: true,
      },
    };
    const settings = createUserNotificationSettings(initial);

    expect(() => settings.teams).toThrow(/please set up your project first/i);
    expect(() => settings.webPush).toThrow(/please set up your project first/i);
  });

  it("should return valid channel settings if all channels are defined", () => {
    const initial: UserNotificationSettingsPlain = {
      email: { thread: true, textMention: true },
      slack: { thread: false, textMention: true },
      teams: { thread: true, textMention: false },
      webPush: { thread: false, textMention: false },
    };

    const settings = createUserNotificationSettings(initial);

    expect(() => settings.email).not.toThrow();
    expect(() => settings.slack).not.toThrow();
    expect(() => settings.teams).not.toThrow();
    expect(() => settings.webPush).not.toThrow();

    expect(settings.email.thread).toBe(true);
    expect(settings.teams.textMention).toBe(false);
  });

  it("should return an object where properties are enumerable except `[kPrivate]`", () => {
    const initial: UserNotificationSettingsPlain = {
      email: { thread: true, textMention: true },
      slack: { thread: true, textMention: true },
      teams: { thread: true, textMention: true },
      webPush: { thread: true, textMention: true },
    };

    const settings = createUserNotificationSettings(initial);

    const keys = Object.keys(settings);
    expect(keys.sort()).toEqual(["email", "slack", "teams", "webPush"].sort());
  });
});
