import type {
  InboxNotificationData,
  LiveList,
  LiveMap,
  LiveObject,
} from "@liveblocks/core";
import { expectError, expectType } from "tsd";
import type { InboxNotificationCustomKindProps } from "@liveblocks/react-ui";
import { InboxNotification } from "@liveblocks/react-ui";

// TODO: Create type tests for all components/props

//
// User-provided type augmentations
//
declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number };
    };

    Storage: {
      animals: LiveList<string>;
      scores: LiveMap<string, number>;
      person: LiveObject<{ name: string; age: number }>;
    };

    UserMeta: {
      info: {
        name: string;
        age: number;
      };
    };

    RoomEvent:
      | { type: "emoji"; emoji: string }
      | { type: "beep"; times?: number };

    ThreadMetadata: {
      color: "red" | "blue";
    };

    RoomInfo: {
      name: string;
      url?: string;
      type: "public" | "private";
    };

    GroupInfo: {
      name: string;
      avatar?: string;
      type: "open" | "closed";
    };

    ActivitiesData: {
      $myErrorNotification: {
        message: string;
        code: number;
      };
      $myUploadNotification: {
        duration: number;
        uploadId: string;
      };
    };
  }
}

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
          expectType<string>(
            props.inboxNotification.activities[0]!.data.message
          );
          expectType<number>(props.inboxNotification.activities[0]!.data.code);
          expectError(props.inboxNotification.activities[0]!.data.nonexisting);
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

  // Non-existing custom kinds are not allowed
  {
    expectError(
      <InboxNotification
        inboxNotification={{} as InboxNotificationData}
        kinds={{
          $myNonExistingNotification: (_props: any) => null,
        }}
      />
    );
  }

  // Custom kinds’ props types can be used as expected in external components
  {
    function MyCustomInboxNotification({
      inboxNotification,
      ...props
    }: InboxNotificationCustomKindProps) {
      expectType<
        | { message: string; code: number }
        | { duration: number; uploadId: string }
      >(inboxNotification.activities[0]!.data);

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
      expectType<string>(inboxNotification.activities[0]!.data.message);
      expectType<number>(inboxNotification.activities[0]!.data.code);
      expectError(inboxNotification.activities[0]!.data.nonexisting);

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

    // When ActivitiesData is set with augmentation, specific custom kinds’ props types can only be used with their kinds
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
