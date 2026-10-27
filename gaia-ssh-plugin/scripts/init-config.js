const fs = require("node:fs");
const path = require("node:path");
const { DEFAULT_CONFIG_PATH } = require("../server/config");
if (fs.existsSync(DEFAULT_CONFIG_PATH)) { console.error(`Refusing to overwrite existing configuration: ${DEFAULT_CONFIG_PATH}`); process.exit(1); }
fs.mkdirSync(path.dirname(DEFAULT_CONFIG_PATH), { recursive: true, mode: 0o700 });
fs.copyFileSync(path.join(__dirname, "..", "connections.example.json"), DEFAULT_CONFIG_PATH, fs.constants.COPYFILE_EXCL);
fs.chmodSync(DEFAULT_CONFIG_PATH, 0o600);
console.log(`Created ${DEFAULT_CONFIG_PATH} with mode 0600.`);
