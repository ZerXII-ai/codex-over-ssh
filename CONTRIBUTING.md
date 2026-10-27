# Contributing

Thanks for taking an interest in Gaia Remote Execution. Before making a substantial change, open an issue to discuss the problem and the proposed behavior.

## Development setup

1. Install Node.js 18 or newer.
2. From `gaia-ssh-plugin/`, run `npm install`.
3. Run `npm run check` and `npm test` before opening a pull request.

Do not include real connection configurations, credentials, host keys, or private keys in issues or pull requests. Keep changes focused and update the documentation when user-visible behavior changes.

## Pull requests

Describe the behavior being changed, why it is needed, and the checks you ran. For changes to SSH authentication, host-key verification, command execution, or output handling, include the security implications in the description.
