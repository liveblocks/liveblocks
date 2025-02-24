import {
  createUserNotificationSettings,
  type UserNotificationSettingsPlain,
} from "../protocol/UserNotificationSettings";

describe("UserNotificationSettings protocol", () => {
  const noop = (value: any) => {
    // eslint-disable-next-line rulesdir/console-must-be-fancy
    console.log(value);
  };
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
      // omitted "teams" + "webPush" to test lazy setup
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

    // "teams" is not defined in initial, so we expect an error
    expect(() => {
      // Accessing teams getter
      const teams = settings.teams;
      noop(teams);
    }).toThrow(/please set up your project first/i);

    // "webPush" is not defined in initial, so we expect an error
    expect(() => {
      const webPush = settings.webPush;
      noop(webPush);
    }).toThrow(/please set up your project first/i);
  });

  it("should return valid channel settings if all channels are defined", () => {
    const allChannels: UserNotificationSettingsPlain = {
      email: { thread: true, textMention: true },
      slack: { thread: false, textMention: true },
      teams: { thread: true, textMention: false },
      webPush: { thread: false, textMention: false },
    };

    const settings = createUserNotificationSettings(allChannels);

    // We expect no throws for any channel
    expect(() => settings.email).not.toThrow();
    expect(() => settings.slack).not.toThrow();
    expect(() => settings.teams).not.toThrow();
    expect(() => settings.webPush).not.toThrow();

    expect(settings.email.thread).toBe(true);
    expect(settings.teams.textMention).toBe(false);
  });

  it("should return an object whose properties are enumerable (except kInternal)", () => {
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
