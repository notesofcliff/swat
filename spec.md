# SWAT — Static Web App Toolkit — Full specification (vanilla, zero-build)

It includes:

* a **standard library** (CSS + JS utilities) supporting charts (canvas), tables, cards/panels, plugin helpers, and more
* **stable interfaces** for a virtual filesystem (VFS) and storage adapters (localStorage / IndexedDB stub) — pluggable and testable
* a **plugin model** (simple `install(swat)` contract) and optional worker sandbox for safer plugins
* component registry + event bus + component mounting conventions
* a **test page** (browser-run tests) and how to run them
* a **demo app** (terminal) implementing history (up/down), stdin/stdout/stderr capture, file write/read via VFS, and console logging
* additional utilities (CSV import/export, CSV→table, PNG export for charts, simple auth stub)
* guidance for extension, versioning, and CI

Everything below is zero-build: ES modules + plain `.js` and `.css`. Copy the files into a directory structure and serve with any static server (or `python -m http.server`).

---

# 1 — Project layout (recommended)

```
swat/
├── README.md
├── VERSION
├── lib/
│   ├── swat-ui.css            # design system / components CSS
│   ├── swat.js                # core runtime + boot()
│   ├── storage.js             # StorageAdapter (localStorage + idb adapter stub)
│   ├── vfs.js                 # VFS interface + localStorage-based implementation
│   ├── registry.js            # component registry & command registry
│   ├── executor.js            # command pipeline executor (for terminal-like apps)
│   ├── stdlib.js              # eventBus, DOM helpers, fetch wrapper, CSV helpers
│   ├── plugin-sandbox.js      # optional worker sandbox helper (module worker)
│   ├── canvas-charts.js       # canvas-only Line/Bar/Pie charts
│   ├── table-component.js     # sortable table component + csv export
│   └── utils.js               # small shared utilities
├── apps/
│   ├── demo-terminal/
│   │   ├── index.html
│   │   └── main.js
│   ├── demo-dashboard/
│   │   ├── index.html
│   │   └── main.js
│   └── demo-form/
│       ├── index.html
│       └── main.js
├── plugins/
│   ├── example-hello.js
│   └── csv-transformer.js
└── tests/
    └── run.html
```

---

# 2 — API surface (contracts & interfaces)

### 2.1 `SWAT` runtime (core)

A single runtime instance exposes the basic tools apps and plugins use.

```js
// swat.js (exported class)
class SWAT {
  constructor(opts = {}) {
    // .version, .config, .storage, .eventBus, .components, .plugins, .apps
  }
  // Boot an app (called from index.html)
  async boot({ id, root = '#root', entry, title }) { /* loads entry module and calls app default export */ }

  // components
  registerComponent(name, factory)      // factory(opts) => HTMLElement (or object with lifecycle)
  getComponent(name)                    // returns factory

  // plugins
  async loadPluginFromUrl(url)
  async loadPluginFromModule(mod, id)
  async unloadPlugin(id)

  // storage RPC for sandbox (optional)
  async rpcStorageGet(key)
  async rpcStorageSet(key, val)

  // convenience
  log(...args)   // swat-scoped logging w/ levels
}
export function boot(opts) { return (new SWAT(opts)).boot(opts); }
```

### 2.2 `StorageAdapter` (pluggable)

Minimal promise-based API; localStorage adapter provided; you can implement IndexedDB adapter later.

```js
// storage.js
class StorageAdapter {
  constructor(opts = {}) // { prefix: 'swat:' }
  async get(key)         // returns parsed JSON or null
  async set(key, value)  // persist JSON
  async delete(key)
  async list(prefix?)    // return list of keys starting with prefix
}
```

### 2.3 `VFS` (virtual filesystem)

VFS uses StorageAdapter internally. Designed small and consistent with real FS operations.

```js
// vfs.js
class VFS {
  constructor(storage, opts = {}) // pass StorageAdapter
  async read(path)                // returns content string or throw ENOENT
  async write(path, content)      // write string (create/overwrite)
  async delete(path)
  async list(dir = '/')           // returns array of file paths under dir
  async stat(path)                // { size, mtime, type }
  cwd()                           // returns current working directory string
  chdir(path)
  historyPush(command)            // store command history (for terminal)
  dump()                          // full state dump for export/import
  import(state)                   // replace/merge state
}
```

