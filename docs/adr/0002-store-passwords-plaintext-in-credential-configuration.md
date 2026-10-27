# Store passwords plaintext in credential configuration

Password-based Gaia Connections store their passwords without encryption in the Credential Configuration File. This keeps unattended password authentication simple at the explicit cost of local credential exposure; the file must therefore remain private to its owner and outside version control.
