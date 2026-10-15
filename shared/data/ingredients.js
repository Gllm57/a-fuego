// Catálogo de ingredientes. `shape` decide cómo se dibuja el icono en el cliente
// (ver client/art.js); `color` y `accent` son su relleno y su sombra; `cost` es el
// precio base por unidad en el mercado (varía cada día).

export const INGREDIENTS = Object.freeze({
  tortilla:  { name: 'Tortilla',      shape: 'disc',   color: '#F2D49B', accent: '#D9B26F', cost: 3 },
  carne_res: { name: 'Carne de res',  shape: 'slab',   color: '#9C3D2B', accent: '#6E2619', cost: 12 },
  pollo:     { name: 'Pollo',         shape: 'drum',   color: '#F0B98A', accent: '#C98A57', cost: 9 },
  cerdo:     { name: 'Cerdo',         shape: 'slab',   color: '#E08A72', accent: '#B5604A', cost: 10 },
  pescado:   { name: 'Pescado',       shape: 'fish',   color: '#B9CCDD', accent: '#8AA3B8', cost: 14 },
  camaron:   { name: 'Camarón',       shape: 'curl',   color: '#F28C6B', accent: '#C9603F', cost: 16 },
  salmon:    { name: 'Salmón',        shape: 'slab',   color: '#FA8B5F', accent: '#D7653A', cost: 18 },
  atun:      { name: 'Atún',          shape: 'slab',   color: '#C2384A', accent: '#8E2433', cost: 18 },
  salchicha: { name: 'Salchicha',     shape: 'long',   color: '#C0583A', accent: '#8F3B22', cost: 6 },
  tocino:    { name: 'Tocino',        shape: 'strip',  color: '#D46A5C', accent: '#F3C3B3', cost: 7 },
  huevo:     { name: 'Huevo',         shape: 'egg',    color: '#FFF6E0', accent: '#E7D8B5', cost: 3 },
  queso:     { name: 'Queso',         shape: 'wedge',  color: '#FFC94A', accent: '#E0A21C', cost: 6 },
  mozzarella:{ name: 'Mozzarella',    shape: 'round',  color: '#FFF8E7', accent: '#E9DDBF', cost: 8 },
  leche:     { name: 'Leche',         shape: 'bottle', color: '#FFFFFF', accent: '#9EC5E8', cost: 3 },
  tomate:    { name: 'Tomate',        shape: 'round',  color: '#E8452C', accent: '#B32D18', cost: 3 },
  cebolla:   { name: 'Cebolla',       shape: 'round',  color: '#E3C9EE', accent: '#B48CC6', cost: 2 },
  cilantro:  { name: 'Cilantro',      shape: 'leaf',   color: '#3FA34D', accent: '#2A7535', cost: 2 },
  aguacate:  { name: 'Aguacate',      shape: 'drop',   color: '#6E9E36', accent: '#3E5E1A', cost: 6 },
  lechuga:   { name: 'Lechuga',       shape: 'leaf',   color: '#8BC34A', accent: '#5E8F28', cost: 3 },
  chile:     { name: 'Chile',         shape: 'long',   color: '#D32F2F', accent: '#2E7D32', cost: 2 },
  aji:       { name: 'Ají amarillo',  shape: 'long',   color: '#F4A300', accent: '#2E7D32', cost: 3 },
  limon:     { name: 'Limón',         shape: 'round',  color: '#B5D33A', accent: '#7E9A1A', cost: 2 },
  pina:      { name: 'Piña',          shape: 'block',  color: '#F7C948', accent: '#C99A12', cost: 5 },
  papa:      { name: 'Papa',          shape: 'round',  color: '#D9B26F', accent: '#A9823F', cost: 2 },
  camote:    { name: 'Camote',        shape: 'drop',   color: '#D2691E', accent: '#9C4A10', cost: 3 },
  maiz:      { name: 'Maíz',          shape: 'grain',  color: '#F4C430', accent: '#C99A12', cost: 3 },
  frijol:    { name: 'Frijol',        shape: 'grain',  color: '#6B3A2B', accent: '#43231A', cost: 2 },
  pepino:    { name: 'Pepino',        shape: 'long',   color: '#4F9A40', accent: '#2F6A25', cost: 3 },
  champinon: { name: 'Champiñón',     shape: 'cap',    color: '#C8B39A', accent: '#8C7458', cost: 6 },
  albahaca:  { name: 'Albahaca',      shape: 'leaf',   color: '#2E8B57', accent: '#1D5E3A', cost: 3 },
  alga:      { name: 'Alga nori',     shape: 'sheet',  color: '#24402F', accent: '#13261B', cost: 5 },
  tofu:      { name: 'Tofu',          shape: 'block',  color: '#F4F1E8', accent: '#D8D1BC', cost: 5 },
  arroz:     { name: 'Arroz',         shape: 'grain',  color: '#F7F5EE', accent: '#D6D0BE', cost: 2 },
  pasta:     { name: 'Pasta',         shape: 'noodle', color: '#F5DC9A', accent: '#D4B66A', cost: 3 },
  fideos:    { name: 'Fideos ramen',  shape: 'noodle', color: '#F2CF7A', accent: '#C9A24A', cost: 4 },
  harina:    { name: 'Harina',        shape: 'mound',  color: '#F5EFE6', accent: '#D9CDB8', cost: 2 },
  pan:       { name: 'Pan',           shape: 'bun',    color: '#E0A040', accent: '#B07424', cost: 3 },
  fresa:     { name: 'Fresa',         shape: 'berry',  color: '#E2394B', accent: '#2E7D32', cost: 6 },
  miel:      { name: 'Miel',          shape: 'jar',    color: '#F2A93B', accent: '#C27C16', cost: 5 },
  chocolate: { name: 'Chocolate',     shape: 'block',  color: '#5C3317', accent: '#3A1E0B', cost: 7 }
});

export const INGREDIENT_IDS = Object.freeze(Object.keys(INGREDIENTS));