### 2.4 `CommandRegistry` & `Executor` (for terminal and command-style apps)

Commands are tiny async functions with stable signature.

```js
// registry.js
class CommandRegistry {
  register(name, fn)    // fn({ args, stdin, vfs, swat, ctx }) => { stdout: string, stderr?: string, exitCode?: number }
  get(name)
  list()
}
```

Executor: parse pipeline (`|`), redirection (`>`, `>>`), call commands sequentially passing stdin/stdout, write to VFS on redirection. Returns aggregated { stdout, stderr, exitCode }.

---

# 3 — Standard library (CSS + JS)

### 3.1 `lib/swat-ui.css` (small design system)

Provides `.container`, `.card`, `.row`, `.col`, `.btn`, `.input`, `.code`, `.muted`, and helper utilities. Keep minimal and brandable.

Key visual tokens (copy sample from previous messages): color variables, typography, card styles.

### 3.2 `lib/stdlib.js` (JS helpers)

Exports:

* `createEventBus()` — `on(ev, fn)`, `emit(ev, payload)`, `off(ev,fn)`
* `el(tag, attrs, ...children)` — shorthand DOM builder
* `safeFetch(url, opts)` — wrapper returning `{ ok, status, text, json?, error? }`
* `csvParse(text)` and `csvStringify(rows)` — simple CSV helpers
* `downloadBlob(blob, filename)`

### 3.3 `lib/table-component.js`

A zero-dep table component providing:

* sortable columns (click header toggles asc/desc)
* pagination (optional)
* CSV export button
* `component.update(rows)` method to replace data
* returns HTMLElement (container)

### 3.4 `lib/canvas-charts.js`

Canvas-only charts: `LineChart`, `BarChart`, `PieChart` (code from previous reply). Exposes `createChartComponentForSWAT` helper for `swat.registerComponent`. Features:

* responsive resizing
* update method
* hover tooltip and legends
* PNG export helpers
* determinisitic color generation

### 3.5 `lib/plugin-sandbox.js`

Optional helper to run plugin code within a module Worker and provide conservative RPC for storage and event bus. Worker sandbox returns messages only via `postMessage` and cannot access DOM. Use only when you want safe plugin code loading.

---

# 4 — Plug-in model & lifecycle

**Plugin contract** (tiny & explicit)

```js
// plugin module must export one of:
export async function install(swat) { /* register components, event handlers, etc. */ }
// or
export default async function install(swat) { ... }
// optional: export function uninstall(swat) { ... } // best-effort cleanup
```

**Loading plugin**

* `swat.loadPluginFromUrl(url)` – uses `import(url)` and then calls `install(swat)`
* `swat.loadPluginFromModule(mod)` – directly pass module
* `swat.loadPluginFromVFS(path)` – read plugin source string from VFS, optionally spawn sandbox worker and evaluate there with RPC (if you want safe isolation). The simplest form: `eval` or `new Function` is NOT recommended — instead use module workers.

**Capabilities & gating**

* Plugins may declare capabilities in a `meta` object, e.g. `install.meta = { requires: ['network','storage:write'] }` and SWAT can prompt the user or deny installation — simple security model.

**Plugin API utilities available inside install**

* `swat.storage` (StorageAdapter)
* `swat.vfs` (if the app exposes it)
* `swat.eventBus`
* `swat.registerComponent`
* `swat.getComponent`

---

# 5 — Virtual filesystem (VFS) details

**Why VFS?** Many static apps need a workspace (notes, files, configs). VFS gives file semantics, path resolution, and persistence.

**Implementation notes**

* Paths are normalized (`/`, `./`, `../`).
* Files are stored as `{ type: 'text'|'blob', content: string, mtime: number }` in StorageAdapter under keys `vfs:/path`.
* VFS exposes `list(dir)` to enumerate files.
* VFS includes `history` array for terminal/history features.

**Example usage (terminal)**

