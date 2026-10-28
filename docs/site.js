// The demo and the page theme. The palette code is the extension's own file (palette.js, copied by tools/build_site.py).
import {paletteFrom, contrast} from './palette.js';

const WALLPAPERS = [
  {id: 'mist', name: 'Mist', src: 'media/wp-mist.jpg'},
  {id: 'dusk', name: 'Dusk', src: 'media/wp-dusk.jpg'},
  {id: 'night', name: 'Night', src: 'media/wp-night.jpg'},
  {id: 'forest', name: 'Forest', src: 'media/wp-forest.jpg'},
];
const root = document.documentElement;
const desk = document.getElementById('desk');
const pick = document.getElementById('pick');
const read = document.getElementById('read');

// a thumbnail as flat pixel lists: the whole picture, the band under the bar, the patch under the big clock
function sample(img) {
  const W = 48, H = 30, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const pixels = [], top = [], clock = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, p = [d[i], d[i + 1], d[i + 2]];
    pixels.push(p);
    if (y < Math.max(2, Math.round(H * 0.1))) top.push(p);
    if (y >= H * 0.03 && y < H * 0.24 && x >= W * 0.03 && x < W * 0.28) clock.push(p);
  }
  return paletteFrom(pixels, top, clock.length ? clock : top);
}

const alpha = (hex, a) => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return `rgba(${r},${g},${b},${a})`; };

function apply(p) {
  const set = (k, v) => root.style.setProperty(k, v);
  set('--surface', p.ink); set('--text', p.paper); set('--muted', p.muted); set('--track', p.track); set('--line', p.hover);
  set('--card', p.card); set('--accent', p.accent.text); set('--accent-bg', p.accent.bg);
  set('--bar-text', p.bar.text); set('--bar-muted', p.bar.muted); set('--bar-veil', p.bar.veil ? alpha(p.bar.veilColor, p.bar.veil) : 'transparent');
  set('--clock-text', p.clock.text); set('--clock-muted', p.clock.muted); set('--clock-shadow', p.clock.shadow);
  document.querySelector('meta[name="theme-color"]').content = p.ink;
  const ratio = (a, b) => contrast(a, b).toFixed(1) + ' : 1';
  const chip = (label, value, sw) => `<div class="chip">${label}<b>${sw ? `<i style="background:${sw}"></i>` : ''}${value}</b></div>`;
  read.innerHTML = [
    chip('Mode', p.dark ? 'Dark' : 'Light'),
    chip('Hue', `${p.hue}°`),
    chip('Card', p.ink, p.ink),
    chip(`Text, ${ratio(p.paper, p.ink)}`, p.paper, p.paper),
    chip(`Accent, ${ratio(p.accent.text, p.ink)}`, p.accent.text, p.accent.text),
    chip('Start-up colour', p.average, p.average),
  ].join('');
  document.querySelector('[data-mode]').textContent = p.dark ? 'On' : 'Off';
}

function useImage(src, button) {
  const img = new Image();
  img.onload = () => {
    desk.style.backgroundImage = `url("${src}")`;
    apply(sample(img));
    pick.querySelectorAll('button.wp').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  };
  img.src = src;
}

for (const w of WALLPAPERS) {
  const b = document.createElement('button');
  b.className = 'wp'; b.type = 'button'; b.title = w.name; b.setAttribute('aria-label', `${w.name} wallpaper`); b.setAttribute('aria-pressed', 'false');
  b.style.backgroundImage = `url("${w.src}")`;
  b.addEventListener('click', () => useImage(w.src, b));
  pick.append(b);
}
const label = document.createElement('label');
label.className = 'up';
label.innerHTML = '<span>Use your own picture</span><input type="file" accept="image/*">';
label.querySelector('input').addEventListener('change', e => {
  const f = e.target.files?.[0];
  if (f) useImage(URL.createObjectURL(f), null);
});
pick.append(label);
useImage(WALLPAPERS[1].src, pick.querySelectorAll('button.wp')[1]);   // dusk first: the warm one shows the idea best

// the clock on the demo desktop is real
const tick = () => {
  const now = new Date();
  const hm = now.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
  document.querySelectorAll('[data-clock]').forEach(n => n.textContent = hm);
  document.querySelector('[data-date]').textContent = now.toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long'});
};
tick(); setInterval(tick, 20000);

// copy buttons on the code blocks
document.querySelectorAll('pre [data-copy]').forEach(btn => btn.addEventListener('click', async () => {
  const text = btn.parentElement.innerText.replace(/^Copy\n?/, '').replace(/\s+#.*$/gm, '').trim();
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; } catch { btn.textContent = 'Select and copy'; }
  setTimeout(() => (btn.textContent = 'Copy'), 1600);
}));
