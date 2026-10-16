// Logros: metas cortas con premio en monedas mientras se construye la cadena.
// El progreso se calcula con los contadores que deja cada servicio validado.

const a = (id, name, desc, stat, goal, reward) => ({ id, name, desc, stat, goal, reward });

export const ACHIEVEMENTS = Object.freeze([
  a('primer_servicio', 'Primer servicio', 'Termina tu primer servicio', 'runs', 1, 50),
  a('platos_50', 'Mano caliente', 'Sirve 50 platos', 'served', 50, 150),
  a('combo_8', 'En racha', 'Llega a un combo de 8', 'bestCombo', 8, 200),
  a('tres_estrellas', 'Cinco tenedores', 'Consigue 3 estrellas en un servicio', 'threeStars', 1, 250),
  a('bombero', 'Bombero', 'Apaga 10 fuegos', 'firesOut', 10, 250),
  a('sin_enojos', 'Nadie se fue', 'Termina un servicio de 10+ platos sin que se vaya nadie', 'cleanRuns', 1, 300),
  a('amigos', 'Mesa para dos', 'Sirve juntos a 10 grupos de amigos', 'groups', 10, 350),
  a('criticos', 'Crítica favorable', 'Atiende a 15 críticos gastronómicos', 'vipServed', 15, 400),
  a('platos_300', 'Cocina de batalla', 'Sirve 300 platos', 'served', 300, 600),
  a('perfeccionista', 'Perfeccionista', 'Logra 150 puntos ¡Perfecto!', 'perfects', 150, 500),
  a('cadena', 'Cadena en marcha', 'Ten 3 restaurantes abiertos', 'restaurants', 3, 800),
  a('platos_1000', 'Leyenda de la barra', 'Sirve 1.000 platos', 'served', 1000, 2000)
]);
export const ACHIEVEMENT_BY_ID = Object.freeze(Object.fromEntries(ACHIEVEMENTS.map((x) => [x.id, x])));

const COUNTERS = ['runs', 'served', 'vipServed', 'firesOut', 'groups', 'perfects', 'threeStars', 'cleanRuns'];

export function emptyStats() {
  return { ...Object.fromEntries(COUNTERS.map((k) => [k, 0])), bestCombo: 0 };
}

// Suma un servicio validado a los contadores.
export function addRunToStats(stats, result) {
  const s = { ...emptyStats(), ...stats };
  s.runs += 1;
  s.served += result.served;
  s.vipServed += result.vipServed;
  s.firesOut += result.firesOut ?? 0;
  s.groups += result.groupsServed ?? 0;
  s.perfects += result.perfects;
  if (result.stars >= 3) s.threeStars += 1;
  if (result.missed === 0 && result.served >= 10) s.cleanRuns += 1;
  s.bestCombo = Math.max(s.bestCombo, result.bestCombo);
  return s;
}

function statValue(state, stat) {
  if (stat === 'restaurants') return state.restaurants?.length ?? 0;
  return state.stats?.[stat] ?? 0;
}

// Lista para mostrar: progreso de cada logro y si ya se cobró.
export function achievementProgress(state) {
  const done = new Set(state.achievements ?? []);
  return ACHIEVEMENTS.map((x) => {
    const value = Math.min(x.goal, statValue(state, x.stat));
    return { ...x, value, done: done.has(x.id) };
  });
}

// Logros cumplidos que aún no se han cobrado. No muta el estado.
export function pendingAchievements(state) {
  const done = new Set(state.achievements ?? []);
  return ACHIEVEMENTS.filter((x) => !done.has(x.id) && statValue(state, x.stat) >= x.goal);
}
