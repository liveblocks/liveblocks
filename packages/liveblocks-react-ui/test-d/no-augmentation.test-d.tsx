import type { ActivityData, InboxNotificationData } from "@liveblocks/core";
import { expectError, expectType } from "tsd";
import type { InboxNotificationCustomKindProps } from "@liveblocks/react-ui";
import { InboxNotification } from "@liveblocks/react-ui";

// TODO: Create type tests for all components/props

// <InboxNotification />: `kinds` prop
{
  // Existing kinds have the expected props types
  {
    <InboxNotification
      inboxNotification={{} as InboxNotificationData}
      kinds={{
        thread: (props) => {
          expectType<string>(props.inboxNotification.threadId);
          expectError(props.inboxNotification.activities);

          return <InboxNotification.Thread {...props} />;
        },
        textMention: (props) => {
          expectType<string>(props.inboxNotification.mentionId);
          expectError(props.inboxNotification.activities);

          return <InboxNotification.TextMention {...props} />;
        },
        $myErrorNotification: (props) => {
          expectType<ActivityData>(props.inboxNotification.activities[0]!.data);
          expectError(props.inboxNotification.threadId);
          expectError(props.inboxNotification.mentionId);

          return (
            <InboxNotification.Custom {...props} title="Title">
              Content
            </InboxNotification.Custom>
          );
        },
      }}
    />;
  }

  // All custom kinds are allowed when ActivitiesData is not set with augmentation
  {
    <InboxNotification
      inboxNotification={{} as InboxNotificationData}
      kinds={{
        $myNonExistingNotification: (_props: any) => null,
      }}
    />;
  }

  // Custom kinds’ props types can be used as expected in external components
  {
    function MyCustomInboxNotification({
      inboxNotification,
      ...props
    }: InboxNotificationCustomKindProps) {
      expectType<ActivityData>(inboxNotification.activities[0]!.data);

      return (
        <InboxNotification.Custom
          inboxNotification={inboxNotification}
          {...props}
          title="Title"
        >
          Content
        </InboxNotification.Custom>
      );
    }

    function MySpecificCustomInboxNotification({
      inboxNotification,
      ...props
    }: InboxNotificationCustomKindProps<"$myErrorNotification">) {
      expectType<ActivityData>(inboxNotification.activities[0]!.data);

      return (
        <InboxNotification.Custom
          inboxNotification={inboxNotification}
          {...props}
          title="Title"
        >
          Content
        </InboxNotification.Custom>
      );
    }

    <InboxNotification
      inboxNotification={{} as InboxNotificationData}
      kinds={{
        $myErrorNotification: MyCustomInboxNotification,
        $myUploadNotification: MyCustomInboxNotification,
      }}
    />;

    expectError(
      <InboxNotification
        inboxNotification={{} as InboxNotificationData}
        kinds={{
          $myErrorNotification: MySpecificCustomInboxNotification,
          $myUploadNotification: MySpecificCustomInboxNotification,
        }}
      />
    );
  }
}
