// Catálogo de juego: estaciones, restaurantes, recetas y mejoras.
// Es la única fuente de verdad: el servidor y el cliente leen de aquí.

import { INGREDIENTS } from './ingredients.js';

// Cada proceso ocurre en una estación. `crudo` va directo al plato.
//  - kind 'tap': la estación necesita N toques/deslizamientos del jugador.
//  - kind 'timer': se cocina sola; hay que recogerla a tiempo (puede quemarse).
export const PROCESSES = Object.freeze({
  crudo:   { station: null,    verb: 'Directo',  kind: 'raw' },
  cortar:  { station: 'tabla', verb: 'Cortar',   kind: 'tap',   taps: 4 },
  batir:   { station: 'bol',   verb: 'Batir',    kind: 'tap',   taps: 6 },
  freir:   { station: 'sarten',verb: 'Freír',    kind: 'timer', seconds: 4.5, burnSeconds: 2.8 },
  hornear: { station: 'horno', verb: 'Hornear',  kind: 'timer', seconds: 6,   burnSeconds: 3.2 },
  hervir:  { station: 'olla',  verb: 'Hervir',   kind: 'timer', seconds: 5,   burnSeconds: null }
});

export const STATIONS = Object.freeze({
  tabla:  { name: 'Tabla',  process: 'cortar',  hint: 'Desliza para cortar' },
  bol:    { name: 'Bol',    process: 'batir',   hint: 'Toca rápido para batir' },
  sarten: { name: 'Sartén', process: 'freir',   hint: 'Recoge antes de que se queme' },
  horno:  { name: 'Horno',  process: 'hornear', hint: 'Recoge antes de que se queme' },
  olla:   { name: 'Olla',   process: 'hervir',  hint: 'Recoge cuando esté listo' }
});
export const STATION_IDS = Object.freeze(Object.keys(STATIONS));

// La meta del dinero: abrir los 5 restaurantes de la cadena.
// `upkeep`: gastos fijos por servicio (gas, luz, personal), se descuentan de lo ganado.
export const RESTAURANTS = Object.freeze([
  { id: 'taqueria',  name: 'Taquería La Lumbre', cuisine: 'Mexicana',      cost: 0,     reqLevel: 1,  upkeep: 60,
    theme: { primary: '#D9412B', deep: '#8F2414', soft: '#FDE3D8', ground: '#FFF3E3' } },
  { id: 'diner',     name: 'Diner Ruta 66',      cuisine: 'Americana',     cost: 2500,  reqLevel: 3,  upkeep: 100,
    theme: { primary: '#2F5FD0', deep: '#1B3A85', soft: '#DCE6FB', ground: '#F3F6FD' } },
  { id: 'trattoria', name: 'Trattoria Fuoco',    cuisine: 'Italiana',      cost: 6000,  reqLevel: 6,  upkeep: 150,
    theme: { primary: '#1E7A5A', deep: '#0F4A35', soft: '#D6EEE4', ground: '#F2F8F4' } },
  { id: 'izakaya',   name: 'Izakaya Hinode',     cuisine: 'Japonesa',      cost: 12000, reqLevel: 9,  upkeep: 210,
    theme: { primary: '#B3264A', deep: '#6E1229', soft: '#F8DCE3', ground: '#FBF4F1' } },
  { id: 'cevicheria',name: 'Cevichería El Muelle', cuisine: 'Peruana',     cost: 22000, reqLevel: 12, upkeep: 280,
    theme: { primary: '#C77A00', deep: '#7A4A00', soft: '#FBEBCD', ground: '#FFF8EA' } }
]);

// r(id, nombre, restaurante, componentes, precio de venta, costo de aprender, nivel requerido)
const r = (id, name, restaurant, comps, price, learnCost, reqLevel) => ({
  id, name, restaurant, price, learnCost, reqLevel,
  components: comps.map(([ingredient, process]) => ({ ingredient, process }))
});

