const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
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
const {
  sourcePath,
  sourcePartSize,
  sourceName,
} = require("../src/lib/source-media.ts");
const { restoreTransfers } = require("../src/lib/source-transfer.ts");
test("camera-card paths and names preserved; traversal rejected", () => {
  assert.equal(
    sourcePath("Day 01/Camera A/CARD_001/PRIVATE"),
    "Day 01/Camera A/CARD_001/PRIVATE",
  );
  for (const path of ["../secret", "Day/../secret", "a//b", "a\\b", "a\0b"])
    assert.throws(() => sourcePath(path));
  assert.equal(
    sourceName("projects/p/source/Day 01/" + "a".repeat(64) + "~A001.R3D"),
    "A001.R3D",
  );
});
test("adaptive chunk sizes support multi-TB originals within 10000 parts", () => {
  for (const size of [1, 105 * 1024 ** 2, 1.5e12, 5e12]) {
    const part = sourcePartSize(size);
    assert.ok(Math.ceil(size / part) <= 10000);
    assert.ok(part >= 5 * 1024 ** 2 && part <= 5 * 1024 ** 3);
  }
  for (const size of [-1, NaN, 5e12 + 1])
    assert.throws(() => sourcePartSize(size));
});
test("reopening pauses unfinished transfers and preserves server session", () => {
  const restored = restoreTransfers(
    JSON.stringify([
      { id: "a", token: "signed", status: "uploading" },
      { id: "b", status: "done" },
      { id: "c", status: "failed" },
    ]),
  );
  assert.equal(restored[0].status, "paused");
  assert.equal(restored[0].token, "signed");
  assert.equal(restored[1].status, "done");
  assert.equal(restored[2].status, "paused");
});
let allow = true,
  user = { id: "user" },
  calls = [];
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
            maybeSingle: async () => ({
              data: allow ? { id: "project" } : null,
            }),
          };
          return q;
        },
        rpc: async () => ({ data: false }),
      }),
    };
  if (name === "@/lib/b2")
    return {
      B2_BUCKET: "test",
      b2: {
        send: async (cmd) => {
          calls.push(cmd);
          return { Contents: [], CommonPrefixes: [] };
        },
      },
    };
  if (name === "@/lib/storage-cleanup")
    return {
      projectPrefix: (id) => `projects/${id}/`,
      storageCleaner: () => ({
        keys: async () => {
          throw new Error("Should not delete");
        },
      }),
    };
  if (name === "@/lib/source-media")
    return require("../src/lib/source-media.ts");
  return load.call(this, name, ...args);
};
const { GET, POST } = require("../src/app/api/projects/[id]/source/route.ts");
Module._load = load;
const params = { params: Promise.resolve({ id: "project" }) };
test("outsiders and anonymous users cannot list or start source uploads", async () => {
  allow = false;
  calls = [];
  assert.equal(
    (await GET({ nextUrl: new URL("https://test/source") }, params)).status,
    403,
  );
  assert.equal(
    (await POST({ json: async () => ({ action: "start" }) }, params)).status,
    403,
  );
  assert.equal(calls.length, 0);
  allow = true;
  user = null;
  assert.equal(
    (await GET({ nextUrl: new URL("https://test/source") }, params)).status,
    403,
  );
  user = { id: "user" };
});
test("listing remains within source namespace and supports pagination", async () => {
  calls = [];
  const r = await GET(
    { nextUrl: new URL("https://test/source?path=Day%2001&cursor=next") },
    params,
  );
  assert.equal(r.status, 200);
  assert.equal(calls[0].input.Prefix, "projects/project/source/Day 01/");
  assert.equal(calls[0].input.ContinuationToken, "next");
});
test("viewers cannot delete source files", async () => {
  assert.equal(
    (
      await POST(
        {
          json: async () => ({
            action: "delete",
            key: "projects/project/source/x",
          }),
        },
        params,
      )
    ).status,
    403,
  );
});

test("reconnection matches only unfinished originals and respects a single selected transfer", () => {
 const {matchingTransfer}=require('../src/lib/source-transfer.ts');
 const jobs=[{id:'done',fingerprint:'same',status:'done'},{id:'paused',fingerprint:'same',status:'paused'},{id:'other',fingerprint:'other',status:'paused'}];
 assert.equal(matchingTransfer(jobs,'same','all').id,'paused');
 assert.equal(matchingTransfer(jobs,'other','paused'),undefined);
 assert.equal(matchingTransfer(jobs,'wrong','all'),undefined);
 assert.equal(matchingTransfer([{id:'done',fingerprint:'same',status:'done'}],'same','all'),undefined);
});
