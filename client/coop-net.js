// Conexión del modo cooperativo: una «sala» donde dos celulares se mandan mensajes.
// En el juego publicado usa Supabase Realtime (canales con presencia y mensajes al
// instante; no guarda nada en la base de datos). Para probar en un mismo navegador,
// `?coop=local` usa un BroadcastChannel entre pestañas.
//
//   const room = await joinRoom('TACO-42', { id, name }, { onMessage, onMembers });
//   room.send({ type: 'hola' }); room.update({ ready: true }); room.leave();

const SUPABASE_URL = 'https://heaenlyhsgnuahbgawnv.supabase.co';
// Clave pública (anon): está hecha para ir dentro de la app; sólo permite usar los canales.
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlYWVubHloc2dudWFoYmdhd252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3ODA2NjMsImV4cCI6MjEwODM1NjY2M30.1ngBOKy8Wi1X3qEQEKh36ULJsnNlJ_8uI6X6b16e5Ec';

const localMode = () => {
  try { return new URLSearchParams(location.search).get('coop') === 'local' || localStorage.getItem('afuego.coopNet') === 'local'; } catch { return false; }
};

export function joinRoom(code, me, handlers) {
  return localMode() ? localRoom(code, me, handlers) : supabaseRoom(code, me, handlers);
}

async function supabaseRoom(code, me, { onMessage, onMembers, onStatus }) {
  const { RealtimeClient } = await import('@supabase/realtime-js');
  const client = new RealtimeClient(`${SUPABASE_URL}/realtime/v1`, { params: { apikey: SUPABASE_KEY, eventsPerSecond: 40 } });
  const channel = client.channel(`afuego-coop-${code}`, { config: { broadcast: { self: false, ack: false }, presence: { key: me.id } } });
  let meta = { ...me };
  channel.on('broadcast', { event: 'm' }, ({ payload }) => onMessage?.(payload));
  channel.on('presence', { event: 'sync' }, () => {
    const members = Object.values(channel.presenceState()).map((list) => list[list.length - 1]);
    onMembers?.(members);
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No se pudo conectar a la sala. Revisa tu internet.')), 12000);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        await channel.track(meta);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatus?.(status);
      }
    });
  });
  return {
    send: (payload) => channel.send({ type: 'broadcast', event: 'm', payload }),
    update: (patch) => { meta = { ...meta, ...patch }; return channel.track(meta); },
    leave: async () => { try { await channel.untrack(); await client.removeChannel(channel); client.disconnect(); } catch { /* ya se fue */ } }
  };
}

// Sala entre pestañas del mismo navegador (pruebas). La presencia se arma con latidos.
function localRoom(code, me, { onMessage, onMembers }) {
  const bc = new BroadcastChannel(`afuego-coop-${code}`);
  let meta = { ...me };
  const others = new Map();
  const emit = () => onMembers?.([meta, ...[...others.values()].map((o) => o.meta)]);
  const beat = () => bc.postMessage({ kind: 'presence', meta });
  bc.onmessage = ({ data }) => {
    if (data.kind === 'presence') {
      const known = others.has(data.meta.id);
      others.set(data.meta.id, { meta: data.meta, at: Date.now() });
      if (!known) beat();
      emit();
    } else if (data.kind === 'bye') {
      others.delete(data.id); emit();
    } else if (data.kind === 'm') onMessage?.(data.payload);
  };
  const timer = setInterval(() => {
    beat();
    for (const [id, o] of others) if (Date.now() - o.at > 4000) { others.delete(id); emit(); }
  }, 1000);
  beat(); emit();
  return Promise.resolve({
    send: (payload) => bc.postMessage({ kind: 'm', payload }),
    update: (patch) => { meta = { ...meta, ...patch }; beat(); emit(); },
    leave: () => { clearInterval(timer); bc.postMessage({ kind: 'bye', id: meta.id }); bc.close(); }
  });
}

// Código fácil de dictar: una comida y dos números (TACO-42).
const WORDS = ['TACO', 'AREPA', 'SOPA', 'MOLE', 'PIZZA', 'SUSHI', 'FLAN', 'PAN', 'KIMCHI', 'PASTA', 'CHURRO', 'TAMAL'];
export function newRoomCode() {
  return `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${String(Math.floor(Math.random() * 90) + 10)}`;
}

export function normalizeCode(s) {
  const t = String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = t.match(/^([A-Z]+)(\d{2})$/);
  return m ? `${m[1]}-${m[2]}` : null;
}
