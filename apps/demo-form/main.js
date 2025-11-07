import { SWAT } from '../../lib/swat.js';

const swat = new SWAT();

document.getElementById('save').onclick = async () => {
  const val = document.getElementById('input').value;
  await swat.storage.set('form_data', val);
  document.getElementById('output').textContent = 'Saved: ' + val;
};

(async () => {
  const saved = await swat.storage.get('form_data');
  if (saved) document.getElementById('input').value = saved;
})();