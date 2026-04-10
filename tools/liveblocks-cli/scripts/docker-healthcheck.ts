const port = process.env.LIVEBLOCKS_DEVSERVER_PORT || 1153;
const res = await fetch(`http://localhost:${port}/health`);
if (!res.ok) process.exit(1);
