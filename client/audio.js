// Efectos de sonido sintetizados (WebAudio) y vibración. Sin archivos de audio.

const prefs = loadPrefs();
let ctx = null;

function loadPrefs() {
  try { return { sound: true, haptics: true, ...JSON.parse(localStorage.getItem('afuego.prefs') ?? '{}') }; }
  catch { return { sound: true, haptics: true }; }
}

export function getPrefs() { return { ...prefs }; }
export function setPref(key, value) {
  prefs[key] = value;
  try { localStorage.setItem('afuego.prefs', JSON.stringify(prefs)); } catch { /* sin almacenamiento */ }
}

function ac() {
  if (!prefs.sound) return null;
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
  arrive: () => tone(740, { dur: 0.08, gain: 0.08, slide: 990 })
};
