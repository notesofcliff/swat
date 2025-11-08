// main.js - App bootstrap for REST Tester Demo

import { CommandRegistry } from '../../lib/registry.js';
import { Executor } from '../../lib/executor.js';

export default async function(swat) {
  // Load plugin for response formatting
  await swat.loadPluginFromUrl('../plugins/rest-formatter.js');

  // Create registry and executor
  const registry = new CommandRegistry();
  const executor = new Executor(registry, swat.vfs);

  // Register components
  swat.registerComponent('request-builder', createRequestBuilder);
  swat.registerComponent('response-viewer', createResponseViewer);
  swat.registerComponent('history-panel', createHistoryPanel);

  // Define custom elements
  class RequestBuilder extends HTMLElement {
    connectedCallback() {
      const factory = swat.getComponent('request-builder');
      if (factory) {
        this.appendChild(factory());
      }
    }
  }
  customElements.define('request-builder', RequestBuilder);

  class ResponseViewer extends HTMLElement {
    connectedCallback() {
      const factory = swat.getComponent('response-viewer');
      if (factory) {
        this.appendChild(factory());
      }
    }
  }
  customElements.define('response-viewer', ResponseViewer);

  class HistoryPanel extends HTMLElement {
    connectedCallback() {
      const factory = swat.getComponent('history-panel');
      if (factory) {
        this.appendChild(factory());
      }
    }
  }
  customElements.define('history-panel', HistoryPanel);

  // Register commands
  registry.register('send', async ({ args }) => {
    const [method, url, ...bodyParts] = args;
    const body = bodyParts.join(' ');
    swat.eventBus.emit('request:send', { method: method || 'GET', url, body });
    return { stdout: `Sending ${method || 'GET'} request to ${url}\n` };
  });

  registry.register('load-history', async () => {
    try {
      const history = await swat.vfs.read('/rest/history.json');
      swat.eventBus.emit('history:loaded', JSON.parse(history || '[]'));
      return { stdout: 'History loaded\n' };
    } catch (e) {
      swat.eventBus.emit('history:loaded', []);
      return { stdout: 'No history found\n' };
    }
  });

  // Event listeners
  swat.eventBus.on('request:send', async (payload) => {
    const { method, url, body } = payload;
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'GET' ? body : undefined
      });
      const responseText = await response.text();
      const result = {
        method, url, status: response.status, headers: Object.fromEntries(response.headers), body: responseText
      };
      swat.eventBus.emit('response:received', result);
      // Save to history
      let history = [];
      try {
        const data = await swat.vfs.read('/rest/history.json');
        history = JSON.parse(data);
      } catch (e) {
        // File doesn't exist, start with empty array
      }
      history.push(result);
      await swat.vfs.write('/rest/history.json', JSON.stringify(history.slice(-10))); // Keep last 10
    } catch (e) {
      swat.log('error', 'Request failed:', e);
      swat.eventBus.emit('response:error', e.message);
    }
  });

  swat.eventBus.on('response:received', (result) => {
    swat.log('info', `Response: ${result.status} for ${result.method} ${result.url}`);
  });

  // Mount UI
  const root = document.getElementById('root');
  root.className = 'rest-tester';

  const layout = document.createElement('div');
  layout.className = 'd-flex flex-column';

  // Request Builder
  const builder = document.createElement('request-builder');
  builder.className = 'card mb-3';
  layout.appendChild(builder);

  // Response Viewer
  const viewer = document.createElement('response-viewer');
  viewer.className = 'card mb-3';
  layout.appendChild(viewer);

  // History Panel
  const history = document.createElement('history-panel');
  history.className = 'card';
  layout.appendChild(history);

  root.appendChild(layout);

  // Load initial history
  await executor.runLine('load-history');

  // Emit ready
  swat.eventBus.emit('app:ready');
}

// Component factories
function createRequestBuilder() {
  const div = document.createElement('div');
  div.innerHTML = `
    <h3>Request Builder</h3>
    <select class="input mb-2" id="method">
      <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
    </select>
    <input class="input mb-2" id="url" type="url" placeholder="https://api.example.com" value="https://jsonplaceholder.typicode.com/posts/1">
    <textarea class="input mb-2" id="body" placeholder="Request body (for POST/PUT)"></textarea>
    <button class="btn" id="send">Send Request</button>
  `;
  div.querySelector('#send').addEventListener('click', () => {
    const method = div.querySelector('#method').value;
    const url = div.querySelector('#url').value;
    const body = div.querySelector('#body').value;
    window.swat.eventBus.emit('request:send', { method, url, body });
  });
  return div;
}

function createResponseViewer() {
  const div = document.createElement('div');
  div.innerHTML = `
    <h3>Response</h3>
    <pre id="response" class="border p-2 bg-light" style="min-height: 200px;"></pre>
  `;
  window.swat.eventBus.on('response:received', (result) => {
    div.querySelector('#response').textContent = JSON.stringify(result, null, 2);
  });
  window.swat.eventBus.on('response:error', (error) => {
    div.querySelector('#response').textContent = `Error: ${error}`;
  });
  return div;
}

function createHistoryPanel() {
  const div = document.createElement('div');
  div.innerHTML = `
    <h3>History</h3>
    <ul id="history-list"></ul>
  `;
  window.swat.eventBus.on('history:loaded', (history) => {
    const list = div.querySelector('#history-list');
    list.innerHTML = history.map(item => `<li>${item.method} ${item.url} - ${item.status}</li>`).join('');
  });
  return div;
}