export const RECIPES = Object.freeze([
  // ── Mexicana ───────────────────────────────────────────────
  r('taco_asada',   'Taco de asada',     'taqueria', [['tortilla','crudo'],['carne_res','freir'],['cebolla','cortar']], 40, 0, 1),
  r('quesadilla',   'Quesadilla',        'taqueria', [['tortilla','freir'],['queso','crudo']], 30, 0, 1),
  r('guacamole',    'Guacamole',         'taqueria', [['aguacate','batir'],['tomate','cortar'],['cilantro','cortar']], 45, 250, 2),
  r('taco_pastor',  'Taco al pastor',    'taqueria', [['tortilla','crudo'],['cerdo','freir'],['pina','cortar']], 50, 400, 2),
  r('frijoles',     'Frijoles charros',  'taqueria', [['frijol','hervir'],['tocino','freir'],['chile','cortar']], 55, 600, 3),
  r('chilaquiles',  'Chilaquiles',       'taqueria', [['tortilla','freir'],['tomate','batir'],['huevo','freir']], 65, 900, 4),
  r('enchiladas',   'Enchiladas suizas', 'taqueria', [['tortilla','crudo'],['pollo','hervir'],['queso','hornear'],['chile','batir']], 75, 1300, 5),
  r('pozole',       'Pozole rojo',       'taqueria', [['maiz','hervir'],['cerdo','hervir'],['lechuga','cortar'],['chile','batir']], 85, 1800, 6),

  // ── Americana ──────────────────────────────────────────────
  r('hamburguesa',  'Hamburguesa',       'diner', [['pan','crudo'],['carne_res','freir'],['lechuga','cortar']], 50, 0, 3),
  r('hot_dog',      'Hot dog',           'diner', [['pan','crudo'],['salchicha','hervir'],['cebolla','cortar']], 40, 0, 3),
  r('papas',        'Papas con cátsup',  'diner', [['papa','freir'],['tomate','batir']], 35, 500, 3),
  r('hot_cakes',    'Hot cakes',         'diner', [['harina','batir'],['fresa','cortar'],['miel','crudo']], 55, 800, 4),
  r('alitas',       'Alitas picantes',   'diner', [['pollo','freir'],['chile','batir']], 60, 1100, 5),
  r('mac_cheese',   'Mac & cheese',      'diner', [['pasta','hervir'],['queso','hornear'],['leche','crudo']], 65, 1500, 6),
  r('club',         'Club sándwich',     'diner', [['pan','hornear'],['pollo','freir'],['tocino','freir'],['lechuga','cortar']], 85, 2000, 7),
  r('doble_queso',  'Doble con queso',   'diner', [['pan','crudo'],['carne_res','freir'],['carne_res','freir'],['queso','crudo'],['tomate','cortar']], 100, 2600, 8),

  // ── Italiana ───────────────────────────────────────────────
  r('bruschetta',   'Bruschetta',        'trattoria', [['pan','hornear'],['tomate','cortar'],['albahaca','crudo']], 45, 0, 6),
  r('caprese',      'Ensalada caprese',  'trattoria', [['tomate','cortar'],['mozzarella','cortar'],['albahaca','crudo']], 50, 0, 6),
  r('pomodoro',     'Spaghetti pomodoro','trattoria', [['pasta','hervir'],['tomate','batir'],['albahaca','crudo']], 60, 900, 6),
  r('margarita',    'Pizza margarita',   'trattoria', [['harina','hornear'],['tomate','batir'],['mozzarella','cortar'],['albahaca','crudo']], 85, 1500, 7),
  r('carbonara',    'Carbonara',         'trattoria', [['pasta','hervir'],['huevo','batir'],['tocino','freir'],['queso','crudo']], 90, 2100, 8),
  r('risotto',      'Risotto de hongos', 'trattoria', [['arroz','hervir'],['champinon','freir'],['cebolla','cortar'],['queso','crudo']], 95, 2800, 9),
  r('tiramisu',     'Tiramisú',          'trattoria', [['queso','batir'],['huevo','batir'],['chocolate','cortar'],['pan','crudo']], 90, 3400, 10),
  r('lasagna',      'Lasaña',            'trattoria', [['pasta','hervir'],['carne_res','freir'],['tomate','batir'],['queso','hornear']], 115, 4200, 11),

  // ── Japonesa ───────────────────────────────────────────────
  r('onigiri',      'Onigiri',           'izakaya', [['arroz','hervir'],['alga','crudo']], 45, 0, 9),
  r('miso',         'Sopa miso',         'izakaya', [['tofu','cortar'],['alga','crudo'],['cebolla','cortar']], 50, 0, 9),
  r('nigiri',       'Nigiri de salmón',  'izakaya', [['arroz','hervir'],['salmon','cortar']], 65, 1400, 9),
  r('maki',         'Maki de pepino',    'izakaya', [['arroz','hervir'],['alga','crudo'],['pepino','cortar']], 70, 1900, 10),
  r('yakitori',     'Yakitori',          'izakaya', [['pollo','freir'],['cebolla','cortar'],['miel','crudo']], 75, 2500, 11),
  r('tempura',      'Tempura de camarón','izakaya', [['camaron','freir'],['harina','batir'],['limon','cortar']], 90, 3200, 12),
  r('sashimi',      'Sashimi mixto',     'izakaya', [['salmon','cortar'],['atun','cortar'],['pepino','cortar']], 105, 4000, 13),
  r('ramen',        'Ramen tonkotsu',    'izakaya', [['fideos','hervir'],['cerdo','hornear'],['huevo','hervir'],['cebolla','cortar']], 130, 5000, 14),

  // ── Peruana ────────────────────────────────────────────────
  r('papa_huanc',   'Papa a la huancaína','cevicheria', [['papa','hervir'],['queso','batir'],['aji','batir'],['lechuga','crudo']], 75, 0, 12),
  r('causa',        'Causa limeña',      'cevicheria', [['papa','hervir'],['aguacate','cortar'],['limon','crudo']], 70, 0, 12),
  r('ceviche',      'Ceviche clásico',   'cevicheria', [['pescado','cortar'],['limon','batir'],['cebolla','cortar'],['aji','crudo']], 100, 2500, 12),
  r('picarones',    'Picarones con miel','cevicheria', [['camote','hervir'],['harina','freir'],['miel','crudo']], 80, 3200, 13),
  r('anticuchos',   'Anticuchos',        'cevicheria', [['carne_res','hornear'],['aji','batir'],['papa','hervir']], 110, 4000, 14),
  r('aji_gallina',  'Ají de gallina',    'cevicheria', [['pollo','hervir'],['aji','batir'],['arroz','hervir'],['huevo','hervir']], 120, 5000, 15),
  r('chaufa',       'Arroz chaufa',      'cevicheria', [['arroz','freir'],['huevo','batir'],['cerdo','freir'],['cebolla','cortar']], 125, 6000, 16),
  r('lomo',         'Lomo saltado',      'cevicheria', [['carne_res','freir'],['papa','freir'],['tomate','cortar'],['arroz','hervir'],['cebolla','cortar']], 150, 7500, 17)
]);

