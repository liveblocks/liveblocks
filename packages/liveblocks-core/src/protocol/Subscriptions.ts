import type { DAD } from "../globals/augmentation";
import type { DateToString } from "../lib/DateToString";
import type { NotificationKind } from "./NotificationSettings";

export type SubscriptionData<K extends keyof DAD = keyof DAD> = {
  kind: NotificationKind<K>;
  subjectId: string;
  createdAt: Date;
};

export type SubscriptionDataPlain = DateToString<SubscriptionData>;

export type UserSubscriptionData<K extends keyof DAD = keyof DAD> =
  SubscriptionData<K> & {
    userId: string;
  };

export type UserSubscriptionDataPlain = DateToString<UserSubscriptionData>;

export type SubscriptionDeleteInfo = {
  type: "deletedSubscription";
  kind: NotificationKind;
  subjectId: string;
  deletedAt: Date;
};

export type SubscriptionDeleteInfoPlain = DateToString<SubscriptionDeleteInfo>;

export type SubscriptionKey = `${NotificationKind}:${string}`;

export function getSubscriptionKey(
  subscription: SubscriptionData | SubscriptionDeleteInfo
): SubscriptionKey;
export function getSubscriptionKey(
  kind: NotificationKind,
  subjectId: string
): SubscriptionKey;
export function getSubscriptionKey(
  subscription: SubscriptionData | SubscriptionDeleteInfo | NotificationKind,
  subjectId?: string
): SubscriptionKey {
  if (typeof subscription === "string") {
    return `${subscription}:${subjectId}`;
  }

  return `${subscription.kind}:${subscription.subjectId}`;
}
