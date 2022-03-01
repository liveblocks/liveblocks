<script>
  export let picture = ''
  export let name = ''

  const IMAGE_SIZE = 48
</script>

<div class="avatar" data-tooltip={name}>
  <img
    alt=""
    src={picture}
    height={IMAGE_SIZE}
    width={IMAGE_SIZE}
    class="avatar_picture"
  />
</div>

<style>
  .avatar {
    border-width: 4px;
    border-radius: 9999px;
    border-color: white;
    background-color: #9ca3af;
    min-width: 56px;
    width: 56px;
    height: 56px;
    margin-left: -0.75rem;
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

  .avatar_picture {
    border-radius: 9999px;
  }
</style>
