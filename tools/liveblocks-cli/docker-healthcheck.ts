const port = process.env.PORT || 1153;
const res = await fetch(`http://localhost:${port}/health`);
if (!res.ok) process.exit(1);
