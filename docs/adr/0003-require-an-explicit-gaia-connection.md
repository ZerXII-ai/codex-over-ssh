# Require an explicit Gaia connection

Every Command Run must name its Gaia Connection, and the plugin provides no default connection. The extra argument is intentional: it makes the remote target visible at the execution boundary and prevents a command from silently running against the wrong environment.
