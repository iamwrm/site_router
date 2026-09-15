#!/usr/bin/env python3
"""Generate a new admin password, validate the config, and reload Caddy."""
import os
from pathlib import Path
import re
import secrets
import subprocess
import tempfile

config = Path('/opt/homebrew/etc/Caddyfile')
secret_file = Path.home() / '.config/site-router/admin-password'
env = dict(os.environ, HOME='/opt/homebrew/var/lib', XDG_DATA_HOME='/opt/homebrew/var/lib')
password = secrets.token_urlsafe(32)
hashed = subprocess.run(['caddy', 'hash-password', '--algorithm', 'bcrypt'],
                        input=password + '\n', text=True, capture_output=True, check=True).stdout.strip()
original = config.read_text()
updated, count = re.subn(r'(?m)^(\s*admin )[\$][^\s]+$', lambda m: m[1] + hashed, original)
if count != 1:
    raise SystemExit('Expected exactly one admin password hash. No files changed.')

with tempfile.TemporaryDirectory(prefix='caddy-rotate-', dir=secret_file.parent) as temporary:
    candidate = Path(temporary) / 'Caddyfile'
    candidate.write_text(updated)
    candidate.chmod(0o600)
    subprocess.run(['caddy', 'validate', '--config', str(candidate), '--adapter', 'caddyfile'], env=env, check=True)
    old_secret = secret_file.read_bytes()
    try:
        config.write_text(updated)
        secret_file.write_text(password + '\n')
        secret_file.chmod(0o600)
        subprocess.run(['caddy', 'reload', '--config', str(config)], env=env, check=True)
    except Exception:
        config.write_text(original)
        secret_file.write_bytes(old_secret)
        subprocess.run(['caddy', 'reload', '--config', str(config)], env=env, check=True)
        raise
print('Password rotated. Retrieve it from ~/.config/site-router/admin-password.')
