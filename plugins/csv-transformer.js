import { csvParse, csvStringify } from '../lib/stdlib.js';

export async function install(swat) {
  swat.registerComponent('csv-transformer', (opts) => {
    const div = document.createElement('div');
    const input = document.createElement('textarea');
    const output = document.createElement('pre');
    const btn = document.createElement('button');
    btn.textContent = 'Transform';
    btn.onclick = () => {
      const rows = csvParse(input.value);
      // Simple transform: uppercase first column
      const transformed = rows.map(row => [row[0].toUpperCase(), ...row.slice(1)]);
      output.textContent = csvStringify(transformed);
    };
    div.appendChild(input);
    div.appendChild(btn);
    div.appendChild(output);
    return div;
  });
}