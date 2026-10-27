# Reuse SSH transport but isolate command state

Each Command Run opens an independent remote shell and carries no state from prior runs, while compatible runs may reuse a short-lived authenticated SSH Transport Session for lower latency. This preserves predictable command behavior without paying full SSH setup cost for every short command.
