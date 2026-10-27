const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const DEFAULT_CONFIG_PATH = path.join(os.homedir(), ".config", "gaia-ssh", "connections.json");
class ConfigError extends Error { constructor(message) { super(message); this.name = "ConfigError"; } }
function configPath() { return process.env.GAIA_SSH_CONFIG || DEFAULT_CONFIG_PATH; }
function need(value, field, name) { if (typeof value !== "string" || value.length === 0) throw new ConfigError(`Connection '${name}' requires a non-empty ${field}.`); }
function validate(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ConfigError(`Connection '${name}' must be an object.`);
  need(value.host, "host", name); need(value.user, "user", name); need(value.hostKey, "hostKey", name);
  if (value.port !== undefined && (!Number.isInteger(value.port) || value.port < 1 || value.port > 65535)) throw new ConfigError(`Connection '${name}' has an invalid port.`);
  if (!value.auth || typeof value.auth !== "object" || Array.isArray(value.auth)) throw new ConfigError(`Connection '${name}' requires auth.`);
  if (value.auth.type === "password") need(value.auth.password, "auth.password", name);
  else if (value.auth.type === "privateKey") need(value.auth.privateKeyPath, "auth.privateKeyPath", name);
  else throw new ConfigError(`Connection '${name}' auth.type must be 'password' or 'privateKey'.`);
  return { host: value.host, port: value.port ?? 22, user: value.user, hostKey: value.hostKey, auth: value.auth };
}
function loadConnections(filePath = configPath()) {
  let stat; try { stat = fs.statSync(filePath); } catch (error) { throw new ConfigError(error.code === "ENOENT" ? `Credential configuration file not found: ${filePath}` : `Cannot read credential configuration file: ${error.message}`); }
  if (!stat.isFile()) throw new ConfigError(`Credential configuration path is not a file: ${filePath}`);
  if ((stat.mode & 0o077) !== 0) throw new ConfigError(`Credential configuration file permissions must be 0600: ${filePath}`);
  let data; try { data = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (error) { throw new ConfigError(`Credential configuration file is not valid JSON: ${error.message}`); }
  if (!data || typeof data.connections !== "object" || Array.isArray(data.connections)) throw new ConfigError("Credential configuration must contain a connections object.");
  return Object.fromEntries(Object.entries(data.connections).map(([name, connection]) => { if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(name)) throw new ConfigError(`Connection name '${name}' is invalid.`); return [name, validate(name, connection)]; }));
}
function listConnectionMetadata(connections) { return Object.entries(connections).map(([name, c]) => ({ name, host: c.host, port: c.port, user: c.user, authType: c.auth.type, hostKey: c.hostKey })); }
module.exports = { ConfigError, DEFAULT_CONFIG_PATH, configPath, loadConnections, listConnectionMetadata };
