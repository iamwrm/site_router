# Third-party assets

Only the interface and its JavaScript glue were rewritten. These vendored
engine and dictionary assets are retained from the original site's source at
[commit 68e058ba](https://github.com/iamwrm/web_input/tree/68e058ba4b00732fe32d98c24e878ccdf92b1a34/public).
They are separate from the framework that previously rendered the page.

- **Rime WebAssembly runtime** (`vendor/rime.js`, `vendor/rime.wasm`):
  [CanCLID/rime-react](https://github.com/CanCLID/rime-react), BSD 3-Clause.
  See `vendor/rime-react-LICENSE.txt`. Its standalone exported C API is used
  directly; none of the React interface code is included.
- **librime** (compiled into the runtime):
  [rime/librime](https://github.com/rime/librime), BSD 3-Clause.
  See `vendor/librime-LICENSE.txt`.
- **Luna Pinyin dictionary** (`vendor/schema/build/`):
  [rime/rime-luna-pinyin](https://github.com/rime/rime-luna-pinyin), LGPL 3.0.
  See `vendor/luna-pinyin-LICENSE.txt`. The original site's
  [dictionary source and configuration](https://github.com/iamwrm/web_input/tree/68e058ba4b00732fe32d98c24e878ccdf92b1a34/public/schema)
  are preserved in Git history, including its fuzzy Pinyin rules. The compiled
  files are unchanged.
- **OpenCC conversion data** (`vendor/schema/opencc/`):
  [BYVoid/OpenCC](https://github.com/BYVoid/OpenCC), Apache 2.0.
  See `vendor/opencc-LICENSE.txt`.

Upstream projects contain their respective build instructions and additional
dependency notices. No ownership of these third-party assets is claimed.
