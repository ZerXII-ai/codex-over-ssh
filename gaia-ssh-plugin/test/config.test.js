const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { ConfigError, loadConnections, listConnectionMetadata } = require("../server/config");
function makeConfig(value, mode = 0o600) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gaia-ssh-test-")); const file = path.join(dir, "connections.json"); fs.writeFileSync(file, JSON.stringify(value)); fs.chmodSync(file, mode); return file; }
test("loads password and private-key connections without exposing credentials in metadata", () => {
  const file = makeConfig({ connections: { password: { host: "host-a", user: "alice", auth: { type: "password", password: "secret" }, hostKey: "SHA256:abc" }, key: { host: "host-b", user: "bob", auth: { type: "privateKey", privateKeyPath: "/tmp/key" }, hostKey: "ssh-ed25519 AAAA" } } });
  const metadata = listConnectionMetadata(loadConnections(file)); assert.equal(metadata.length, 2); assert.equal(JSON.stringify(metadata).includes("secret"), false); assert.equal(metadata[0].port, 22);
});
test("rejects credential files readable by other users", () => { assert.throws(() => loadConnections(makeConfig({ connections: {} }, 0o644)), ConfigError); });
