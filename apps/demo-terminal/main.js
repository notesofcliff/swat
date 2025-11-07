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
registry.register('echo', async ({ args }) => {
  if (args.includes('--help') || args.includes('-h')) {
    return { stdout: 'echo: print arguments to stdout\nUsage: echo [options] [args...]\nOptions:\n  --help, -h  Show this help\n' };
  }
  return { stdout: args.join(' ') + '\n' };
});
registry.register('pwd', async ({ args, vfs }) => {
  if (args.includes('--help') || args.includes('-h')) {
    return { stdout: 'pwd: print working directory\nUsage: pwd [options]\nOptions:\n  --help, -h  Show this help\n' };
  }
  return { stdout: vfs.cwd() + '\n' };
});
registry.register('write', async ({ args, vfs }) => {
  if (args.includes('--help') || args.includes('-h')) {
    return { stdout: 'write: write content to file\nUsage: write [options] <path> <content>\nOptions:\n  --help, -h  Show this help\n' };
  }
  const path = args[0]; const content = args.slice(1).join(' ');
  await vfs.write(path, content); return { stdout: `Wrote ${path}\n` };
});
registry.register('cat', async ({ args, stdin, vfs }) => {
  if (args.includes('--help') || args.includes('-h')) {
    return { stdout: 'cat: concatenate files or stdin\nUsage: cat [options] [file]\nOptions:\n  --help, -h  Show this help\n' };
  }
  if (args.length === 0) {
    return { stdout: stdin };
  }
  try { const txt = await vfs.read(args[0]); return { stdout: txt }; } catch(e) { return { stderr: `cat: ${args[0]}: No such file\n`, exitCode: 1 }; }
});
registry.register('ls', async ({ args, vfs }) => {
  if (args.includes('--help') || args.includes('-h')) {
    return { stdout: 'ls: list directory contents\nUsage: ls [options] [dir]\nOptions:\n  --help, -h  Show this help\n' };
  }
  const dir = args[0] || '/';
  const list = await vfs.list(dir); return { stdout: list.join('\n') + (list.length?'\n':'') };
});
registry.register('history', async ({ args, vfs }) => {
  if (args.includes('--help') || args.includes('-h')) {
    return { stdout: 'history: show command history\nUsage: history [options]\nOptions:\n  --help, -h  Show this help\n' };
  }
  return { stdout: (vfs.state.history || []).join('\n') + '\n' };
});
registry.register('curl', async ({ args }) => {
  if (args.includes('--help') || args.includes('-h')) {
    return { stdout: 'curl: fetch URL content\nUsage: curl [options] <url>\nOptions:\n  --help, -h  Show this help\n' };
  }
  const url = args[0]; if (!url) return { stderr: 'curl: missing url\n' };
  const r = await safeFetch(url, { timeout: 8000 });
  if (!r.ok) return { stderr: `curl: failed: ${r.error||r.status}\n` };
  return { stdout: r.text };
});
registry.register('grep', async ({ args, stdin }) => {
  if (args.includes('--help') || args.includes('-h')) {
    return { stdout: 'grep: search for pattern in input\nUsage: grep [options] <pattern>\nOptions:\n  --help, -h  Show this help\n' };
  }
  const pattern = args[0];
  if (!pattern) return { stderr: 'grep: missing pattern\n' };
  const lines = stdin.split('\n').filter(l => l.trim());
  const matches = lines.filter(line => line.includes(pattern));
  return { stdout: matches.join('\n') + (matches.length ? '\n' : '') };
});
registry.register('help', async ({ args, registry }) => {
  if (args.includes('--help') || args.includes('-h')) {
    return { stdout: 'help: show available commands\nUsage: help [options] [command]\nOptions:\n  --help, -h  Show this help\n' };
  }
  const cmds = registry.list();
  return { stdout: 'Available commands:\n' + cmds.join('\n') + '\nUse <command> --help for details.\n' };
});

// convenience builtins in main.js
function shellSplit(s){
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
    if (res.stderr) console.error(res.stderr.trim());
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