import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>E2E test app</h1>
      <ul>
        <li>
          <div>Presence</div>
          <ul>
            <li>
              <Link href="/presence?room=e2e-presence">Presence</Link>
            </li>
            <li>
              <Link href="/presence/with-suspense?room=e2e-presence-with-suspense">
                Presence (with Suspense)
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <div>Storage</div>
          <ul>
            <li>
              <Link href="/storage/list?room=e2e-storage-list">LiveList</Link>
            </li>
            <li>
              <Link href="/storage/list-with-suspense?room=e2e-storage-list-with-suspense">
                LiveList (with Suspense)
              </Link>
            </li>
            <li>
              <Link href="/storage/map?room=e2e-storage-map">LiveMap</Link>
            </li>
            <li>
              <Link href="/storage/object?room=e2e-storage-object">
                LiveObject
              </Link>
            </li>
            <li>
              <Link href="/storage/stress/e2e-stress-test">Stress Test</Link>
            </li>
          </ul>
        </li>

        <li>
          <Link href="/offline?room=e2e-offline">Offline</Link>
        </li>
        <li>
          <Link href="/batching?room=e2e-batching-presence-storage">
            Batching
          </Link>
        </li>
        <li>
          <div>Multiple rooms</div>
          <ul>
            <li>
              <Link href="/multi?room=e2e-multi">With factory</Link>
            </li>
            <li>
              <Link href="/multi/with-global-augmentation?room=e2e-multi">
                With global augmentation
              </Link>
            </li>
          </ul>
        </li>

        <hr />

        <li>
          <div>Comments</div>
          <ul>
            <li>
              <Link href="/comments?room=e2e-comments">Comments</Link>
            </li>
            <li>
              <Link href="/comments/with-suspense?room=e2e-comments-with-suspense">
                Comments (with Suspense)
              </Link>
            </li>
            <li>
              <Link href="/comments/composer?room=e2e-comments-composer">
                Comments Composer
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <div>Inbox Notifications</div>
          <ul>
            <li>
              Classic [{" "}
              <Link href="/inbox-notifications?room=e2e-inbox-notif&user=7">
                user 7
              </Link>{" "}
              ,{" "}
              <Link href="/inbox-notifications?room=e2e-inbox-notif&user=12">
                user 12
              </Link>{" "}
              ]
            </li>
          </ul>
          <ul>
            <li>
              With Suspense [{" "}
              <Link href="/inbox-notifications/with-suspense?room=e2e-inbox-notif-sus&user=7">
                user 7
              </Link>{" "}
              ,{" "}
              <Link href="/inbox-notifications/with-suspense?room=e2e-inbox-notif-sus&user=12">
                user 12
              </Link>{" "}
              ]
            </li>
          </ul>
        </li>

        <li>
          <div>Notification Settings</div>
          <ul>
            <li>
              <Link href="/notification-settings?room=e2e-notif-settings&user=13">
                Classic (as user 13)
              </Link>
            </li>
          </ul>
          <ul>
            <li>
              <Link href="/notification-settings/with-suspense?room=e2e-notif-settings-sus&user=13">
                With suspense (as user 13)
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <Link href="/subscription-settings?room=e2e-subscription-settings&user=12">
            Room subscription settings
          </Link>
        </li>
        <li>
          {/* <Link href="/version-history?room=e2e-version-history"> */}
          Version History (TODO)
          {/* </Link> */}
        </li>

        <hr />

        <li>
          <Link href="/redux?room=e2e-redux">Redux</Link>
        </li>
        <li>
          <Link href="/zustand?room=e2e-zustand">Zustand</Link>
        </li>

        <hr />

        <li>
          <div>Auth</div>
          <ul>
            <li>
              <Link href="/auth/pubkey?room=e2e-modern-auth">
                With public key
              </Link>
            </li>
            <li>
              <Link href="/auth/secret-legacy?room=e2e-modern-auth">
                With legacy token
              </Link>
            </li>
            <li>
              <Link href="/auth/id-token?room=e2e-modern-auth">
                With ID token
              </Link>
            </li>
            <li>
              <Link href="/auth/acc-token?room=e2e-modern-auth">
                With access token
              </Link>
            </li>
          </ul>
        </li>

        <hr />

        <li>
          <div>Yjs</div>
          <ul>
            <li>
              <Link href="/ydoc/text?room=e2e-yjs-text">Text</Link>
            </li>
            <li>
              <Link href="/ydoc/subdoc?room=e2e-yjs-subdoc">Subdocs</Link>
            </li>
          </ul>
        </li>

        <hr />

        <li>
          <div>Miscellaneous</div>
        </li>
        <ul>
          <li>
            <Link href="/icons">
              All <code>@liveblocks/react-ui</code> icons
            </Link>
          </li>
        </ul>
      </ul>
    </div>
  );
}
