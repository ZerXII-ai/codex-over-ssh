# Gaia Remote Execution

[English](README.md) | [简体中文](README.zh-CN.md)

Gaia Remote Execution is a small Codex MCP project for running commands on explicitly named SSH targets. The repository includes the `gaia-ssh` plugin and the design notes behind its connection and command model.

## What it does

- Lists configured SSH targets without returning credentials.
- Runs one arbitrary shell command on a required named target.
- Verifies the SSH host key against a configured fingerprint or public key.
- Keeps each remote command in its own shell and caps returned output.

## Project layout

- [`gaia-ssh-plugin/`](gaia-ssh-plugin/) — MCP server and Codex plugin.
- [`CONTEXT.md`](CONTEXT.md) — terms and behavior used by the project.
- [`docs/adr/`](docs/adr/) — recorded design decisions.

## Getting started

See the [plugin README](gaia-ssh-plugin/README.md) for installation, configuration, and usage instructions.

## Security

`gaia.run_command` executes arbitrary shell text on the selected remote host. Use it only with SSH accounts and targets you trust, and review every command before running it. Passwords are stored as plaintext in the local credential file at `~/.config/gaia-ssh/connections.json`; that file must remain private and must never be committed. The included connection file is an example with placeholder values only.

The plugin requires an explicit connection name and rejects unknown or changed host identities. These checks reduce the chance of connecting to an unintended server; they do not restrict what an authorized command can do after login.

## Development

```sh
cd gaia-ssh-plugin
npm install
npm run check
npm test
```

See [Contributing](CONTRIBUTING.md) before opening a pull request. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

This project is licensed under the [MIT License](LICENSE).
