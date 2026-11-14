const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript");
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
const { api } = require("../src/lib/source-transfer.ts");
test("temporary network failure retries the same session action without losing identity", async () => {
  let calls = [];
  global.fetch = async (_, options) => {
    calls.push(JSON.parse(options.body));
    if (calls.length === 1) throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify({ parts: [{ PartNumber: 1 }] }));
  };
  assert.deepEqual(
    await api("project", { action: "status", token: "existing" }),
    { parts: [{ PartNumber: 1 }] },
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
});
test("HTML gateway errors retry instead of reporting JSON parse failures", async () => {
  let n = 0;
  global.fetch = async () =>
    ++n === 1
      ? new Response("<html>Unavailable</html>", { status: 502 })
      : new Response(JSON.stringify({ complete: true }));
  assert.equal(
    (await api("project", { action: "complete", token: "existing" })).complete,
    true,
  );
  assert.equal(n, 2);
});
test("permanent validation failures and expired access are not retried", async () => {
  let n = 0;
  global.fetch = async () => {
    n++;
    return new Response(JSON.stringify({ error: "Invalid part number" }), {
      status: 400,
    });
  };
  await assert.rejects(api("project", { action: "sign" }), /Invalid part/);
  assert.equal(n, 1);
  global.fetch = async () => new Response("{}", { status: 401 });
  await assert.rejects(api("project", { action: "status" }), /Sign in again/);
});
test("pausing during retry stops immediately and makes no new requests", async () => {
  let n = 0;
  const controller = new AbortController();
  global.fetch = async () => {
    n++;
    setTimeout(() => controller.abort(), 10);
    throw new TypeError("offline");
  };
  await assert.rejects(
    api("project", { action: "status" }, controller.signal),
    { name: "AbortError" },
  );
  assert.equal(n, 1);
});