// Mejoras compradas con dinero. `costs[n]` es el precio de pasar al nivel n+1.
export const UPGRADES = Object.freeze([
  { id: 'cuchillos', name: 'Cuchillos de chef',  desc: 'Menos cortes por ingrediente',        station: 'tabla',  costs: [300, 900, 2200, 5000] },
  { id: 'batidora',  name: 'Batidora eléctrica', desc: 'Menos toques para batir',              station: 'bol',    costs: [300, 900, 2200, 5000] },
  { id: 'sarten',    name: 'Sartén de cobre',    desc: 'Fríe 12% más rápido por nivel',        station: 'sarten', costs: [400, 1100, 2600, 6000] },
  { id: 'horno',     name: 'Horno de piedra',    desc: 'Hornea 12% más rápido por nivel',      station: 'horno',  costs: [400, 1100, 2600, 6000] },
  { id: 'olla',      name: 'Olla exprés',        desc: 'Hierve 12% más rápido por nivel',      station: 'olla',   costs: [400, 1100, 2600, 6000] },
  { id: 'campana',   name: 'Campana extractora', desc: 'Más tiempo antes de que algo se queme', station: null,     costs: [700, 2400] },
  { id: 'ambiente',  name: 'Ambiente y música',  desc: 'Clientes 10% más pacientes y +8% propina por nivel', station: null, costs: [600, 1600, 3500, 8000] },
  { id: 'mesas',     name: 'Mesas extra',        desc: '+1 cliente atendido a la vez',         station: null,     costs: [1500, 5000] },
  { id: 'refri',     name: 'Refrigerador',       desc: '+25 lugares en la despensa por nivel', station: null,     costs: [800, 2500, 6000] },
  // Equipo extra: un segundo fogón de cada tipo, para no colapsar en hora pico.
  // `reqLevels[n]` es el nivel de chef necesario para comprar el nivel n+1.
  { id: 'extra_tabla',  name: 'Segunda tabla',  desc: 'Corta dos ingredientes a la vez',  station: 'tabla',  extra: true, costs: [1200], reqLevels: [3] },
  { id: 'extra_bol',    name: 'Segundo bol',    desc: 'Bate dos cosas a la vez',         station: 'bol',    extra: true, costs: [1500], reqLevels: [4] },
  { id: 'extra_sarten', name: 'Segunda sartén', desc: 'Fríe dos ingredientes a la vez',  station: 'sarten', extra: true, costs: [2000], reqLevels: [5] },
  { id: 'extra_olla',   name: 'Segunda olla',   desc: 'Hierve dos ingredientes a la vez', station: 'olla',  extra: true, costs: [2200], reqLevels: [6] },
  { id: 'extra_horno',  name: 'Segundo horno',  desc: 'Hornea dos cosas a la vez',       station: 'horno',  extra: true, costs: [2600], reqLevels: [7] }
]);

export const RECIPE_BY_ID = Object.freeze(Object.fromEntries(RECIPES.map((x) => [x.id, x])));
export const RESTAURANT_BY_ID = Object.freeze(Object.fromEntries(RESTAURANTS.map((x) => [x.id, x])));
export const UPGRADE_BY_ID = Object.freeze(Object.fromEntries(UPGRADES.map((x) => [x.id, x])));

export function recipesOf(restaurantId) {
  return RECIPES.filter((x) => x.restaurant === restaurantId);
}

// Comprobación de integridad al cargar: un catálogo roto debe fallar de inmediato.
(function assertCatalog() {
  const ids = new Set();
  for (const rec of RECIPES) {
    if (ids.has(rec.id)) throw new Error(`Receta duplicada: ${rec.id}`);
    ids.add(rec.id);
    if (!RESTAURANT_BY_ID[rec.restaurant]) throw new Error(`Restaurante desconocido en ${rec.id}`);
    for (const c of rec.components) {
      if (!INGREDIENTS[c.ingredient]) throw new Error(`Ingrediente desconocido ${c.ingredient} en ${rec.id}`);
      if (!PROCESSES[c.process]) throw new Error(`Proceso desconocido ${c.process} en ${rec.id}`);
    }
  }
  for (const rest of RESTAURANTS) {
    if (!RECIPES.some((x) => x.restaurant === rest.id && x.learnCost === 0)) {
      throw new Error(`${rest.id} no tiene recetas iniciales`);
    }
  }
})();
