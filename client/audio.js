// Efectos de sonido, música de fondo sintetizada (WebAudio) y vibración. Sin archivos de audio.

const prefs = loadPrefs();
let ctx = null;

function loadPrefs() {
  try { return { sound: true, music: true, haptics: true, ...JSON.parse(localStorage.getItem('afuego.prefs') ?? '{}') }; }
  catch { return { sound: true, music: true, haptics: true }; }
}

export function getPrefs() { return { ...prefs }; }
export function setPref(key, value) {
  prefs[key] = value;
  try { localStorage.setItem('afuego.prefs', JSON.stringify(prefs)); } catch { /* sin almacenamiento */ }
  if (key === 'music' || key === 'sound') music.refresh();
}

function ac(force = false) {
  if (!prefs.sound && !force) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { at = 0, dur = 0.12, type = 'sine', gain = 0.18, slide = null } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise({ dur = 0.08, gain = 0.15, freq = 2000, at = 0 } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

function buzz(pattern) {
  if (prefs.haptics && navigator.vibrate) navigator.vibrate(pattern);
}
export const vibrate = buzz;

export const sfx = {
  tap: () => { tone(660, { dur: 0.05, type: 'triangle', gain: 0.08 }); buzz(8); },
  chop: () => { noise({ dur: 0.06, freq: 3500, gain: 0.2 }); tone(180, { dur: 0.05, type: 'square', gain: 0.05 }); buzz(12); },
  whisk: () => { noise({ dur: 0.07, freq: 1200, gain: 0.12 }); buzz(6); },
  place: () => { tone(320, { dur: 0.08, type: 'triangle', gain: 0.12, slide: 480 }); buzz(10); },
  sizzle: () => noise({ dur: 0.35, freq: 6000, gain: 0.08 }),
  ready: () => { tone(880, { dur: 0.1 }); tone(1175, { at: 0.08, dur: 0.14 }); buzz([20, 40, 20]); },
  plate: () => tone(520, { dur: 0.09, type: 'triangle', gain: 0.12, slide: 700 }),
  serve: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, { at: i * 0.06, dur: 0.14, gain: 0.14 })); buzz([15, 30, 15]); },
  coin: () => { tone(1320, { dur: 0.06, type: 'square', gain: 0.05 }); tone(1760, { at: 0.06, dur: 0.1, type: 'square', gain: 0.05 }); },
  error: () => { tone(200, { dur: 0.16, type: 'sawtooth', gain: 0.08, slide: 140 }); buzz(60); },
  burn: () => { noise({ dur: 0.4, freq: 800, gain: 0.15 }); buzz([50, 30, 50]); },
  angry: () => { tone(300, { dur: 0.18, type: 'sawtooth', gain: 0.07, slide: 180 }); buzz(80); },
  count: (final) => tone(final ? 1046 : 523, { dur: final ? 0.3 : 0.12, type: 'triangle', gain: 0.16 }),
  star: (i) => tone(660 * Math.pow(1.26, i), { dur: 0.25, type: 'triangle', gain: 0.15 }),
  buy: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, { at: i * 0.05, dur: 0.12, type: 'triangle', gain: 0.12 })); buzz(20); },
  arrive: () => tone(740, { dur: 0.08, gain: 0.08, slide: 990 }),
  group: () => { tone(660, { dur: 0.1, gain: 0.1 }); tone(880, { at: 0.1, dur: 0.1, gain: 0.1 }); tone(660, { at: 0.2, dur: 0.14, gain: 0.1 }); },
  together: () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, { at: i * 0.07, dur: 0.18, type: 'triangle', gain: 0.13 })); buzz([20, 30, 20, 30, 40]); },
  comboMax: () => { [523, 659, 784, 1046, 1319].forEach((f, i) => tone(f, { at: i * 0.05, dur: 0.16, type: 'square', gain: 0.06 })); buzz([30, 40, 60]); },
  comboLost: () => { tone(440, { dur: 0.12, type: 'triangle', gain: 0.1, slide: 330 }); tone(330, { at: 0.12, dur: 0.2, type: 'triangle', gain: 0.1, slide: 220 }); },
  logro: () => { [784, 1046, 1319, 1568, 2093].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.22, type: 'triangle', gain: 0.12 })); buzz([20, 40, 20]); }
};

