// Diccionario inglés, armado por partes (pantallas, cocina, catálogo y el resto).
import app from './en/app.js';
import game from './en/game.js';
import data from './en/data.js';
import misc from './en/misc.js';

export const EN = Object.freeze({ ...data, ...misc, ...game, ...app });
