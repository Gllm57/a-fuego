// Decoración del local («Mi local»): sólo cambia cómo se ve, no las reglas.
// Cada ranura tiene una opción gratis puesta de inicio; las demás se compran con
// monedas o se ganan con un logro (`achievement`) o con nivel de chef (`reqLevel`).

export const DECOR_SLOTS = Object.freeze([
  { id: 'toldo', name: 'Toldo' },
  { id: 'pared', name: 'Pared' },
  { id: 'luces', name: 'Luces' },
  { id: 'barra', name: 'Barra' },
  { id: 'deco', name: 'Adornos', multi: true }
]);

const d = (id, slot, name, cost, extra = {}) => ({ id, slot, name, cost, ...extra });

export const DECOR = Object.freeze([
  d('toldo_local', 'toldo', 'Del local', 0, { colors: null }),
  d('toldo_brasa', 'toldo', 'Brasa', 300, { colors: ['#D9412B', '#F6C7BC', '#8F2414'] }),
  d('toldo_caribe', 'toldo', 'Caribe', 450, { colors: ['#0F7C8A', '#BFE7EA', '#0A4F57'] }),
  d('toldo_flor', 'toldo', 'Flor', 600, { colors: ['#E2577B', '#FAD3DE', '#9C2848'] }),
  d('toldo_noche', 'toldo', 'Noche', 800, { colors: ['#2A170D', '#6B4A36', '#120A05'] }),
  d('toldo_tricolor', 'toldo', 'Tricolor', 0, { colors: ['#F2C200', '#1C4E9C', '#C8102E'], achievement: 'cadena' }),

  d('pared_lisa', 'pared', 'Lisa', 0),
  d('pared_azulejos', 'pared', 'Azulejos', 400),
  d('pared_ladrillo', 'pared', 'Ladrillo', 500),
  d('pared_madera', 'pared', 'Madera', 650),
  d('pared_pizarra', 'pared', 'Pizarra', 700),
  d('pared_mural', 'pared', 'Mural', 0, { achievement: 'tres_estrellas' }),

  d('luces_colgantes', 'luces', 'Colgantes', 0),
  d('luces_guirnalda', 'luces', 'Guirnalda', 550),
  d('luces_neon', 'luces', 'Neón', 1200, { reqLevel: 10 }),

  d('barra_roble', 'barra', 'Roble', 0),
  d('barra_nogal', 'barra', 'Nogal', 600),
  d('barra_talavera', 'barra', 'Talavera', 750),
  d('barra_marmol', 'barra', 'Mármol', 900),

  d('deco_plantas', 'deco', 'Plantas', 200),
  d('deco_cuadro', 'deco', 'Cuadro', 350),
  d('deco_banderines', 'deco', 'Banderines', 0, { achievement: 'amigos' })
]);

export const DECOR_BY_ID = Object.freeze(Object.fromEntries(DECOR.map((x) => [x.id, x])));

export function defaultDecor() {
  return { owned: [], equipped: { toldo: 'toldo_local', pared: 'pared_lisa', luces: 'luces_colgantes', barra: 'barra_roble', deco: [] } };
}