// ── Música de fondo ──────────────────────────────────────────
// Un loop corto por restaurante: escala, tempo y timbre propios. Se programa
// unos milisegundos por delante con el reloj de WebAudio para que no se trabe.
const THEMES = {
  taqueria:   { bpm: 116, root: 293.66, scale: [0, 2, 4, 7, 9, 12], bass: [0, 7, 5, 7], lead: 'triangle', swing: 0.08 },
  diner:      { bpm: 132, root: 261.63, scale: [0, 3, 5, 6, 7, 10, 12], bass: [0, 0, 5, 7], lead: 'square', swing: 0.14 },
  trattoria:  { bpm: 100, root: 220.0,  scale: [0, 2, 4, 5, 7, 9, 11, 12], bass: [0, 5, 7, 5], lead: 'triangle', swing: 0 },
  izakaya:    { bpm: 88,  root: 293.66, scale: [0, 2, 3, 7, 8, 12], bass: [0, 0, 8, 7], lead: 'sine', swing: 0 },
  cevicheria: { bpm: 108, root: 246.94, scale: [0, 2, 4, 7, 9, 12], bass: [0, 5, 0, 7], lead: 'triangle', swing: 0.1 }
};
const semi = (root, n) => root * Math.pow(2, n / 12);

export const music = (() => {
  let theme = null;
  let master = null;
  let timer = null;
  let next = 0;
  let step = 0;
  let note = 2;
  let rush = false;
  let paused = false;

  function play(freq, at, dur, type, gain) {
    const c = ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(master);
    o.start(at); o.stop(at + dur + 0.03);
  }

  function schedule() {
    const c = ctx;
    if (!c || !theme) return;
    const eighth = 60 / (theme.bpm * (rush ? 1.15 : 1)) / 2;
    while (next < c.currentTime + 0.25) {
      const beat = step % 16;
      const at = next + (step % 2 ? eighth * theme.swing : 0);
      if (beat % 4 === 0) play(semi(theme.root / 2, theme.bass[(beat / 4) | 0]), at, eighth * 3, 'triangle', 0.09);
      // Melodía: paseo aleatorio por la escala, con silencios para que respire.
      if (Math.random() < (beat % 2 ? 0.45 : 0.7)) {
        note = Math.max(0, Math.min(theme.scale.length - 1, note + [-2, -1, -1, 1, 1, 2, 0][(Math.random() * 7) | 0]));
        play(semi(theme.root, theme.scale[note]), at, eighth * 1.6, theme.lead, theme.lead === 'square' ? 0.025 : 0.05);
      }
      if (rush && beat % 2 === 1) play(semi(theme.root * 2, theme.scale[0]), at, eighth * 0.5, 'square', 0.012);
      next += eighth;
      step += 1;
    }
  }

  function on() { return prefs.music && prefs.sound && theme && !paused; }

  function startLoop() {
    const c = ac(true);
    if (!c || timer) return;
    master = c.createGain();
    master.gain.value = 0.0001;
    master.gain.exponentialRampToValueAtTime(0.9, c.currentTime + 0.6);
    master.connect(c.destination);
    next = c.currentTime + 0.05;
    timer = setInterval(schedule, 90);
    schedule();
  }

  function stopLoop() {
    clearInterval(timer);
    timer = null;
    if (master && ctx) {
      const m = master;
      m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
      setTimeout(() => m.disconnect(), 600);
    }
    master = null;
  }

  return {
    start(id) { theme = THEMES[id] ?? THEMES.taqueria; step = 0; rush = false; paused = false; this.refresh(); },
    stop() { theme = null; stopLoop(); },
    pause() { paused = true; stopLoop(); },
    resume() { paused = false; this.refresh(); },
    setRush(v) { rush = v; },
    refresh() { if (on()) startLoop(); else stopLoop(); }
  };
})();
