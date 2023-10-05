import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>E2E test app</h1>
      <ul>
        <li>
          <div>/storage</div>
          <ul>
            <li>
              <Link href="/presence?room=e2e-presence">
                <a>/presence</a>
              </Link>
            </li>
            <li>
              <Link href="/presence/with-suspense?room=e2e-presence-with-suspense">
                <a>/presence/with-suspense</a>
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <div>/storage</div>
          <ul>
            <li>
              <Link href="/storage/list?room=e2e-storage-list">
                <a>/storage/list</a>
              </Link>
            </li>
            <li>
              <Link href="/storage/list-with-suspense?room=e2e-storage-list-with-suspense">
                <a>/storage/list-with-suspense</a>
              </Link>
            </li>
            <li>
              <Link href="/storage/map?room=e2e-storage-map">
                <a>/storage/map</a>
              </Link>
            </li>
            <li>
              <Link href="/storage/object?room=e2e-storage-object">
                <a>/storage/object</a>
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <Link href="/offline?room=e2e-offline">
            <a>/offline</a>
          </Link>
        </li>
        <li>
          <Link href="/batching?room=e2e-batching-presence-storage">
            <a>/batching</a>
          </Link>
        </li>
        <li>
          <Link href="/redux?room=e2e-redux">
            <a>/redux</a>
          </Link>
        </li>
        <li>
          <Link href="/zustand?room=e2e-zustand">
            <a>/zustand</a>
          </Link>
        </li>
        <li>
          <div>/auth</div>
          <ul>
            <li>
              <Link href="/auth/pubkey?room=e2e-modern-auth">
                <a>/auth/pubkey</a>
              </Link>
            </li>
            <li>
              <Link href="/auth/secret-legacy?room=e2e-modern-auth">
                <a>/auth/secret-legacy</a>
              </Link>
            </li>
            <li>
              <Link href="/auth/id-token?room=e2e-modern-auth">
                <a>/auth/id-token</a>
              </Link>
            </li>
            <li>
              <Link href="/auth/acc-token?room=e2e-modern-auth">
                <a>/auth/acc-token</a>
              </Link>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  );
}
