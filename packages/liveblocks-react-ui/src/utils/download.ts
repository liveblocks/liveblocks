export function download(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
