<template>
  <div
    class="border-4 rounded-full border-white -ml-3 bg-gray-400 avatar"
    v-bind:data-tooltip="name"
  >
    <img class="rounded-full" :src="picture" height="48px" width="48px" />
  </div>
</template>

<style scoped>
.avatar {
  height: 56px;
  width: 56px;
  min-width: 56px;
}

.avatar:before {
  content: attr(data-tooltip);
  position: absolute;
  opacity: 0;
  transition: all 0.15s ease;
  padding: 5px 10px;
  color: white;
  font-size: 0.75rem;
  border-radius: 8px;
  z-index: 1;
  background: black;
  white-space: nowrap;
  margin-top: 10px;
  margin-left: 52px;
}

.avatar:hover:before {
  opacity: 1;
}
</style>

<script>
export default {
  props: ["name", "picture"]
};
</script>
