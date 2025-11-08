💖 **[Support Development](https://github.com/sponsors/notesofcliff)** - Sponsor on GitHub

# SWAT — Static Web App Toolkit

A zero-build, vanilla JavaScript framework for static web apps. Includes utilities for charts, tables, virtual filesystem, event bus, plugins, and more.

**[🚀 Live Demo](https://notesofcliff.github.io/swat/)** - Try SWAT in your browser

This is the main repository for the SWAT framework. For related projects, see:
- [**swatctl**](https://github.com/notesofcliff/swatctl): A command-line tool for managing SWAT projects.
- [**Word Processor**](https://github.com/notesofcliff/swat-word): An example application built with SWAT which is [live on Github Pages](https://notesofcliff.github.io/swat-word/).

## Development Workflow

The recommended way to start a new SWAT project is by using the [**swatctl**](../swatctl) command-line tool.

1.  **Install `swatctl`**:
    ```bash
    # Clone the swatctl repo and install it in editable mode
    git clone git@github.com:notesofcliff/swatctl.git
    cd swatctl
    pip install -e ".[test]"
    ```

2.  **Create a new project**:
    ```bash
    # This will create a new directory with the basic SWAT project structure
    swatctl create-project my-new-app
    ```

3.  **Set the SWAT version**:
    The `create-project` command will clone the main SWAT repository into your project's `lib` directory. You can update to a specific version using `swatctl`.
    ```bash
    cd my-new-app
    # Update the SWAT library to a specific git tag or branch
    swatctl swat-set-version --tag v0.0.1
    ```

4.  **Run your application**:
    ```bash
    # Navigate to your new project and start a local server
    cd my-new-app
    python -m http.server 8000
    ```
    You can then access your application at `http://localhost:8000/`.

## Manual Quick Start

If you prefer not to use `swatctl`, you can clone this repository and build your application manually.

1. Clone or copy this repo.
2. Serve with any static server: `python -m http.server 8000`
3. Open `http://localhost:8000/apps/demo-terminal/` in your browser to see an example.

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

Link the stylesheet in your HTML:
```html
<link rel="stylesheet" href="/lib/swat-ui.css">
```

## CSS Utilities (`swat-ui.css`)

SWAT includes a basic UI stylesheet with helper classes for layout, components, and theming.

### Theming

The UI supports light and dark modes using CSS variables. To toggle the theme, add the `data-theme="dark"` attribute to the `<html>` or `<body>` tag. A simple theme toggler is provided with the `.theme-toggle` class.

You can override these variables to create your own theme. The available color variables are:

- `--bg-color`: Main background color
- `--text-color`: Main text color
- `--muted-color`: Muted text color
- `--border-color`: Border color for elements
- `--card-bg`: Background color for cards
- `--btn-bg`: Button background color
- `--btn-text`: Button text color
- `--input-bg`: Input field background
- `--input-border`: Input field border
- `--code-bg`: Background for code blocks
- `--stdout-color`: Terminal stdout text color
- `--stderr-color`: Terminal stderr text color

To create a custom theme, define these variables within a CSS selector. For example, to create a "blue" theme:

```css
[data-theme="blue"] {
  --bg-color: #eef4ff;
  --text-color: #001a4d;
  --btn-bg: #2a7fff;
  --btn-text: #ffffff;
  /* ... and so on */
}
```

### Layout
- `.container`: A centered container with a max-width.
- `.row`: A flexbox row.
- `.col`: A flexbox column that takes up equal space.

### Components
- `.card`: A styled container with a background, border, and shadow.
- `.btn`: A styled button.
- `.input`: A styled input field.
- `.code`: For formatting inline code.

### Utilities
- `.muted`: For less prominent text.
- `.stdout`, `.stderr`: For styling terminal output.
- `.danger`: Red background and white text for dangerous/error states.
- `.warn`: Yellow/orange background and black text for warnings.
- `.info`: Blue background and white text for informational content.
- `.success`: Green background and white text for success states.

#### Spacing
- `.m-{0-5}`: Margin all sides (0, 4px, 8px, 16px, 24px, 48px)
- `.p-{0-5}`: Padding all sides
- `.mt-{0-5}`, `.mb-{0-5}`: Margin top/bottom

#### Display & Layout
- `.d-none`, `.d-block`, `.d-inline`, `.d-inline-block`, `.d-flex`: Display utilities
- `.justify-content-{start,center,end,between,around}`: Flexbox justify-content
- `.align-items-{start,center,end}`: Flexbox align-items
- `.flex-{column,row,wrap,nowrap}`: Flexbox direction and wrapping

#### Text
- `.text-{left,center,right}`: Text alignment
- `.text-{uppercase,lowercase,capitalize}`: Text transform
- `.font-weight-{light,normal,bold}`: Font weights

#### Sizing
- `.w-{25,50,75,100}`: Width percentages
- `.h-{25,50,75,100}`: Height percentages

#### Borders
- `.border`, `.border-0`: Border control
- `.border-{top,bottom,left,right}`: Directional borders
- `.border-radius-{0,sm,,lg}`: Border radius

#### Position & Visibility
- `.position-{static,relative,absolute,fixed,sticky}`: Positioning
- `.invisible`: Hide visually but keep in layout
- `.sr-only`: Screen reader only (accessibility)


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
