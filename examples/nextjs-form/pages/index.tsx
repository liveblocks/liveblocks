import {
  useOthers,
  useUpdateMyPresence,
  useOthersMapped,
  useMutation,
  useStorage,
  useSelf,
} from "../liveblocks.config";
import React from "react";
import Avatar from "../components/Avatar";
import Selection from "../components/Selection";
import styles from "./index.module.css";
import { COLORS } from "../constants";

/**
 * This file shows how to create a simple collaborative form.
 *
 * We use the presence block to show the currently focused input to everyone in the room.
 * We use the storage block to persist the state of the form even after everyone leaves the room.
 *
 * The users avatar and name are not set via the `useMyPresence` hook like the cursors.
 * They are set from the authentication endpoint.
 *
 * See pages/api/liveblocks-auth.ts and https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
 */

export default function Example() {
  /**
   * updateMyPresence is used to show the focused input to all the users in the room.
   * It's good way to show to everyone that a user is currently editing a field to avoid potential conflict.
   * For more information: https://liveblocks.io/docs/api-reference/liveblocks-react#useUpdateMyPresence
   */
  const updateMyPresence = useUpdateMyPresence();

  /**
   * useStorage is used to read and stay in sync with the shared state, which
   * all users in the room see. It's using Liveblocks Storage so the data is
   * persisted even after all the users leave the room. For more information:
   * https://liveblocks.io/docs/api-reference/liveblocks-react#useStorage
   */
  const logo = useStorage((root) => root.logo);

  const updateName = useMutation(({ storage }, name: string) => {
    storage.get("logo").set("name", name);
  }, []);

  const updateTheme = useMutation(({ storage }, theme: "light" | "dark") => {
    storage.get("logo").set("theme", theme);
  }, []);

  if (!logo) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <img src="https://liveblocks.io/loading.svg" alt="Loading" />
        </div>
      </div>
    );
  }

  const { theme, name } = logo;
  return (
    <div className={styles.container}>
      <div
        className={
          theme === "light"
            ? styles.preview_container
            : styles.preview_container_dark
        }
      >
        <div className={styles.preview}>{name}</div>
      </div>
      <div className={styles.form_container}>
        <div className={styles.form_content}>
          <Avatars />
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <h2 className={styles.heading}>Customize Logo</h2>
            <p className={styles.description}>
              Control how your logo looks and feel.
            </p>

            <div className={styles.form_group}>
              <label className={styles.label}>Name</label>

              <div className={styles.selection_container}>
                <input
                  id="input-name"
                  type="text"
                  className={styles.input}
                  value={name}
                  onFocus={(e) => updateMyPresence({ focusedId: e.target.id })}
                  onBlur={() => updateMyPresence({ focusedId: null })}
                  onChange={(e) => updateName(e.target.value)}
                  maxLength={20}
                />
                <Selections id="input-name" />
              </div>
            </div>

            <div className={styles.form_group}>
              <label className={styles.label}>Theme</label>

              <div className={styles.form_group_grid}>
                <div className={styles.selection_container}>
                  <button
                    id="button-theme-light"
                    className={
                      theme === "light"
                        ? styles.button_theme_selected
                        : styles.button_theme
                    }
                    onClick={() => updateTheme("light")}
                    onFocus={(e) =>
                      updateMyPresence({ focusedId: e.target.id })
                    }
                    onBlur={() => updateMyPresence({ focusedId: null })}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 17.0654C10.6739 17.0654 9.40215 16.5386 8.46447 15.601C7.52678 14.6633 7 13.3915 7 12.0654C7 10.7393 7.52678 9.46758 8.46447 8.5299C9.40215 7.59221 10.6739 7.06543 12 7.06543C13.3261 7.06543 14.5979 7.59221 15.5355 8.5299C16.4732 9.46758 17 10.7393 17 12.0654C17 13.3915 16.4732 14.6633 15.5355 15.601C14.5979 16.5386 13.3261 17.0654 12 17.0654ZM12 2.06543C12.2652 2.06543 12.5196 2.17079 12.7071 2.35832C12.8946 2.54586 13 2.80021 13 3.06543V5.06543C13 5.33065 12.8946 5.585 12.7071 5.77254C12.5196 5.96007 12.2652 6.06543 12 6.06543C11.7348 6.06543 11.4804 5.96007 11.2929 5.77254C11.1054 5.585 11 5.33065 11 5.06543V3.06543C11 2.80021 11.1054 2.54586 11.2929 2.35832C11.4804 2.17079 11.7348 2.06543 12 2.06543ZM12 18.0654C12.2652 18.0654 12.5196 18.1708 12.7071 18.3583C12.8946 18.5459 13 18.8002 13 19.0654V21.0654C13 21.3306 12.8946 21.585 12.7071 21.7725C12.5196 21.9601 12.2652 22.0654 12 22.0654C11.7348 22.0654 11.4804 21.9601 11.2929 21.7725C11.1054 21.585 11 21.3306 11 21.0654V19.0654C11 18.8002 11.1054 18.5459 11.2929 18.3583C11.4804 18.1708 11.7348 18.0654 12 18.0654ZM3 11.0654H5C5.26522 11.0654 5.51957 11.1708 5.70711 11.3583C5.89464 11.5459 6 11.8002 6 12.0654C6 12.3306 5.89464 12.585 5.70711 12.7725C5.51957 12.9601 5.26522 13.0654 5 13.0654H3C2.73478 13.0654 2.48043 12.9601 2.29289 12.7725C2.10536 12.585 2 12.3306 2 12.0654C2 11.8002 2.10536 11.5459 2.29289 11.3583C2.48043 11.1708 2.73478 11.0654 3 11.0654ZM19 11.0654H21C21.2652 11.0654 21.5196 11.1708 21.7071 11.3583C21.8946 11.5459 22 11.8002 22 12.0654C22 12.3306 21.8946 12.585 21.7071 12.7725C21.5196 12.9601 21.2652 13.0654 21 13.0654H19C18.7348 13.0654 18.4804 12.9601 18.2929 12.7725C18.1054 12.585 18 12.3306 18 12.0654C18 11.8002 18.1054 11.5459 18.2929 11.3583C18.4804 11.1708 18.7348 11.0654 19 11.0654ZM19.071 4.99443C19.2585 5.18196 19.3638 5.43627 19.3638 5.70143C19.3638 5.96659 19.2585 6.2209 19.071 6.40843L17.657 7.82243C17.5648 7.91794 17.4544 7.99412 17.3324 8.04653C17.2104 8.09894 17.0792 8.12653 16.9464 8.12768C16.8136 8.12883 16.6819 8.10353 16.559 8.05325C16.4361 8.00297 16.3245 7.92872 16.2306 7.83482C16.1367 7.74093 16.0625 7.62928 16.0122 7.50638C15.9619 7.38349 15.9366 7.25181 15.9377 7.11903C15.9389 6.98625 15.9665 6.85503 16.0189 6.73303C16.0713 6.61102 16.1475 6.50068 16.243 6.40843L17.657 4.99443C17.8445 4.80696 18.0988 4.70164 18.364 4.70164C18.6292 4.70164 18.8835 4.80696 19.071 4.99443ZM7.757 16.3084C7.94447 16.496 8.04979 16.7503 8.04979 17.0154C8.04979 17.2806 7.94447 17.5349 7.757 17.7224L6.343 19.1364C6.25075 19.2319 6.14041 19.3081 6.0184 19.3605C5.8964 19.4129 5.76518 19.4405 5.6324 19.4417C5.49962 19.4428 5.36794 19.4175 5.24505 19.3673C5.12215 19.317 5.0105 19.2427 4.9166 19.1488C4.82271 19.0549 4.74846 18.9433 4.69818 18.8204C4.6479 18.6975 4.6226 18.5658 4.62375 18.433C4.6249 18.3002 4.65249 18.169 4.7049 18.047C4.75731 17.925 4.83349 17.8147 4.929 17.7224L6.343 16.3084C6.53053 16.121 6.78484 16.0156 7.05 16.0156C7.31516 16.0156 7.56947 16.121 7.757 16.3084ZM6.343 4.99443L7.757 6.40843C7.93916 6.59703 8.03995 6.84963 8.03767 7.11183C8.0354 7.37403 7.93023 7.62484 7.74482 7.81025C7.55941 7.99566 7.3086 8.10083 7.0464 8.1031C6.7842 8.10538 6.5316 8.00459 6.343 7.82243L4.93 6.40843C4.74784 6.21983 4.64705 5.96723 4.64933 5.70503C4.6516 5.44283 4.75677 5.19202 4.94218 5.00661C5.12759 4.8212 5.3784 4.71603 5.6406 4.71376C5.9028 4.71148 6.1554 4.81227 6.344 4.99443H6.343ZM17.657 16.3084L19.071 17.7224C19.2532 17.911 19.354 18.1636 19.3517 18.4258C19.3494 18.688 19.2442 18.9388 19.0588 19.1242C18.8734 19.3097 18.6226 19.4148 18.3604 19.4171C18.0982 19.4194 17.8456 19.3186 17.657 19.1364L16.243 17.7224C16.1475 17.6302 16.0713 17.5198 16.0189 17.3978C15.9665 17.2758 15.9389 17.1446 15.9377 17.0118C15.9366 16.8791 15.9619 16.7474 16.0122 16.6245C16.0625 16.5016 16.1367 16.3899 16.2306 16.296C16.3245 16.2021 16.4361 16.1279 16.559 16.0776C16.6819 16.0273 16.8136 16.002 16.9464 16.0032C17.0792 16.0043 17.2104 16.0319 17.3324 16.0843C17.4544 16.1367 17.5648 16.2129 17.657 16.3084Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <Selections id="button-theme-light" />
                </div>
                <div className={styles.selection_container}>
                  <button
                    id="button-theme-dark"
                    className={
                      theme === "dark"
                        ? styles.button_theme_selected
                        : styles.button_theme
                    }
                    onClick={() => updateTheme("dark")}
                    onFocus={(e) =>
                      updateMyPresence({ focusedId: e.target.id })
                    }
                    onBlur={() => updateMyPresence({ focusedId: null })}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.0001 11.8395C10.9516 10.7906 10.2375 9.45436 9.94814 7.99974C9.65876 6.54512 9.80705 5.03736 10.3743 3.66699C8.75701 3.98537 7.27145 4.77892 6.10762 5.94616C2.85345 9.20033 2.85345 14.477 6.10762 17.7312C9.36262 20.9862 14.6385 20.9853 17.8935 17.7312C19.0604 16.5674 19.8539 15.0822 20.1726 13.4653C18.8022 14.0324 17.2945 14.1807 15.8399 13.8913C14.3853 13.6019 13.0491 12.8879 12.0001 11.8395Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <Selections id="button-theme-dark" />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Selections({ id }: { id: string }) {
  const users = useOthers();
  return (
    <>
      {users.map(({ connectionId, info, presence }) => {
        if (presence.focusedId === id) {
          return (
            <Selection
              key={connectionId}
              name={info.name}
              color={COLORS[connectionId % COLORS.length]}
            />
          );
        }
      })}
    </>
  );
}

const Avatars = React.memo(function Avatars() {
  const me = useSelf((me) => me.info);
  const users = useOthersMapped((others) => others.info);
  return (
    <div className={styles.avatars}>
      {users.slice(0, 3).map(([connectionId, info]) => {
        return (
          <Avatar
            key={connectionId}
            src={info.avatar}
            name={info.name}
            color={COLORS[connectionId % COLORS.length]}
          />
        );
      })}

      {me && <Avatar src={me.avatar} name="You" />}
    </div>
  );
});

export async function getStaticProps() {
  const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY;
  const API_KEY_WARNING = process.env.CODESANDBOX_SSE
    ? `Add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` secret in CodeSandbox.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-avatars#codesandbox.`
    : `Create an \`.env.local\` file and add your secret key from https://liveblocks.io/dashboard/apikeys as the \`LIVEBLOCKS_SECRET_KEY\` environment variable.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-live-avatars#getting-started.`;

  if (!API_KEY) {
    console.warn(API_KEY_WARNING);
  }

  return { props: {} };
}
