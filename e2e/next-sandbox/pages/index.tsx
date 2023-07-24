import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>E2E test app</h1>

      <ul>
        <li>
          <Link href="/presence">
            <a>/presence</a>
          </Link>
        </li>
        <li>
          <div>/storage</div>
          <ul>
            <li>
              <Link href="/storage/list">
                <a>/storage/list</a>
              </Link>
            </li>
            <li>
              <Link href="/storage/map">
                <a>/storage/map</a>
              </Link>
            </li>
            <li>
              <Link href="/storage/object">
                <a>/storage/object</a>
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <Link href="/offline">
            <a>/offline</a>
          </Link>
        </li>
        <li>
          <Link href="/batching">
            <a>/batching</a>
          </Link>
        </li>
        <li>
          <Link href="/redux">
            <a>/redux</a>
          </Link>
        </li>
        <li>
          <Link href="/zustand">
            <a>/zustand</a>
          </Link>
        </li>
        <li>
          <div>/auth</div>
          <ul>
            <li>
              <Link href="/auth/pubkey">
                <a>/auth/pubkey</a>
              </Link>
            </li>
            <li>
              <Link href="/auth/secret-legacy">
                <a>/auth/secret-legacy</a>
              </Link>
            </li>
            <li>
              <Link href="/auth/id-token">
                <a>/auth/id-token</a>
              </Link>
            </li>
            <li>
              <Link href="/auth/acc-token">
                <a>/auth/acc-token</a>
              </Link>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  );
}
