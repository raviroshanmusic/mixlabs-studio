export function sourcePath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 700 ||
    /[\\\x00-\x1f]/.test(value)
  )
    throw new Error("Invalid folder path");
  const path = value.replace(/\/$/, "");
  if (
    path &&
    path.split("/").some((p) => !p || p === "." || p === ".." || p.length > 200)
  )
    throw new Error("Invalid folder path");
  return path;
}
export function sourcePartSize(size: number): number {
  if (!Number.isSafeInteger(size) || size < 0 || size > 5_000_000_000_000)
    throw new Error("Files must be between 0 bytes and 5 TB");
  return Math.max(
    100 * 1024 * 1024,
    Math.ceil(size / 9999 / (1024 * 1024)) * 1024 * 1024,
  );
}
export function sourceName(key: string): string {
  return key
    .split("/")
    .pop()!
    .replace(/^(?:[0-9a-f-]{36}|[0-9a-f]{64})~/, "");
}
export function bytes(n: number): string {
  if (!n) return "0 B";
  const i = Math.min(4, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${["B", "KB", "MB", "GB", "TB"][i]}`;
}