```js
await vfs.write('/notes/todo.txt', 'buy milk\nfix car\n');
const t = await vfs.read('/notes/todo.txt');
await vfs.delete('/tmp/x');
const files = await vfs.list('/notes');
```

---

# 6 — Component registry & mounting

* `swat.registerComponent(name, factory)` — `factory(opts) => HTMLElement`
* `swat.getComponent(name)` — returns factory
* Apps mount components by calling `root.appendChild(swat.getComponent('table')({...}))`

**Component conventions**

* Components are responsible for their DOM lifecycle; if they expose `.destroy()` or `.update()` attach them to the returned element (e.g., `el._chart = chart`).
* Keep components pure where possible (update via provided `.update()`).

---

# 7 — Terminal demo (required features)

### Terminal app features

* Input line with command history (Up/Down)
* `stdin` for piped input: For interactive commands (limit to simulated stdin via `|` pipes)
* `stdout` / `stderr` separation; rendered with different CSS classes (`.stdout`, `.stderr`)
* Console logging: SWAT intercepts `swat.log` and also optionally shows `console.log` output inside terminal or in a connected console panel
* History stored in VFS (`vfs.historyPush(cmd)`)
* Commands registration via `CommandRegistry` and `Executor` with pipeline & redirection
* Special built-ins: `cd`, `pwd`, `write`, `read`, `history`, `export-state`, `import-state`, `help`, `clear`
* `curl`-like `fetch` command using `safeFetch` (subject to CORS)

### Terminal UX details

* Prompt shows `user@swat:cwd$`
* Input supports Tab completion (commands and files)
* Up/Down arrow moves through stored history (persisted across reloads via VFS)
* `stderr` lines rendered in red or muted style
* `stdout` lines default color
* Provide keyboard shortcuts: `Ctrl+L` clear, `Ctrl+K` clear line, `Ctrl+C` cancel current command (if long running; set a cancellation token)

### Terminal sample command API

A command function signature:

```js
async function myCmd({ args, stdin, vfs, swat, ctx }) {
  // do work
  return { stdout: '...', stderr: '...', exitCode: 0 };
}
```

`Executor` handles calling commands in pipeline order, piping `stdout` to next `stdin`.

---

# 8 — Test runner (browser test page)

Create `tests/run.html` which imports the core modules and runs basic assertions. The tests validate:

* StorageAdapter basic set/get/delete/list
* VFS read/write/list/stat and historyPush/dump/import
* CommandRegistry register/get/list
* Executor pipeline `echo hello | grep h`
* Terminal history up/down works (simulate key events)
* Chart components can mount and update without error
* Table component can sort and export CSV

The test page should expose results in DOM (PASS/FAIL lines), so CI can load the page and check DOM content.

Example tests (inside `tests/run.html`):

```html
<script type="module">
import { StorageAdapter } from '/lib/storage.js';
import { VFS } from '/lib/vfs.js';
import { CommandRegistry } from '/lib/registry.js';
import { Executor } from '/lib/executor.js';
import { LineChart } from '/lib/canvas-charts.js';
const out = [];
function ok(c, msg){ out.push((c ? 'PASS' : 'FAIL') + ' ' + msg); }
const s = new StorageAdapter({ prefix: 'test:' });
await s.set('k', { a:1 });
const got = await s.get('k');
ok(got && got.a === 1, 'storage set/get');
...
document.body.textContent = out.join('\n');
</script>
```

---

# 9 — Demo: Terminal app files (index.html + main.js)

Below are the **essential** demo files. Paste them into `apps/demo-terminal/`.

