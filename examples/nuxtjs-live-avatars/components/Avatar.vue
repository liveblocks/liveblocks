<template>
  <div class="avatar" v-bind:data-tooltip="name">
    <img class="picture" :alt="name" :src="src" height="48" width="48" />
  </div>
</template>

<style scoped>
.avatar {
  display: flex;
  place-content: center;
  position: relative;
  border: 4px solid #fff;
  border-radius: 9999px;
  width: 56px;
  height: 56px;
  background-color: #9ca3af;
  margin-left: -0.75rem;
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

.picture {
  border-radius: 9999px;
}
</style>

<script>
export default {
  props: ["name", "src"],
};
</script>
