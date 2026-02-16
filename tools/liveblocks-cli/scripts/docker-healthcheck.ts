const res = await fetch("http://localhost:1153/health");
if (!res.ok) process.exit(1);
