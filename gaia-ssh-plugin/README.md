# Gaia SSH

Gaia SSH provides two Codex MCP tools for explicitly named SSH targets:

- `gaia.list_connections` lists target metadata without credentials.
- `gaia.run_command` runs one arbitrary shell command on the selected target.

Each command gets an isolated remote shell. An authenticated SSH transport may be reused for up to 60 seconds, but shell state is never shared between commands.

## Requirements

- Node.js 18 or newer.
- SSH access to each target you configure.
- The target's SSH host key, verified out of band before you add it.

## Install and configure

```sh
npm install
npm run init-config
```

The setup command creates `~/.config/gaia-ssh/connections.json` with file mode `0600` and refuses to overwrite an existing file. Edit that file and replace the example values with your own. The config supports password or private-key authentication. Passwords are stored as plaintext, so protect the file and keep it out of version control.

Every connection must include a trusted `hostKey`: either the server's complete OpenSSH public key or a `SHA256:...` fingerprint. Unknown and changed host identities are rejected.

The bundled [`.mcp.json`](.mcp.json) uses `${PLUGIN_ROOT}` when Codex loads this directory as a plugin. For a standalone MCP setup, copy its `gaia-ssh` server entry into your Codex MCP configuration and replace `${PLUGIN_ROOT}` with the absolute path to this directory.

## Use

Call `gaia.list_connections` to see configured target names and non-secret connection details. Then call `gaia.run_command` with a connection name and command, for example:

```json
{
  "connection": "gaia-dev",
  "command": "hostname && uptime"
}
```

`timeout_seconds` defaults to 300 and can be set from 1 to 3600. `max_output_bytes` defaults to 8192 bytes per output stream and can be raised to 65536 bytes. Output is retained from the end of each stream; truncation and omitted leading content are reported explicitly. A timed-out command cannot be resumed through this tool.

## Security

`gaia.run_command` accepts arbitrary shell commands. It can modify or delete data, install software, or change services on the selected remote host, with the permissions of the configured remote user. Use it only with trusted targets and credentials, and review each command before running it.

The required connection name makes the target explicit. Strict host-key verification helps prevent connecting to an impersonating server. Neither measure restricts what an authorized remote command can do.

Never commit `~/.config/gaia-ssh/connections.json`, private keys, or real credentials. The checked-in `connections.example.json` contains placeholders only.

## Development

```sh
npm run check
npm test
```
