// Keep browser-granted read handles, not copies of the footage, on this device.
export type SourceHandle = {
  kind: "file" | "directory";
  name: string;
  requestPermission(options: { mode: "read" }): Promise<PermissionState>;
};
export type SourceFileHandle = SourceHandle & { getFile(): Promise<File> };
export type SourceDirectoryHandle = SourceHandle & {
  values(): AsyncIterable<SourceFileHandle | SourceDirectoryHandle>;
};
export type SavedSourceAccess = {
  file: SourceFileHandle;
  permission: SourceHandle;
  group: string;
};
export type SourceSelection = {
  file: File;
  relative: string;
  access?: SavedSourceAccess;
};
type Pickers = {
  showDirectoryPicker?: (options: {
    mode: "read";
  }) => Promise<SourceDirectoryHandle>;
  showOpenFilePicker?: (options: {
    multiple: boolean;
  }) => Promise<SourceFileHandle[]>;
};
export function canRememberSource(kind: "folder" | "files") {
  const w = window as unknown as Pickers;
  return !!(kind === "folder" ? w.showDirectoryPicker : w.showOpenFilePicker);
}
export async function chooseSource(
  kind: "folder" | "files",
): Promise<SourceSelection[]> {
  const w = window as unknown as Pickers;
  if (kind === "files") {
    const handles = await w.showOpenFilePicker!({ multiple: true });
    return Promise.all(
      handles.map(async (handle) => ({
        file: await handle.getFile(),
        relative: handle.name,
        access: {
          file: handle,
          permission: handle,
          group: crypto.randomUUID(),
        },
      })),
    );
  }
  const root = await w.showDirectoryPicker!({ mode: "read" });
  const group = crypto.randomUUID();
  const selections: SourceSelection[] = [];
  async function visit(dir: SourceDirectoryHandle, path: string) {
    for await (const item of dir.values()) {
      const relative = path + "/" + item.name;
      if (item.kind === "directory")
        await visit(item as SourceDirectoryHandle, relative);
      else {
        const handle = item as SourceFileHandle;
        selections.push({
          file: await handle.getFile(),
          relative,
          access: { file: handle, permission: root, group },
        });
      }
    }
  }
  await visit(root, root.name);
  return selections;
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("mixlabs-source-access", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("handles");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new Error("Could not remember local file access"));
  });
}
export async function readSourceAccess(
  scope: string,
): Promise<Map<string, SavedSourceAccess>> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction("handles")
        .objectStore("handles")
        .openCursor(IDBKeyRange.bound(scope + ":", scope + ":\uffff"));
      const records = new Map<string, SavedSourceAccess>();
      request.onsuccess = () => {
        const c = request.result;
        if (!c) {
          resolve(records);
          return;
        }
        records.set(String(c.key).slice(scope.length + 1), c.value);
        c.continue();
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function saveSourceAccess(
  scope: string,
  id: string,
  value: SavedSourceAccess | null,
) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("handles", "readwrite");
      const store = tx.objectStore("handles");
      if (value) store.put(value, scope + ":" + id);
      else store.delete(scope + ":" + id);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(new Error("Could not remember local file access"));
    });
  } finally {
    db.close();
  }
}
// Invoke directly during the Resume click, before awaiting any work. Browsers
// require user activation to restore a previously granted folder permission.
export function requestSourcePermissions(access: SavedSourceAccess[]) {
  const groups = new Map(access.map((a) => [a.group, a.permission]));
  return Promise.all(
    [...groups.values()].map((handle) =>
      handle.requestPermission({ mode: "read" }),
    ),
  );
}
