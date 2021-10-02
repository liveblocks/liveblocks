<template>
  <li>
    <NuxtLink
      v-bind:to="href"
      class="
        group
        flex
        justify-between
        items-center
        py-2
        px-3.5
        bg-white
        shadow-sm
        hover:shadow
        focus:shadow
        rounded-lg
        text-black
      "
    >
      <div>
        <h3 class="font-medium">{{ label }}</h3>

        <p v-if="description" class="text-sm text-gray-400">
          {{ description }}
        </p>
      </div>

      <span>&rarr;</span>
    </NuxtLink>
  </li>
</template>

<script>
export default {
  props: ["label", "description", "href"],
};
</script>
