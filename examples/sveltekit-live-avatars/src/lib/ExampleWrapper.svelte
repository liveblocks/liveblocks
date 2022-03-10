<script>
  const isRunningOnCodeSandbox = typeof process !== 'undefined' ? process.env.CODESANDBOX_SSE : false;
  const hasLiveblocksSecretKey = import.meta.env.VITE_hasLiveblocksSecretKey || import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY || import.meta.env.VITE_LIVEBLOCKS_SECRET_KEY;
</script>

{#if hasLiveblocksSecretKey}
  <slot></slot>
{:else}
  <div>
    {#if isRunningOnCodeSandbox}
      <div class="container mx-auto px-8">
        <h1 class="text-3xl font-semibold mt-24 mb-2">Welcome to this Liveblocks Svelte example</h1>
        <p class="mt-8 mb-6">
          To run
          <a href="https://liveblocks.io" target="_blank" rel="noreferrer" class="text-orange-600 dark:text-orange:500 font-semibold">
            Liveblocks
          </a>
          examples on CodeSandbox
        </p>
        <ul class="list-disc list-inside">
          <li class="mb-2">
            Create an account on
            <a href="https://liveblocks.io" target="_blank" rel="noreferrer" class="text-orange-600 dark:text-orange:500 font-semibold">
              liveblocks.io
            </a>
          </li>
          <li class="mb-2"> Copy your secret key from the administration</li>
          <li class="mb-2">
            Add a
            <a
              href="https://codesandbox.io/docs/secrets"
              target="_blank"
              rel="noreferrer"
            >
              secret key
            </a>
            named
              <code class="relative font-mono bg-black shadow-thin-border-300 rounded-lg my-4 text-sm text-gray-200 px-2 py-1.5">
                VITE_LIVEBLOCKS_SECRET_KEY</code>
            to your CodeSandbox sandbox.
          </li>
          <li class="mb-2">
            Refresh your browser and you should be good to go!
          </li>
        </ul>
      </div>
    {:else}
      <div class="container mx-auto px-8">
        <h1 class="text-3xl font-semibold mt-24 mb-2">Welcome to this Liveblocks Svelte example</h1>
        <p class="mt-8 mb-6">
          To run
          <a href="https://liveblocks.io" target="_blank" rel="noreferrer" class="text-orange-600 dark:text-orange:500 font-semibold">
            Liveblocks
          </a>
          examples locally
        </p>
        <ul class="list-disc list-inside">
          <li class="mb-2">
            Install all dependencies with
            <code class="relative font-mono bg-black shadow-thin-border-300 rounded-lg my-4 text-sm text-gray-200 px-2 py-1.5">
              npm install
            </code>
          </li>
          <li class="mb-2">
            Create an account on
            <a href="https://liveblocks.io" target="_blank" rel="noreferrer" class="text-orange-600 dark:text-orange:500 font-semibold">
              liveblocks.io
            </a>
          </li>
          <li class="mb-2">Copy your secret key from the administration</li>
          <li class="mb-2">
            Create a file named
              <code class="relative font-mono bg-black shadow-thin-border-300 rounded-lg my-4 text-sm text-gray-200 px-2 py-1.5">
                .env</code> and add your
            Liveblocks secret as an environment variable:
            <pre class="relative font-mono bg-black shadow-thin-border-300 rounded-lg my-4 text-sm text-gray-200 pt-2 px-4" style="min-height: 36px; line-height: 1.5em; max-width: 400px;"><code>VITE_LIVEBLOCKS_SECRET_KEY=pk_live_yourkey</code></pre>
          </li>
          <li class="mb-2">
            Run
            <code class="relative font-mono bg-black shadow-thin-border-300 rounded-lg my-4 text-sm text-gray-200 px-2 py-1.5">
              npm run dev</code>
            and you should be good to go.
          </li>
        </ul>
      </div>
    {/if}
  </div>
  {/if}
