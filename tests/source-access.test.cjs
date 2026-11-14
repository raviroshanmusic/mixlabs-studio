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
const {
  chooseSource,
  canRememberSource,
  requestSourcePermissions,
} = require("../src/lib/source-access.ts");
test("remembered folder selection retains original nested paths and read-only root access", async () => {
  const file = {
    kind: "file",
    name: "A001.R3D",
    getFile: async () => ({ name: "A001.R3D" }),
  };
  const inner = {
    kind: "directory",
    name: "Camera A",
    async *values() {
      yield file;
    },
  };
  const root = {
    kind: "directory",
    name: "Day 1",
    async *values() {
      yield inner;
    },
  };
  global.window = {
    showDirectoryPicker: async (options) => {
      assert.deepEqual(options, { mode: "read" });
      return root;
    },
  };
  assert.equal(canRememberSource("folder"), true);
  const files = await chooseSource("folder");
  assert.equal(files.length, 1);
  assert.equal(files[0].relative, "Day 1/Camera A/A001.R3D");
  assert.equal(files[0].access.file, file);
  assert.equal(files[0].access.permission, root);
});
test("resume requests one read permission per remembered folder immediately during the click", async () => {
  let calls = 0;
  const permission = {
    requestPermission(options) {
      calls++;
      assert.deepEqual(options, { mode: "read" });
      return Promise.resolve("granted");
    },
  };
  const promise = requestSourcePermissions([
    { group: "same-folder", permission },
    { group: "same-folder", permission },
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(await promise, ["granted"]);
});
test("revoked read permission is returned rather than silently bypassed", async () => {
  assert.deepEqual(
    await requestSourcePermissions([
      {
        group: "root",
        permission: { requestPermission: async () => "denied" },
      },
    ]),
    ["denied"],
  );
});
test("unsupported browsers can retain the ordinary file-selector fallback", () => {
  global.window = {};
  assert.equal(canRememberSource("folder"), false);
  assert.equal(canRememberSource("files"), false);
});
