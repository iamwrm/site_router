"use strict";

const $ = (id) => document.getElementById(id);
const area = $("text");
const pinyin = $("pinyin");
let ready = false;
let composing = false;
let anchor = null;
let inserting = false;
let nativeComposition = false;

function call(name, types = [], args = [], result = "boolean") {
  return Module.ccall(name, result, types, args);
}

function insert(text) {
  area.focus();
  if (anchor) area.setSelectionRange(anchor.start, anchor.end);
  inserting = true;
  // Preserve the browser's native undo stack where insertText is supported.
  try {
    if (!document.execCommand("insertText", false, text)) {
      area.setRangeText(text, area.selectionStart, area.selectionEnd, "end");
    }
  } finally {
    inserting = false;
  }
  anchor = { start: area.selectionStart, end: area.selectionEnd };
}

function update(value) {
  if (value.committed) insert(value.committed);
  composing = value.isComposing;
  $("composition").hidden = !composing;
  $("candidates").replaceChildren();
  if (!composing) { anchor = null; return; }
  $("preedit").textContent = Object.values(value.inputBuffer).join("");
  $("previous").disabled = value.page === 0;
  $("next").disabled = value.isLastPage;
  value.candidates.forEach((candidate, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-current", String(index === value.highlightedIndex));
    const label = document.createElement("small");
    label.textContent = index + 1;
    button.append(label, candidate.text);
    button.onclick = () => { call("select_candidate", ["number"], [index]); area.focus(); };
    $("candidates").append(button);
  });
}

// This callback is invoked synchronously by the standalone Rime WASM runtime.
window.onRimeEvent = (type, value) => { if (type === "input") update(value); };

function cancel() {
  if (composing) call("clear_input", [], [], null);
}

function finish() {
  // Keep unfinished input as literal text when moving the cursor or copying.
  if (composing) call("process_key", ["string"], ["{Return}"]);
}

function process(key) {
  if (!anchor) anchor = { start: area.selectionStart, end: area.selectionEnd };
  const handled = call("process_key", ["string"], [key]);
  if (!composing) anchor = null;
  return handled;
}

const keys = {
  " ": "{space}", Enter: "{Return}", Backspace: "{BackSpace}", Delete: "{Delete}",
  Escape: "{Escape}", ArrowLeft: "{Left}", ArrowRight: "{Right}",
  ArrowUp: "{Up}", ArrowDown: "{Down}", Home: "{Home}", End: "{End}",
  PageUp: "{Page_Up}", PageDown: "{Page_Down}",
};

area.addEventListener("keydown", (event) => {
  if (!ready || !pinyin.checked || event.isComposing || nativeComposition || event.keyCode === 229) return;
  if (event.ctrlKey || event.metaKey || event.altKey) { finish(); return; }
  if (event.key === "Tab") { finish(); return; }
  if (!composing && !/^[a-z]$/i.test(event.key)) return;
  const key = keys[event.key] || (event.key.length === 1 ? event.key : null);
  if (key && process(key)) event.preventDefault();
});

// Mobile keyboards often emit beforeinput without a useful keydown.
area.addEventListener("beforeinput", (event) => {
  if (inserting || nativeComposition || event.isComposing || !ready || !pinyin.checked) return;
  if (!event.cancelable) { finish(); return; }
  if (event.inputType === "deleteContentBackward" && composing) {
    event.preventDefault(); process("{BackSpace}");
  } else if (event.inputType === "insertText" && event.data && /^[a-z '0-9]+$/i.test(event.data)) {
    if (!composing && !/^[a-z]/i.test(event.data)) return;
    event.preventDefault();
    for (const char of event.data) {
      if (!process(char === " " ? "{space}" : char)) { insert(char); anchor = null; }
    }
  } else {
    finish();
  }
});

area.addEventListener("compositionstart", () => { finish(); nativeComposition = true; });
area.addEventListener("compositionend", () => { nativeComposition = false; });
area.addEventListener("pointerdown", finish);
area.addEventListener("paste", finish);
area.addEventListener("cut", finish);
area.addEventListener("drop", finish);
$("composition").addEventListener("mousedown", (event) => event.preventDefault());
$("previous").onclick = () => { call("flip_page", ["boolean"], [true]); area.focus(); };
$("next").onclick = () => { call("flip_page", ["boolean"], [false]); area.focus(); };
pinyin.onchange = () => {
  finish();
  area.readOnly = pinyin.checked && !ready;
  $("status").textContent = pinyin.checked ? (ready ? "" : "正在加载拼音词库…") : "直接输入";
  area.focus();
};
$("clear").onclick = () => {
  cancel();
  area.focus();
  area.select();
  insert("");
  anchor = null;
  $("status").textContent = "";
};
$("copy").onclick = async () => {
  finish();
  try {
    await navigator.clipboard.writeText(area.value);
    $("status").textContent = "已复制";
  } catch {
    area.focus();
    area.select();
    $("status").textContent = document.execCommand("copy") ? "已复制" : "请按 Ctrl+C / ⌘C，或长按选中文字复制。";
  }
};
area.addEventListener("input", () => { $("status").textContent = ""; });

async function load() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  async function bytes(path) {
    const response = await fetch(new URL(path, document.baseURI), { signal: controller.signal });
    if (!response.ok) throw new Error(`Unable to load ${path}: ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  try {
    const files = [
      "build/default.yaml", "build/luna_pinyin.schema.yaml", "build/luna_pinyin.table.bin",
      "build/luna_pinyin.prism.bin", "build/luna_pinyin.reverse.bin",
      "opencc/t2s.json", "opencc/TSCharacters.ocd2", "opencc/TSPhrases.ocd2",
    ];
    const [wasm, data] = await Promise.all([
      bytes("vendor/rime.wasm"),
      Promise.all(files.map(async (file) => [file, await bytes(`vendor/schema/${file}`)])),
    ]);
    await new Promise((resolve, reject) => {
      window.Module = { wasmBinary: wasm, onRuntimeInitialized: resolve, onAbort: reject, print() {}, printErr() {} };
      const script = document.createElement("script");
      script.src = "vendor/rime.js";
      script.onerror = () => reject(new Error("Unable to load the Pinyin engine"));
      controller.signal.addEventListener("abort", () => reject(new Error("Loading timed out")), { once: true });
      document.head.append(script);
    });
    Module.FS.mkdirTree("/rime");
    for (const [file, content] of data) {
      const path = `/usr/share/rime-data/${file}`;
      Module.FS.mkdirTree(path.slice(0, path.lastIndexOf("/")));
      Module.FS.writeFile(path, content);
    }
    if (!call("init") || !call("set_schema", ["string"], ["luna_pinyin"])) throw new Error("Pinyin initialization failed");
    call("set_option", ["string", "number"], ["simplification", 1], null);
    ready = true;
    area.readOnly = false;
    $("status").textContent = "";
  } catch (error) {
    controller.abort();
    console.error(error);
    pinyin.checked = false;
    pinyin.disabled = true;
    area.readOnly = false;
    $("status").textContent = "拼音加载失败，请刷新重试。仍可使用系统输入法输入和复制。";
  } finally {
    clearTimeout(timeout);
  }
}

load();
