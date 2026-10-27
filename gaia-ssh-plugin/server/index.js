const crypto = require("node:crypto");
const fs = require("node:fs");
const { Client } = require("ssh2");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { ConfigError, loadConnections, listConnectionMetadata } = require("./config");

const DEFAULT_TIMEOUT_SECONDS = 300;
const MAX_TIMEOUT_SECONDS = 3600;
const DEFAULT_OUTPUT_BYTES = 8 * 1024;
const MAX_OUTPUT_BYTES = 64 * 1024;
const IDLE_CONNECTION_MS = 60_000;
const pool = new Map();

const asResult = (value) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
function failed(status, message) { return { status, exitCode: null, stdout: "", stderr: message, truncated: { stdout: false, stderr: false }, omitted: { stdout: null, stderr: null } }; }
function boundedTail(limit) {
  let chunks = [], bytes = 0, truncated = false;
  return { add(chunk) { const data = Buffer.from(chunk); chunks.push(data); bytes += data.length; while (bytes > limit) { const excess = bytes - limit, first = chunks[0]; if (first.length <= excess) { chunks.shift(); bytes -= first.length; } else { chunks[0] = first.subarray(excess); bytes -= excess; } truncated = true; } }, value: () => Buffer.concat(chunks).toString("utf8"), get truncated() { return truncated; } };
}
function hostVerifier(expected) {
  return (actual) => {
    try {
      const key = Buffer.from(actual);
      if (expected.startsWith("SHA256:")) {
        const actualFingerprint = `SHA256:${crypto.createHash("sha256").update(key).digest("base64").replace(/=+$/, "")}`;
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actualFingerprint));
      }
      const parts = expected.trim().split(/\s+/);
      if (parts.length < 2 || !parts[0].startsWith("ssh-") || !/^[A-Za-z0-9+/]+={0,2}$/.test(parts[1])) return false;
      const expectedKey = Buffer.from(parts[1], "base64");
      return expectedKey.length === key.length && crypto.timingSafeEqual(expectedKey, key);
    } catch { return false; }
  };
}
function signature(connection) { return JSON.stringify(connection); }
function release(name, entry) { clearTimeout(entry.idleTimer); if (pool.get(name) === entry) pool.delete(name); entry.client.end(); }
function touch(name, entry) { clearTimeout(entry.idleTimer); entry.idleTimer = setTimeout(() => release(name, entry), IDLE_CONNECTION_MS); entry.idleTimer.unref(); }
function classify(error, hostFailed) { if (hostFailed || /host key/i.test(error.message || "")) return "host_identity_error"; if (/authentication|auth fail|all configured authentication methods/i.test(error.message || "")) return "authentication_error"; return "connection_error"; }
function open(name, connection, timeoutMs) {
  const existing = pool.get(name), key = signature(connection);
  if (existing && existing.key === key && existing.ready) { touch(name, existing); return Promise.resolve(existing); }
  if (existing) release(name, existing);
  const client = new Client(), entry = { client, key, ready: false, idleTimer: null }; let hostFailed = false; pool.set(name, entry);
  return new Promise((resolve, reject) => {
    client.once("error", (error) => { if (!entry.ready) { if (pool.get(name) === entry) pool.delete(name); reject(Object.assign(error, { gaiaStatus: classify(error, hostFailed) })); } });
    client.once("ready", () => { entry.ready = true; client.on("error", () => release(name, entry)); touch(name, entry); resolve(entry); });
    try {
      const options = { host: connection.host, port: connection.port, username: connection.user, readyTimeout: Math.min(timeoutMs, 15_000), hostVerifier(actual) { const valid = hostVerifier(connection.hostKey)(actual); if (!valid) hostFailed = true; return valid; } };
      if (connection.auth.type === "password") options.password = connection.auth.password;
      else options.privateKey = fs.readFileSync(connection.auth.privateKeyPath);
      client.connect(options);
    } catch (error) { if (pool.get(name) === entry) pool.delete(name); reject(Object.assign(error, { gaiaStatus: error instanceof ConfigError ? "config_error" : "connection_error" })); }
  });
}
function run(name, connection, command, timeoutSeconds, outputLimit) {
  return open(name, connection, timeoutSeconds * 1000).then((entry) => new Promise((resolve) => {
    const stdout = boundedTail(outputLimit), stderr = boundedTail(outputLimit); let channel, done = false, timedOut = false;
    const finish = (status, exitCode) => { if (done) return; done = true; clearTimeout(timer); touch(name, entry); resolve({ status, exitCode: Number.isInteger(exitCode) ? exitCode : null, stdout: stdout.value(), stderr: stderr.value(), truncated: { stdout: stdout.truncated, stderr: stderr.truncated }, omitted: { stdout: stdout.truncated ? "head" : null, stderr: stderr.truncated ? "head" : null } }); };
    const timer = setTimeout(() => { timedOut = true; if (channel) channel.close(); entry.client.end(); pool.delete(name); finish("timeout", null); }, timeoutSeconds * 1000);
    entry.client.exec(command, (error, stream) => { if (error) { stderr.add(`Unable to start remote command: ${error.message}`); finish("execution_error", null); return; } channel = stream; stream.on("data", (chunk) => stdout.add(chunk)); stream.stderr.on("data", (chunk) => stderr.add(chunk)); stream.on("close", (code) => { if (!timedOut) finish(code === 0 ? "completed" : "command_failed", code); }); stream.on("error", (error) => { stderr.add(`Remote command stream error: ${error.message}`); finish("execution_error", null); }); });
  })).catch((error) => failed(error.gaiaStatus || "connection_error", error.message));
}
function parse(args) {
  if (!args || typeof args.connection !== "string" || !args.connection) throw new ConfigError("connection is required.");
  if (typeof args.command !== "string" || !args.command) throw new ConfigError("command is required.");
  const timeoutSeconds = args.timeout_seconds ?? DEFAULT_TIMEOUT_SECONDS, outputLimit = args.max_output_bytes ?? DEFAULT_OUTPUT_BYTES;
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > MAX_TIMEOUT_SECONDS) throw new ConfigError(`timeout_seconds must be an integer from 1 to ${MAX_TIMEOUT_SECONDS}.`);
  if (!Number.isInteger(outputLimit) || outputLimit < 1 || outputLimit > MAX_OUTPUT_BYTES) throw new ConfigError(`max_output_bytes must be an integer from 1 to ${MAX_OUTPUT_BYTES}.`);
  return { connection: args.connection, command: args.command, timeoutSeconds, outputLimit };
}
const server = new Server({ name: "gaia-ssh", version: "0.1.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
  { name: "gaia.list_connections", description: "List configured Gaia SSH targets without credentials.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "gaia.run_command", description: "Run one arbitrary shell command on a required, named Gaia SSH target. Each call has an isolated remote shell.", inputSchema: { type: "object", properties: { connection: { type: "string" }, command: { type: "string" }, timeout_seconds: { type: "integer", minimum: 1, maximum: MAX_TIMEOUT_SECONDS, default: DEFAULT_TIMEOUT_SECONDS }, max_output_bytes: { type: "integer", minimum: 1, maximum: MAX_OUTPUT_BYTES, default: DEFAULT_OUTPUT_BYTES } }, required: ["connection", "command"], additionalProperties: false } },
] }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "gaia.list_connections") { try { return asResult({ connections: listConnectionMetadata(loadConnections()) }); } catch (error) { return asResult({ status: error instanceof ConfigError ? "config_error" : "execution_error", message: error.message }); } }
  if (request.params.name === "gaia.run_command") { try { const args = parse(request.params.arguments); const connection = loadConnections()[args.connection]; if (!connection) return asResult(failed("config_error", `Unknown connection '${args.connection}'.`)); return asResult(await run(args.connection, connection, args.command, args.timeoutSeconds, args.outputLimit)); } catch (error) { return asResult(failed(error instanceof ConfigError ? "config_error" : "execution_error", error.message)); } }
  return asResult({ status: "execution_error", message: `Unknown tool '${request.params.name}'.` });
});
server.connect(new StdioServerTransport());
