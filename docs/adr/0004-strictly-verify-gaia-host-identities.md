# Strictly verify Gaia host identities

Each Gaia Connection verifies the target SSH host key against an explicitly trusted Host Identity. Unknown hosts and changed host keys are rejected rather than accepted automatically, preserving SSH's protection against connecting to an impersonating server.
