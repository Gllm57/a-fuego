// Entrenador del tutorial: oscurece la pantalla, ilumina un elemento con un foco
// y muestra una tarjeta con la explicación. Sigue al elemento si se mueve.
//   const c = new Coach(document.body);
//   c.show({ target: el, title, text, button: 'Siguiente', onButton, step: 2, total: 9 });

import { icon } from './art.js';

const PAD = 8;

export class Coach {
  constructor(host, { block = false } = {}) {
    this.el = document.createElement('div');
    this.el.className = `coach ${block ? 'coach--block' : ''}`;
    this.el.innerHTML = `<div class="coach__hole"><span class="coach__hand" aria-hidden="true">${icon('hand')}</span></div><div class="coach__card" role="dialog" aria-live="polite"></div>`;
    this.hole = this.el.querySelector('.coach__hole');
    this.card = this.el.querySelector('.coach__card');
    host.appendChild(this.el);
    this.target = null;
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // target: un elemento, una función que lo devuelve, o nada (tarjeta al centro).
  show({ target = null, title = '', text = '', button = null, onButton = null, step = null, total = null, skip = null, hand = false }) {
    this.target = target;
    this.hand = hand;
    this.card.classList.remove('is-in'); void this.card.offsetWidth; this.card.classList.add('is-in');
    this.card.innerHTML = `
      ${step != null ? `<div class="coach__step">Paso ${step} de ${total}</div>` : ''}
      ${title ? `<h3>${title}</h3>` : ''}
      <p>${text}</p>
      ${button || skip ? `<div class="coach__actions">
        ${skip ? `<button class="btn btn--ghost btn--sm" data-coach="skip">${skip.label}</button>` : ''}
        ${button ? `<button class="btn btn--gold btn--sm" data-coach="next">${button}</button>` : ''}
      </div>` : ''}`;
    this.card.querySelector('[data-coach="next"]')?.addEventListener('click', (e) => { e.stopPropagation(); onButton?.(); });
    this.card.querySelector('[data-coach="skip"]')?.addEventListener('click', (e) => { e.stopPropagation(); skip.onClick(); });
    this.el.classList.toggle('has-hand', !!hand);
    this.last = '';
    this.place();
  }

  resolve() {
    const t = typeof this.target === 'function' ? this.target() : this.target;
    return t?.isConnected ? t : null;
  }

  place() {
    const el = this.resolve();
    const vw = innerWidth, vh = innerHeight;
    let r = el?.getBoundingClientRect();
    if (r && (r.width === 0 || r.bottom < 0 || r.top > vh)) r = null;
    const sig = r ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}` : 'none';
    if (sig === this.last) return;
    this.last = sig;
    if (r) {
      const radius = Math.min(28, Math.min(r.width, r.height) / 2 + PAD);
      Object.assign(this.hole.style, {
        left: `${r.left - PAD}px`, top: `${r.top - PAD}px`, width: `${r.width + PAD * 2}px`, height: `${r.height + PAD * 2}px`, borderRadius: `${radius}px`, opacity: 1
      });
    } else {
      Object.assign(this.hole.style, { left: `${vw / 2}px`, top: `${vh / 2}px`, width: '0px', height: '0px', opacity: 1 });
    }
    // La tarjeta va del lado con más espacio.
    const card = this.card;
    const ch = card.offsetHeight;
    let top;
    if (!r) top = (vh - ch) / 2;
    else if (r.top + r.height / 2 > vh / 2) top = Math.max(12, r.top - PAD - 14 - ch);
    else top = Math.min(vh - ch - 12, r.bottom + PAD + 14);
    card.style.top = `${Math.round(top)}px`;
    card.dataset.side = !r ? 'center' : top < r.top ? 'above' : 'below';
    if (r) {
      const x = Math.min(Math.max(r.left + r.width / 2, 40), vw - 40);
      card.style.setProperty('--arrow-x', `${Math.round(x - card.getBoundingClientRect().left)}px`);
    }
  }

  loop() {
    this.place();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.el.classList.add('is-out');
    setTimeout(() => this.el.remove(), 250);
  }
}
