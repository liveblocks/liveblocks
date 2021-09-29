<template>
    <pre
      class="relative font-mono bg-black shadow-thin-border-300 rounded-lg my-4 text-sm text-gray-200 pt-2"
      style="
        min-height: 36px;
        line-height: 1.5em;
        max-width: 400px;
      "
    >
      <code>{{code}}</code>
    </pre>
</template>

<script>
  export default {
    props: ["code"]
  }
</script>
