<template>
  <div class="px-8">
    <h1 class="text-3xl font-semibold mt-24 mb-2">
      Welcome to Liveblocks × Nuxt.js live avatars example
    </h1>
    <GithubLink
      className="fixed top-8 right-8"
      href="https://github.com/liveblocks/liveblocks/tree/main/examples/nuxtjs-live-avatars"
    ></GithubLink>
    <div v-if="hasLiveblocksSecretKey">
      <p class="text-gray-400 mb-4 text-lg">
        Get started with the real-time examples below.
      </p>

      <div class="grid grid-cols-3 gap-16">
        <div>
          <div class="max-w-sm">
            <h2 class="mt-12 mb-1 font-medium text-lg">Basic</h2>
            <p class="text-gray-400 mb-4">
              Basic examples to help you understand how the APIs work for each
              block.
            </p>
          </div>
          <ul class="grid grid-cols-1 gap-4">
            <ListItem
              label="Live Avatars"
              href="/live-avatars"
              description="Live Avatars"
            ></ListItem>
          </ul>
        </div>
      </div>
    </div>
    <div v-else>
      <div v-if="isRunningOnCodeSandbox">
        <p class="mt-12 mb-6">
          To run
          <a href="https://liveblocks.io" target="_blank" rel="noreferrer">
            Liveblocks
          </a>
          examples on CodeSandbox
        </p>
        <ul class="list-disc list-inside">
          <li class="mb-2">
            Create an account on
            <a href="https://liveblocks.io" target="_blank" rel="noreferrer">
              liveblocks.io
            </a>
          </li>
          <li class="mb-2">Copy your secret key from the administration</li>
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
            <InlineCodeBlock code="LIVEBLOCKS_SECRET_KEY"></InlineCodeBlock>
            to your CodeSandbox sandbox.
          </li>
          <li class="mb-2">
            Refresh your browser and you should be good to go!
          </li>
        </ul>
      </div>
      <div v-else>
        <p class="mt-12 mb-6">
          To run
          <a href="https://liveblocks.io" target="_blank" rel="noreferrer">
            Liveblocks
          </a>
          examples locally
        </p>
        <ul class="list-disc list-inside">
          <li class="mb-2">
            Install all dependencies with
            <SingleLineCodeBlock code="npm install"></SingleLineCodeBlock>
          </li>
          <li class="mb-2">
            Create an account on
            <a href="https://liveblocks.io" target="_blank" rel="noreferrer">
              liveblocks.io
            </a>
          </li>
          <li class="mb-2">Copy your secret key from the administration</li>
          <li class="mb-2">
            Create a file named
            <InlineCodeBlock code=".env"></InlineCodeBlock> and add your
            Liveblocks secret as environment variable
            <SingleLineCodeBlock
              code="LIVEBLOCKS_SECRET_KEY=sk_test_yourkey"
            ></SingleLineCodeBlock>
          </li>
          <li class="mb-2">
            Run the following command and you should be good to go
            <SingleLineCodeBlock code="npm run dev"></SingleLineCodeBlock>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from "vue";

export default Vue.extend({
  asyncData: function() {
    return {
      isRunningOnCodeSandbox: process.env.CODESANDBOX_SSE
    };
  },
  data: function() {
    return {
      hasLiveblocksSecretKey: process.env.hasLiveblocksSecretKey
    };
  }
});
</script>