### `apps/demo-terminal/index.html`

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>SWAT — Terminal demo</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <link rel="stylesheet" href="../../lib/swat-ui.css">
  <style>
    #term { height:60vh; overflow:auto; padding:12px; white-space:pre-wrap; background: #00121a; border-radius:8px; }
    .stdout { color: #cfe6ff; }
    .stderr { color: #ffb3b3; }
    .prompt { display:flex; gap:8px; align-items:center; margin-top:8px; }
    input#cmd { width:100%; padding:8px; background:transparent; border:1px solid rgba(255,255,255,0.04); color:inherit; }
  </style>
</head>
<body class="container">
  <div class="card">
    <h3 class="h1">Terminal Demo</h3>
    <div id="term"></div>
    <div class="prompt">
      <div class="muted" id="cwd">/</div>
      <input id="cmd" autocomplete="off" />
    </div>
  </div>
  <script type="module" src="./main.js"></script>
</body>
</html>
```

### `apps/demo-terminal/main.js` (simplified but complete)

> This file depends on the libs in `/lib/`. It wires SWAT boot, VFS, registry, executor, and registers a set of demo commands.

```js
import { boot } from '../../lib/swat.js';        // optional: if you want to use boot style. Alternatively instantiate SWAT directly.
import { StorageAdapter } from '../../lib/storage.js';
import { VFS } from '../../lib/vfs.js';
import { CommandRegistry } from '../../lib/registry.js';
import { Executor } from '../../lib/executor.js';
import { createEventBus, el, safeFetch } from '../../lib/stdlib.js';

// For demo we instantiate small runtime pieces directly (no full SWAT boot required)
const storage = new StorageAdapter({ prefix: 'demo_term:' });
const vfs = new VFS(storage);
const registry = new CommandRegistry();
const executor = new Executor(registry, vfs);

const term = document.getElementById('term');
const input = document.getElementById('cmd');
const cwdEl = document.getElementById('cwd');

function println(s='', cls='stdout'){ const d = document.createElement('div'); d.className = cls; d.textContent = s; term.appendChild(d); term.scrollTop = term.scrollHeight; }
function renderCwd(){ cwdEl.textContent = vfs.cwd(); }

// Basic commands
registry.register('echo', async ({ args }) => ({ stdout: args.join(' ') + '\n' }));
registry.register('pwd', async ({ args, vfs }) => ({ stdout: vfs.cwd() + '\n' }));
registry.register('write', async ({ args, vfs }) => {
  const path = args[0]; const content = args.slice(1).join(' ');
  await vfs.write(path, content); return { stdout: `Wrote ${path}\n` };
});
registry.register('cat', async ({ args, vfs }) => {
  try { const txt = await vfs.read(args[0]); return { stdout: txt }; } catch(e) { return { stderr: `cat: ${args[0]}: No such file\n`, exitCode: 1 }; }
});
registry.register('ls', async ({ args, vfs }) => {
  const dir = args[0] || '/';
  const list = await vfs.list(dir); return { stdout: list.join('\n') + (list.length?'\n':'') };
});
registry.register('history', async ({ args, vfs }) => ({ stdout: (vfs.state.history || []).join('\n') + '\n' }));
registry.register('curl', async ({ args }) => {
  const url = args[0]; if (!url) return { stderr: 'curl: missing url\n' };
  const r = await safeFetch(url, { timeout: 8000 });
  if (!r.ok) return { stderr: `curl: failed: ${r.error||r.status}\n` };
  return { stdout: r.text };
});

// convenience builtins in main.js
function shellSplit(s){
  // copy a small shellSplit from earlier message. (assume available globally)
  const out=[]; let cur='', qi=null, esc=false;
  for (let i=0;i<s.length;i++){ const ch = s[i]; if (esc){ cur+=ch; esc=false; continue; } if (ch==='\\'){ esc=true; continue; } if (qi){ if (ch===qi) qi=null; else cur+=ch; } else { if (ch==='"'||ch==="'"){ qi=ch; } else if (/\s/.test(ch)){ if (cur!==''){ out.push(cur); cur=''; } } else cur+=ch; } }
  if (cur!=='') out.push(cur); return out;
}

// Input handling + history navigation
let historyIndex = -1;
input.addEventListener('keydown', async (ev) => {
  if (ev.key === 'Enter') {
    const line = input.value.trim(); input.value='';
    if (!line) { println(''); return; }
    println(`$ ${line}`, 'muted');
    vfs.historyPush(line);
    historyIndex = -1;
    // simple builtins
    if (line.startsWith('cd ')) { vfs.chdir(line.slice(3).trim()||'/'); renderCwd(); return; }
    if (line === 'clear') { term.innerHTML=''; return; }
    // execute
    const res = await executor.runLine(line);
    if (res.stderr) println(res.stderr.trim(), 'stderr');
    if (res.stdout) println(res.stdout.trim(), 'stdout');
    renderCwd();
    return;
  } else if (ev.key === 'ArrowUp') {
    const h = vfs.state.history || [];
    if (!h.length) return;
    if (historyIndex === -1) historyIndex = h.length - 1;
    else historyIndex = Math.max(0, historyIndex - 1);
    input.value = h[historyIndex] || '';
    ev.preventDefault();
  } else if (ev.key === 'ArrowDown') {
    const h = vfs.state.history || [];
    if (!h.length) return;
    if (historyIndex === -1) return;
    historyIndex = Math.min(h.length - 1, historyIndex + 1);
    if (historyIndex === h.length - 1) input.value = '';
    else input.value = h[historyIndex] || '';
    ev.preventDefault();
  }
});

// mount initial sample files & UI
(async function bootstrap(){
  if (!Object.keys(vfs.state.files || {}).length) {
    await vfs.write('/hello.txt', 'Hello from SWAT terminal\nLine two\nLine three\n');
    await vfs.write('/notes/todo.txt', 'buy milk\ncall mom\n');
    println('Welcome to SWAT Terminal demo. Try: echo hi | grep h', 'muted');
  } else {
    println('(state loaded)', 'muted');
  }
  renderCwd();
})();
```

This demo includes `stdout` / `stderr` styling and uses `vfs.historyPush()` to persist history.

---

# 10 — Essential utilities (recommended)

* `csvParse()` / `csvStringify()` (in `stdlib.js`) — small RFC-lite CSV helpers
* `downloadBlob()` helper
* `importFromFile(inputEl, cb)` — promise wrapper to read file input and parse JSON/CSV
* `debounce(fn, ms)` and `throttle(fn, ms)` — utilities for responsive UI
* `formatBytes()` and `formatDate()` — for file listings
* `authStub()` — tiny pattern for apps needing auth state in localStorage
* `i18n` stub (basic string map) if you later want to localize

---

# 11 — Tests & CI

**Tests**

* `tests/run.html` runs synchronous/promises tests in browser, writes PASS/FAIL to body.
* Keep tests small and deterministic: StorageAdapter, VFS, CommandRegistry, Executor, Charts and Table mounting.

**CI idea (optional, lightweight)**

* GitHub Actions job:

  1. Serve the site (simple `python -m http.server 8000`).
  2. Use `playwright` or `puppeteer` to load `http://localhost:8000/tests/run.html`.
  3. Assert the page contains `PASS` strings and exit accordingly.
* This keeps zero-build lifestyle while enabling automated tests.

---

# 12 — Extension patterns & workflows

**1. Creating a new app**

* Add `apps/your-app/index.html` and `main.js`.
* In `index.html`: import `/lib/swat-ui.css` then `script type="module" src="./main.js">`.
* In `main.js` default export `async function(swat) { ... }` if you plan to use `boot()`; otherwise require only needed modules.

**2. Adding a plugin**

* Implement `plugins/myplugin.js` with `export async function install(swat) { ... }`.
* Load via `swat.loadPluginFromUrl('/plugins/myplugin.js')` or have app call `import('/plugins/myplugin.js').then(m=>m.install(swat))`.

**3. Sharing components**

* Put shared components in `lib/` (e.g., `lib/table-component.js`, `lib/canvas-charts.js`).
* Apps import them directly: `import { createChartComponentForSWAT } from '/lib/canvas-charts.js'; swat.registerComponent('line', createChartComponentForSWAT(LineChart));`

**4. Replacing storage**

* Implement `IndexedDBAdapter` with same `StorageAdapter` methods and pass to SWAT or VFS constructor.

---

# 13 — Example test cases you should include in `tests/run.html`

* storage: set/get/delete/list
* vfs: write/read/list/dump/import
* command registry/executor: `echo hi | awk '{print $1}'` or `echo one\ntwo | grep two`
* terminal history: push two commands, simulate ArrowUp/ArrowDown and assert input value (this test requires simulating keyboard events)
* chart: create `LineChart` in a temporary container, call `update`, call `toDataURL()`
* table: create table component, sort by a column, verify first row changed
* plugin: import `plugins/example-hello.js`, call `install`, check `swat.getComponent('hello-widget')` exists

---

# 14 — Versioning, distribution & lightweight publish

* Add `VERSION` file and update on changes (SemVer).
* Publish repo on GitHub. For CDN import of specific versions, use jsDelivr raw gh urls:
  `https://cdn.jsdelivr.net/gh/<user>/<repo>@vX.Y.Z/lib/swat.js` — keeps zero-build consumption possible.
* For teams, maintain `lib/` as the shared canonical code and add `CHANGELOG.md` for breaking changes.

---

# 15 — Example minimal `tests/run.html` (complete ready-to-copy)

```html
<!doctype html><meta charset="utf-8"><title>SWAT Tests</title>
<pre id="out"></pre>
<script type="module">
import { StorageAdapter } from '/lib/storage.js';
import { VFS } from '/lib/vfs.js';
import { CommandRegistry } from '/lib/registry.js';
import { Executor } from '/lib/executor.js';
import { LineChart } from '/lib/canvas-charts.js';
import tableFactory from '/lib/table-component.js';

const out = [];
function ok(cond,msg){ out.push((cond?'PASS':'FAIL')+' '+msg); }

async function run(){
  try {
    const s = new StorageAdapter({ prefix: 'tst:' });
    await s.set('k1', { a: 1 }); const g = await s.get('k1'); ok(g && g.a===1, 'storage set/get');
    await s.delete('k1'); ok((await s.get('k1'))===null, 'storage delete');

    const vfs = new VFS(s);
    await vfs.write('/a.txt','one\ntwo\n');
    const t = await vfs.read('/a.txt');
    ok(t.includes('two'), 'vfs read/write');
    const hist = vfs.state.history || [];
    vfs.historyPush('echo hi'); ok(vfs.state.history.includes('echo hi'), 'vfs history push');

    const registry = new CommandRegistry();
    registry.register('echo', async ({args}) => ({ stdout: args.join(' ') + '\\n' }));
    const ex = new Executor(registry, vfs);
    const r = await ex.runLine('echo hello');
    ok(r.stdout.trim() === 'hello', 'executor echo');

    // chart (mount offscreen)
    const off = document.createElement('div'); document.body.appendChild(off);
    const chart = new LineChart(off, { labels:['a','b'], datasets:[{label:'S',data:[1,2]}] }, {});
    chart.update({ labels:['a','b','c'], datasets:[{label:'S',data:[1,2,3]}] });
    const img = chart.toDataURL();
    ok(img && img.startsWith('data:image/png'), 'chart toDataURL');

    // table
    const tableFactoryMod = tableFactory; // if default export
    const table = tableFactoryMod({ columns:[{key:'id',label:'ID'},{key:'n',label:'Name'}], rows:[{id:1,n:'a'},{id:2,n:'b'}] });
    document.body.appendChild(table);
    ok(true, 'table mounted');

    // basic plugin load test (optional)
    try {
      const p = await import('/plugins/example-hello.js');
      await p.install({ registerComponent: ()=>{} });
      ok(true, 'plugin imported');
    } catch(e){
      ok(false, 'plugin import failed: ' + e.message);
    }
  } catch (e){
    out.push('EXCEPTION ' + e.stack);
  } finally {
    document.getElementById('out').textContent = out.join('\\n');
  }
}
run();
</script>
```

---

# 16 — Possible Next Steps

I can now:

1. Produce a ready-to-copy **repo zip text**: every file contents for `lib/*`, `apps/demo-terminal/*`, `tests/run.html`. (You can paste into files.)
2. Produce an optional **worker-sanbox RPC spec + example** (for plugin isolation).
3. Convert `storage.js` to a **real IndexedDB adapter** (still zero-build).
4. Add more polished features to the charts (smoothing, animation) or table (in-place editing, filtering).
