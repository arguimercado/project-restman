export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Makes a string safe to use as a file name on Windows, macOS and Linux. */
export function toFileName(name: string, fallback: string) {
  const cleaned = name.replace(/[\/:*?"<>|\u0000-\u001f]/g, "-").trim().replace(/^\.+/, "");
  return cleaned.slice(0, 80) || fallback;
}
