#!/usr/bin/env python3
"""Verify the local deployment without printing or passing credentials in argv."""
import base64
import hashlib
import http.client
from pathlib import Path
import ssl

ROOT = Path('/opt/homebrew/var/lib/caddy/pki/authorities/local/root.crt')
SITES = Path(__file__).resolve().parent / 'sites'
password = (Path.home() / '.config/site-router/admin-password').read_text().strip()
context = ssl.create_default_context(cafile=str(ROOT))

def request(path, credentials=None, https=True, host='localhost'):
    if https:
        conn = http.client.HTTPSConnection(host, 8443, context=context, timeout=10)
    else:
        conn = http.client.HTTPConnection(host, 8080, timeout=10)
    headers = {}
    if credentials is not None:
        headers['Authorization'] = 'Basic ' + base64.b64encode(credentials.encode()).decode()
    conn.request('GET', path, headers=headers)
    response = conn.getresponse()
    result = response.status, dict(response.getheaders()), response.read()
    conn.close()
    return result

time_files = ['index.html', 'style.css', 'app.mjs', 'convert.mjs']
paths = ['/', '/app.js', '/theme.css', '/demo/', '/demo/index.html', '/demo/style.css', '/demo/app.js', '/missing', '/demo', '/.git/config', '/time', '/time/']
paths += ['/time/' + file for file in time_files]
for path in paths:
    for label, credentials in [('anonymous', None), ('incorrect', 'admin:incorrect-test-password')]:
        status, headers, body = request(path, credentials)
        assert status == 401, (path, label, status)
        assert 'Www-Authenticate' in headers or 'WWW-Authenticate' in headers, headers
        print(f'PASS {label:10} {path:20} 401')

served_files = [('/', 'index.html'), ('/app.js', 'app.js'), ('/theme.css', 'theme.css'), ('/demo/', 'demo/index.html'), ('/demo/index.html', 'demo/index.html'), ('/demo/style.css', 'demo/style.css'), ('/demo/app.js', 'demo/app.js'), ('/time/', 'time/index.html')]
served_files += [('/time/' + file, 'time/' + file) for file in time_files]
for path, file in served_files:
    status, headers, body = request(path, 'admin:' + password)
    assert status == 200, (path, status)
    assert body == (SITES / file).read_bytes(), path
    if file.endswith('.mjs'):
        assert headers['Content-Type'].split(';')[0] in ['text/javascript', 'application/javascript'], headers
    print(f'PASS authorized {path:20} 200, exact file match, CA-verified TLS')

status, headers, _ = request('/time', 'admin:' + password)
assert status == 308 and headers['Location'] == '/time/', (status, headers)
print('PASS /time redirects to /time/ after authentication')

for path in ['/', '/app.js', '/theme.css', '/demo/', '/demo/style.css', '/demo/app.js', '/time', '/time/', '/time/app.mjs', '/missing?x=1']:
    status, headers, body = request(path, https=False)
    assert status == 308, (path, status)
    assert headers['Location'] == 'https://localhost:8443' + path, headers
    assert b'fieldnotes' not in body.lower() and b'<!doctype' not in body.lower(), path
    print(f'PASS HTTP {path:20} 308, HTTPS redirect only')

# A directory with no index must never produce a listing.
from tempfile import TemporaryDirectory
with TemporaryDirectory(prefix='verify-no-index-', dir=SITES) as directory:
    Path(directory, 'hidden.txt').write_text('Listing must be disabled.')
    path = '/' + Path(directory).name + '/'
    status, _, _ = request(path, 'admin:' + password)
    assert status == 404, (path, status)
    print('PASS directory browsing disabled, authenticated empty-index directory returns 404')

print('Root CA SHA-256:', hashlib.sha256(ROOT.read_bytes()).hexdigest())
print('All deployment checks passed. No TLS verification bypass used.')
