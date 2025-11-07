# SWAT — Static Web App Toolkit

A zero-build, vanilla JavaScript framework for static web apps. Includes utilities for charts, tables, virtual filesystem, plugins, and more.

## Quick Start

1. Clone or copy this repo.
2. Serve with any static server: `python -m http.server 8000`
3. Open `http://localhost:8000/apps/demo-terminal/` in your browser.

## Project Structure

- `lib/`: Core library files (JS modules and CSS)
- `apps/`: Example apps (terminal, dashboard, form)
- `plugins/`: Extensible plugins
- `tests/`: Browser-based test runner

## Usage

Import modules as ES modules:

```js
import { boot } from '/lib/swat.js';
import { StorageAdapter } from '/lib/storage.js';
// etc.
```

## Standard Library

SWAT provides a set of utility functions in `lib/stdlib.js` for common web app tasks:

- **`createEventBus()`**: Creates an event bus for pub/sub messaging.
  ```js
  const bus = createEventBus();
  bus.on('event', (data) => console.log(data));
  bus.emit('event', { msg: 'Hello' });
  ```

- **`el(tag, attrs, ...children)`**: Shorthand for creating DOM elements.
  ```js
  const div = el('div', { class: 'card' }, 'Hello World');
  ```

- **`safeFetch(url, opts)`**: Wrapper for fetch with error handling.
  ```js
  const res = await safeFetch('https://api.example.com/data');
  if (res.ok) console.log(res.json);
  ```

- **`csvParse(text)` / `csvStringify(rows)`**: Simple CSV parsing/stringifying.
  ```js
  const rows = csvParse('name,value\nA,1\nB,2');
  const csv = csvStringify(rows);
  ```

- **`downloadBlob(blob, filename)`**: Downloads a blob as a file.
  ```js
  const blob = new Blob(['Hello'], { type: 'text/plain' });
  downloadBlob(blob, 'hello.txt');
  ```

## Utilities

Additional helpers in `lib/utils.js`:

- **`debounce(fn, ms)`**: Delays function execution until after delay.
  ```js
  const debounced = debounce(() => console.log('Called'), 300);
  ```

- **`throttle(fn, ms)`**: Limits function calls to once per interval.
  ```js
  const throttled = throttle(() => console.log('Called'), 1000);
  ```

- **`formatBytes(bytes)`**: Formats bytes to human-readable.
  ```js
  console.log(formatBytes(1024)); // "1.00 KB"
  ```

- **`formatDate(ts)`**: Formats timestamp to locale string.
  ```js
  console.log(formatDate(Date.now()));
  ```

- **`authStub()`**: Client-side auth state management in localStorage (for static apps; not for server-side auth enforcement).
  ```js
  const auth = authStub();
  auth.login('token123');
  console.log(auth.getToken()); // 'token123'
  console.log(auth.isLoggedIn()); // true
  ```

- **`i18n`**: Basic string map for internationalization (stub).
  ```js
  console.log(i18n.t('hello')); // 'hello'
  ```

## Core Classes

- **`SWAT`**: Main runtime class for managing apps, components, plugins, and storage.
  - **Usage**: Instantiate and boot an app.
    ```js
    const swat = new SWAT();
    await swat.boot({ id: 'myapp', root: '#app', entry: '/apps/myapp/main.js' });
    swat.registerComponent('mychart', factory);
    ```
  - **API**: `boot(opts)`, `registerComponent(name, factory)`, `loadPluginFromUrl(url)`, `storage` (StorageAdapter), `eventBus`.

- **`StorageAdapter`**: Pluggable storage interface (localStorage by default).
  - **Usage**: Persist JSON data.
    ```js
    const storage = new StorageAdapter();
    await storage.set('key', { data: 'value' });
    const val = await storage.get('key');
    ```
  - **API**: `get(key)`, `set(key, value)`, `delete(key)`, `list(prefix)`.

- **`VFS`**: Virtual filesystem for file-like operations with persistence.
  - **Usage**: Simulate file system.
    ```js
    const vfs = new VFS(storage);
    await vfs.write('/file.txt', 'content');
    const content = await vfs.read('/file.txt');
    ```
  - **API**: `read(path)`, `write(path, content)`, `list(dir)`, `stat(path)`, `cwd()`, `chdir(path)`, `historyPush(cmd)`.

- **`CommandRegistry` / `Executor`**: For building terminal-like interfaces with commands and pipelines.
  - **Usage**: Register and execute commands.
    ```js
    const registry = new CommandRegistry();
    registry.register('echo', async ({ args }) => ({ stdout: args.join(' ') }));
    const executor = new Executor(registry, vfs);
    const result = await executor.runLine('echo hello');
    ```
  - **API**: Registry: `register(name, fn)`, `get(name)`. Executor: `runLine(line)`.

- **`LineChart` / `BarChart` / `PieChart`**: Canvas-based chart components.
  - **Usage**: Render charts in a container.
    ```js
    const chart = new LineChart(container, { labels: ['A'], datasets: [{ data: [1] }] });
    chart.update(newData);
    const png = chart.toDataURL();
    ```
  - **API**: Constructor(container, data, opts), `update(data)`, `toDataURL()`.

- **`createTable`**: Function to create a sortable table component.
  - **Usage**: Display tabular data.
    ```js
    const table = createTable({ columns: [{ key: 'name', label: 'Name' }], rows: [{ name: 'A' }] });
    container.appendChild(table);
    table.update(newRows);
    ```
  - **API**: Returns HTMLElement with `.update(rows)` method.

## Extension

- Add new apps in `apps/`
- Create plugins in `plugins/` with `export async function install(swat)`
- Extend components via `swat.registerComponent`

## Versioning

Follows SemVer. Current: 0.0.1