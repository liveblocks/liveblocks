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
  display: flex;
  place-content: center;
  position: relative;
  width: 56px;
  height: 56px;
}

.avatar:before {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  opacity: 0;
  transition: opacity 0.15s ease;
  padding: 5px 10px;
  color: white;
  font-size: 0.75rem;
  border-radius: 8px;
  margin-bottom: 10px;
  z-index: 1;
  background: black;
  white-space: nowrap;
}

.avatar:hover:before {
  opacity: 1;
}
</style>

<script>
export default {
  props: ["name", "picture"],
};
</script>
