// Utilidades de interfaz: textos flotantes, vuelos de iconos, avisos, hojas modales.

const nf = new Intl.NumberFormat('es-MX');
export const fmt = (n) => nf.format(Math.round(n));

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function floatText(el, text, variant = '') {
  if (!el) return;
  const { x, y } = centerOf(el);
  const n = document.createElement('div');
  n.className = `float ${variant.split(' ').filter(Boolean).map((v) => `float--${v}`).join(' ')}`;
  n.textContent = text;
  n.style.left = `${x}px`;
  n.style.top = `${y - 10}px`;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 1000);
}

export function flyIcon(from, to, svg) {
  if (!from || !to) return;
  const a = centerOf(from), b = centerOf(to);
  const n = document.createElement('div');
  n.className = 'flyer';
  n.innerHTML = svg;
  n.style.left = `${a.x - 16}px`;
  n.style.top = `${a.y - 16}px`;
  document.body.appendChild(n);
  requestAnimationFrame(() => {
    n.style.transform = `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(.7)`;
    n.style.opacity = '0.2';
  });
  setTimeout(() => n.remove(), 480);
}

// Plato que vuela en arco desde la comanda hasta el cliente.
export function flyPlate(from, to, html, onLand) {
  if (!from || !to) { onLand?.(); return; }
  const a = centerOf(from), b = centerOf(to);
  const n = document.createElement('div');
  n.className = 'plate-fly';
  n.innerHTML = `<span class="plate-fly__dish">${html}</span>`;
  n.style.left = `${a.x}px`;
  n.style.top = `${a.y}px`;
  document.body.appendChild(n);
  const dx = b.x - a.x, dy = b.y - a.y;
  const lift = Math.min(-60, dy - 70);
  const anim = n.animate([
    { transform: 'translate(-50%, -50%) scale(.9) rotate(0deg)', opacity: 1 },
    { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${lift}px)) scale(1.1) rotate(-8deg)`, opacity: 1, offset: 0.5 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.55) rotate(6deg)`, opacity: 0.9 }
  ], { duration: 460, easing: 'cubic-bezier(.4,0,.3,1)' });
  let done = false;
  const land = () => { if (done) return; done = true; n.remove(); onLand?.(); };
  anim.onfinish = land;
  setTimeout(land, 700);
}

let toastBox;
export function toast(message, variant = '') {
  if (!toastBox) {
    toastBox = document.createElement('div');
    toastBox.className = 'toasts';
    toastBox.setAttribute('role', 'status');
    toastBox.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastBox);
  }
  const t = document.createElement('div');
  t.className = `toast ${variant ? `toast--${variant}` : ''}`;
  t.textContent = message;
  toastBox.appendChild(t);
  setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 260); }, 2400);
}

export function openSheet(html, onMount) {
  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet__grab"></div>${html}</div>`;
  const close = () => {
    back.style.animation = 'fade-in .2s ease reverse both';
    back.querySelector('.sheet').style.animation = 'sheet-up .25s ease reverse both';
    setTimeout(() => back.remove(), 230);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(back);
  back.querySelector('button, input')?.focus();
  onMount?.(back.querySelector('.sheet'), close);
  return close;
}

export function countUp(el, to, { from = 0, ms = 1200 } = {}) {
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function confetti(host, colors) {
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.8}s`;
    c.style.animationDuration = `${2 + Math.random() * 1.4}s`;
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(c);
  }
  host.appendChild(box);
  setTimeout(() => box.remove(), 4200);
}
