import Link from "next/link";
import React from "react";

export default function Home() {
  return (
    <div>
      <h1>E2E test app</h1>
      <ul>
        <li>
          <Link href="/presence?room=e2e-presence">
            <a>Presence</a>
          </Link>
        </li>
        <li>
          <Link href="/presence/with-suspense?room=e2e-presence-with-suspense">
            <a>Presence (with Suspense)</a>
          </Link>
        </li>
        <li>
          <div>Storage</div>
          <ul>
            <li>
              <Link href="/storage/list?room=e2e-storage-list">
                <a>LiveList</a>
              </Link>
            </li>
            <li>
              <Link href="/storage/list-with-suspense?room=e2e-storage-list-with-suspense">
                <a>LiveList (with Suspense)</a>
              </Link>
            </li>
            <li>
              <Link href="/storage/map?room=e2e-storage-map">
                <a>LiveMap</a>
              </Link>
            </li>
            <li>
              <Link href="/storage/object?room=e2e-storage-object">
                <a>LiveObject</a>
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <div>Comments</div>
          <ul>
            <li>
              <Link href="/comments?room=e2e-comments">
                <a>Comments</a>
              </Link>
            </li>
            <li>
              <Link href="/comments/with-suspense?room=e2e-comments-with-suspense">
                <a>Comments (with Suspense)</a>
              </Link>
            </li>
            <li>
              <Link href="/comments/composer?room=e2e-comments-composer">
                <a>Composer</a>
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <div>Inbox Notifications</div>
          <ul>
            <li>
              <Link href="/inbox-notifications?room=e2e-inbox-notif&user=12">
                <a>Classic (as user 12)</a>
              </Link>
            </li>
            <li>
              <Link href="/inbox-notifications?room=e2e-inbox-notif&user=7">
                <a>Classic (as user 7)</a>
              </Link>
            </li>
          </ul>
          <ul>
            <li>
              <Link href="/inbox-notifications/with-suspense?room=e2e-inbox-notif-sus&user=12">
                <a>With suspense (as user 12)</a>
              </Link>
            </li>
            <li>
              <Link href="/inbox-notifications/with-suspense?room=e2e-inbox-notif-sus&user=7">
                <a>With suspense (as user 7)</a>
              </Link>
            </li>
          </ul>
        </li>

        <li>
          <div>Channels Notification Settings</div>
          <ul>
            <li>
              <Link href="/channels-notification-settings?room=e2e-channels-notif-settings&user=13">
                <a>Classic (as user 13)</a>
              </Link>
            </li>
          </ul>
        </li>

        <li>
          <Link href="/offline?room=e2e-offline">
            <a>Offline</a>
          </Link>
        </li>
        <li>
          <Link href="/batching?room=e2e-batching-presence-storage">
            <a>Batching</a>
          </Link>
        </li>
        <li>
          <Link href="/redux?room=e2e-redux">
            <a>Redux</a>
          </Link>
        </li>
        <li>
          <Link href="/zustand?room=e2e-zustand">
            <a>Zustand</a>
          </Link>
        </li>
        <li>
          <div>Auth</div>
          <ul>
            <li>
              <Link href="/auth/pubkey?room=e2e-modern-auth">
                <a>With public key</a>
              </Link>
            </li>
            <li>
              <Link href="/auth/secret-legacy?room=e2e-modern-auth">
                <a>With legacy token</a>
              </Link>
            </li>
            <li>
              <Link href="/auth/id-token?room=e2e-modern-auth">
                <a>With ID token</a>
              </Link>
            </li>
            <li>
              <Link href="/auth/acc-token?room=e2e-modern-auth">
                <a>With access token</a>
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <div>Multiple rooms</div>
          <ul>
            <li>
              <Link href="/multi?room=e2e-multi">
                <a>With factory</a>
              </Link>
            </li>
            <li>
              <Link href="/multi/with-global-augmentation?room=e2e-multi">
                <a>With global augmentation</a>
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <div>Yjs</div>
          <ul>
            <li>
              <Link href="/ydoc/text?room=e2e-yjs-text">
                <a>Text</a>
              </Link>
            </li>
            <li>
              <Link href="/ydoc/subdoc?room=e2e-yjs-subdoc">
                <a>Subdocs</a>
              </Link>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  );
}
