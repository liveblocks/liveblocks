<script lang="ts" setup>
const { avatar, name } = defineProps<{
  avatar: string;
  name: string;
}>();

const IMAGE_SIZE = 48;
</script>

<template>
  <div :data-tooltip="name">
    <img :alt="name" :height="IMAGE_SIZE" :src="avatar" :width="IMAGE_SIZE" />
  </div>
</template>

<style scoped>
div {
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

div:before {
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

div:hover:before {
  opacity: 1;
}

img {
  border-radius: 9999px;
}
</style>
