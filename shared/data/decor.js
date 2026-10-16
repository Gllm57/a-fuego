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
  d('toldo_fresa', 'toldo', 'Fresa', 350, { colors: ['#E2394B', '#FFFFFF', '#9E1F2E'] }),
  d('toldo_limon', 'toldo', 'Limón', 350, { colors: ['#7DB33A', '#FFF6B3', '#4E7A1E'] }),
  d('toldo_cielo', 'toldo', 'Cielo', 400, { colors: ['#4FA9DE', '#FFFFFF', '#23688F'] }),
  d('toldo_guacamaya', 'toldo', 'Guacamaya', 950, { colors: ['#D9412B', '#F2C200', '#1C4E9C'] }),
  d('toldo_tricolor', 'toldo', 'Tricolor', 0, { colors: ['#F2C200', '#1C4E9C', '#C8102E'], achievement: 'cadena' }),
  d('toldo_arcoiris', 'toldo', 'Arcoíris', 0, { colors: ['#E2394B', '#F2C200', '#6A3FC2'], achievement: 'combo_8' }),

  d('pared_lisa', 'pared', 'Lisa', 0),
  d('pared_azulejos', 'pared', 'Azulejos', 400),
  d('pared_ladrillo', 'pared', 'Ladrillo', 500),
  d('pared_madera', 'pared', 'Madera', 650),
  d('pared_pizarra', 'pared', 'Pizarra', 700),
  d('pared_floral', 'pared', 'Floral', 550),
  d('pared_picnic', 'pared', 'Picnic', 450),
  d('pared_atardecer', 'pared', 'Atardecer', 800),
  d('pared_tropical', 'pared', 'Tropical', 900),
  d('pared_mural', 'pared', 'Mural', 0, { achievement: 'tres_estrellas' }),
  d('pared_estrellas', 'pared', 'Noche estrellada', 0, { achievement: 'criticos' }),

  d('luces_colgantes', 'luces', 'Colgantes', 0),
  d('luces_guirnalda', 'luces', 'Guirnalda', 550),
  d('luces_faroles', 'luces', 'Faroles', 700),
  d('luces_velas', 'luces', 'Velas', 450),
  d('luces_neon', 'luces', 'Neón', 1200, { reqLevel: 10 }),

  d('barra_roble', 'barra', 'Roble', 0),
  d('barra_nogal', 'barra', 'Nogal', 600),
  d('barra_talavera', 'barra', 'Talavera', 750),
  d('barra_marmol', 'barra', 'Mármol', 900),
  d('barra_bambu', 'barra', 'Bambú', 500),
  d('barra_neon', 'barra', 'Neón', 1100),
  d('barra_oro', 'barra', 'Oro', 0, { achievement: 'platos_300' }),

  d('deco_plantas', 'deco', 'Plantas', 200),
  d('deco_reloj', 'deco', 'Reloj', 300),
  d('deco_gato', 'deco', 'Gato de la suerte', 500),
  d('deco_pecera', 'deco', 'Pecera', 650),
  d('deco_mariposas', 'deco', 'Mariposas', 400),
  d('deco_rocola', 'deco', 'Rocola', 1200),
  d('deco_pinata', 'deco', 'Piñata', 700),
  d('deco_guacamaya', 'deco', 'Guacamaya', 0, { achievement: 'bombero' }),
  d('deco_banderines', 'deco', 'Banderines', 0, { achievement: 'amigos' })
]);

export const DECOR_BY_ID = Object.freeze(Object.fromEntries(DECOR.map((x) => [x.id, x])));

export function defaultDecor() {
  return { owned: [], equipped: { toldo: 'toldo_local', pared: 'pared_lisa', luces: 'luces_colgantes', barra: 'barra_roble', deco: [] } };
}
