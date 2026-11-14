type Writable = {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
};
type Directory = {
  getDirectoryHandle(
    name: string,
    options: { create: boolean },
  ): Promise<Directory>;
  getFileHandle(
    name: string,
    options: { create: boolean },
  ): Promise<{ createWritable(): Promise<Writable> }>;
};
export async function downloadSourceFolder(
  project: string,
  path: string,
  progress: (message: string) => void,
) {
  const picker = (
    window as unknown as { showDirectoryPicker?: () => Promise<Directory> }
  ).showDirectoryPicker;
  if (!picker)
    throw new Error(
      "Folder downloads require desktop Chrome or Edge. Individual files can be downloaded in any browser.",
    );
  // A new destination avoids overwriting any existing local footage.
  const destination = await picker();
  const root = await destination.getDirectoryHandle(
    `MixLabs Source - ${crypto.randomUUID().slice(0, 8)}`,
    { create: true },
  );
  let cursor: string | null = null,
    count = 0,
    total = 0;
  const used = new Set<string>();
  do {
    const r: Response = await fetch(
      `/api/projects/${project}/source?tree=1&path=${encodeURIComponent(path)}${cursor ? "&cursor=" + encodeURIComponent(cursor) : ""}`,
    );
    const page: {
      files: { key: string; relative: string; size: number }[];
      cursor: string | null;
      error?: string;
    } = await r.json();
    if (!r.ok) throw new Error(page.error || "Could not list folder");
    for (const file of page.files) {
      const pieces = (file.relative as string).split("/");
      let target = root;
      for (const name of pieces.slice(0, -1))
        target = await target.getDirectoryHandle(name, { create: true });
      let name = pieces[pieces.length - 1];
      if (used.has(file.relative))
        name = `${file.key.split("/").pop()!.split("~")[0].slice(0, 8)}-${name}`;
      used.add(file.relative);
      progress(`Downloading ${file.relative} · ${count} files complete`);
      const response = await fetch(
        `/api/media?key=${encodeURIComponent(file.key)}&download=1`,
      );
      if (!response.ok || !response.body)
        throw new Error(`Could not download ${file.relative}`);
      const writable = await (
        await target.getFileHandle(name, { create: true })
      ).createWritable();
      let received = 0;
      try {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          await writable.write(value);
        }
        if (received !== file.size)
          throw new Error(`Incomplete download: ${file.relative}`);
        await writable.close();
      } catch (e) {
        await writable.abort().catch(() => {});
        throw e;
      }
      count++;
      total += received;
    }
    cursor = page.cursor;
  } while (cursor);
  progress(
    `Download complete: ${count} files, ${total.toLocaleString()} bytes verified.`,
  );
}
