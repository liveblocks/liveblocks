<template>
    <pre
      class="relative inline-block font-mono bg-black shadow-thin-border-300 rounded-lg text-sm text-gray-200 p-2 pl-0"
      style="
        min-height: 36px;
        line-height: 1.5em;
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
