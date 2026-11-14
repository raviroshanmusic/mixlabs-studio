// Opt-in disposable Backblaze integration test. Never uses an existing project.
const fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    f,
  );
const project = crypto.randomUUID(),
  user = { id: crypto.randomUUID() };
const load = Module._load;
Module._load = function (name, ...args) {
  if (name === "@/lib/supabase/server")
    return {
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user } }) },
        from() {
          const q = {
            select() {
              return q;
            },
            eq() {
              return q;
            },
            maybeSingle: async () => ({ data: { id: project } }),
          };
          return q;
        },
      }),
    };
  if (name.startsWith("@/lib/"))
    return require("../src/lib/" + name.slice(6) + ".ts");
  return load.call(this, name, ...args);
};
const { POST } = require("../src/app/api/projects/[id]/source/route.ts");
const { storageCleaner } = require("../src/lib/storage-cleanup.ts");
const { runTransfer } = require("../src/lib/source-transfer.ts");
Module._load = load;
const remoteFetch = global.fetch;
let uploaded = 0;
async function call(body) {
  const r = await POST(
    { json: async () => body },
    { params: Promise.resolve({ id: project }) },
  );
  const j = await r.json();
  if (!r.ok) throw new Error(j.error);
  return j;
}
global.fetch = async (url, options) =>
  typeof url === "string" && url.startsWith("/api/projects/")
    ? new Response(JSON.stringify(await call(JSON.parse(options.body))))
    : remoteFetch(url, options);
global.XMLHttpRequest = class {
  constructor() {
    this.upload = {};
    this.controller = new AbortController();
  }
  open(method, url) {
    this.url = url;
  }
  abort() {
    this.controller.abort();
    this.onabort?.();
  }
  async send(blob) {
    uploaded++;
    try {
      const r = await remoteFetch(this.url, {
        method: "PUT",
        body: blob,
        signal: this.controller.signal,
      });
      this.status = r.status;
      this.upload.onprogress?.({ loaded: blob.size });
      this.onload();
    } catch (e) {
      this.onerror();
    }
  }
};
(async () => {
  try {
    const size = 105 * 1024 * 1024,
      hash = crypto
        .createHash("sha256")
        .update("disposable-media-fixture")
        .digest("hex");
    const body = {
      action: "start",
      transferId: crypto.randomUUID(),
      name: "test-camera-card.bin",
      path: "Day 01/Camera A/CARD_001",
      size,
      fingerprint: hash,
    };
    const start = await call(body);
    assert.equal(
      (await call(body)).token,
      start.token,
      "starting again must recover the same multipart upload",
    );
    const signed = await call({
      action: "sign",
      token: start.token,
      number: 1,
    });
    const r = await remoteFetch(signed.url, {
      method: "PUT",
      body: Buffer.alloc(start.partSize),
    });
    assert.ok(r.ok, "first chunk upload");
    let state = await call({ action: "status", token: start.token });
    assert.equal(state.parts.length, 1);
    assert.equal(state.parts[0].Size, start.partSize);
    let saved;
    const job = {
      ...body,
      id: body.transferId,
      token: start.token,
      partSize: start.partSize,
    };
    const file = new File([Buffer.alloc(size)], body.name);
    await runTransfer(
      project,
      job,
      file,
      new AbortController().signal,
      async (patch) => {
        saved = patch;
      },
      () => {},
    );
    assert.equal(uploaded, 1, "resume uploads only the missing second chunk");
    state = await call({ action: "status", token: start.token });
    assert.equal(state.complete, true);
    assert.equal(
      (await call({ action: "complete", token: start.token })).complete,
      true,
      "completion is idempotent",
    );
    const pending = await call({
      ...body,
      transferId: crypto.randomUUID(),
      name: "cancel-me.bin",
    });
    const p = await call({ action: "sign", token: pending.token, number: 1 });
    assert.ok(
      (
        await remoteFetch(p.url, {
          method: "PUT",
          body: Buffer.alloc(5 * 1024 * 1024),
        })
      ).ok,
    );
    await call({ action: "cancel", token: pending.token });
    await assert.rejects(() =>
      call({ action: "status", token: pending.token }),
    );
    console.log(
      "PASS: real B2 multipart resume, missing-chunk-only transfer, size verification, idempotent completion, and cancellation.",
    );
  } finally {
    await storageCleaner().project(project);
    console.log("Disposable test project storage fully cleaned.");
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
