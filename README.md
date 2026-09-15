# Private local sites

Static websites served by Caddy with private HTTPS and Basic Authentication on every HTTPS path. No directory browsing, database, or external services.

- Homepage: https://localhost:8443/
- Demo: https://localhost:8443/demo/
- Time converter: https://localhost:8443/time/
- Username: `admin`

Listeners are loopback-only. HTTP on port `8080` redirects to HTTPS. No DNS changes needed for localhost.

## Local testing

Install Caddy, then run from your checkout:

```sh
./run.sh
```

Enter a password when prompted. The script hashes it, validates the config, and starts Caddy. It saves no password. Ctrl-C stops it.

For a background process on macOS:

```sh
export SITE_ADMIN_PASSWORD_HASH="$(caddy hash-password)"
./run.sh > /tmp/site-router.log 2>&1 &
disown
```

Alternatively, start interactively, press Ctrl-Z, then run `bg` and `disown`. Stop any existing server using the same ports first.

`SITE_ROOT` defaults to `./sites`, resolved from the repo directory. `SITE_ADMIN_PASSWORD_HASH` must contain a hash, never plaintext. `./run.sh --validate` checks the config without starting a server.

## Linux VPS

Install Caddy using its supported package for your distribution. Run it through the packaged **systemd service** as the unprivileged `caddy` user, not through a background shell.

- Install `Caddyfile` at `/etc/caddy/Caddyfile` and website files under `/srv/sites`.
- Set the service working directory to `/srv`, so `./sites` resolves correctly.
- Supply `SITE_ADMIN_PASSWORD_HASH` through a root-owned, mode `600` environment file, referenced by the service's `EnvironmentFile` setting. Generate the hash with `caddy hash-password`; never commit credentials.
- Give Caddy read access to website files and directory traversal permission.
- Preserve the package's Caddy data directory across restarts and upgrades.
- Validate with the same environment and working directory before starting or reloading. Enable startup with `sudo systemctl enable --now caddy`; inspect health with `systemctl status caddy` and `journalctl -u caddy`.

The checked-in configuration stays on localhost ports `8080` and `8443`. For internal-network access, explicitly configure the intended hostname and private bind address, internal DNS, and narrowly scoped firewall access. Do not bind publicly by default.

## Trust HTTPS

Caddy uses `tls internal`. Import its public `pki/authorities/local/root.crt` from the Caddy data directory into your computer's trusted certificate authorities. Never copy or expose CA private keys.

For this Mac's local data directory:

```sh
security add-trusted-cert -r trustRoot \
  -k "$HOME/Library/Keychains/login.keychain-db" \
  /opt/homebrew/var/lib/caddy/pki/authorities/local/root.crt
```

Firefox may require a separate certificate import. `XDG_DATA_HOME` can override the data location; on macOS, `run.sh` defaults to Homebrew's `var/lib` when available. Keep this directory persistent.

## Add a site

Create `sites/example/index.html` with relative assets, then visit `/example/`. On the VPS, use `/srv/sites/example/index.html`. No routing changes, extra ports, or reload needed. Edit `sites/index.html` to add a homepage link. Keep secrets and symlinks to private files outside the web root.

## Time converter

`/time/` converts ISO 8601 dates with explicit timezones and Unix timestamps in seconds or milliseconds. Includes UTC and local output, copy buttons, and current-time capture. All conversion runs in the browser with millisecond precision.

Run conversion tests with `node --test tests/time.test.mjs`. Node is only needed for tests, not serving the site.

## Change credentials and verify

For local testing, generate a new hash and restart `run.sh`. For systemd, update the private environment file and validate before restarting the service; a reload does not refresh its environment.

`verify.py` checks authentication failures, authorized file contents, HTTP redirects, disabled directory browsing, and CA-verified TLS. It currently reads the original Mac deployment's password at `~/.config/site-router/admin-password` and CA under `/opt/homebrew/var/lib/caddy`; adjust these for another deployment.

`rotate-password.py` also targets the original Mac installation. It is not a systemd provisioning or credential-management script.
