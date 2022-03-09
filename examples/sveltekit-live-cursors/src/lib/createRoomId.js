export function createRoomId () {
  let id = new URLSearchParams(window.location.search).get("room");
  if (!id) {
    id = randomId();
    window.location.search = `?room=${id}`;
  }
  return id;
}

function randomId () {
  return "xxxxxxxxxxxxxxxxxxxxx".replace(/[x]/g, () => {
    return (Math.random() * 16 | 0).toString(16);
  });
}
