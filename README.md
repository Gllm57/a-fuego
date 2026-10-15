# ¡A Fuego!

Juego de cocina para celular: atiende clientes, prepara sus platos con gestos simples y
usa las propinas para construir tu cadena de restaurantes.

## El juego

- **Servicio de 2 minutos.** Llegan clientes con pedidos. Tocas un cliente, tocas los
  ingredientes resaltados y tocas las estaciones: **cortar** y **batir** se hacen con
  toques; **freír**, **hornear** y **hervir** se cocinan solos y hay que recogerlos a
  tiempo (el sartén y el horno queman). Recoger justo a tiempo da **¡Perfecto!**.
- **Combos:** servir seguido sin que nadie se vaya multiplica las ganancias (hasta ×2).
- **40 recetas** en 5 restaurantes (8 cada uno): mexicana, americana, italiana,
  japonesa y peruana.
- **Reto del día** con premio extra y **ranking semanal** por restaurante.

### Para qué sirve el dinero

La meta es construir la cadena **¡A Fuego!** y llegar a **Chef Leyenda** (100 % del
imperio). Las monedas se invierten en:

| Inversión | Efecto |
|---|---|
| Abrir restaurantes (2.500 → 22.000) | Nueva cocina del mundo con 8 recetas |
| Aprender recetas (250 → 7.500) | El plato entra al menú; los más elaborados pagan más |
| Mejoras de cocina | Cocina más rápido, menos toques, más tiempo antes de quemarse, clientes más pacientes, más mesas |

El progreso del imperio pondera restaurantes (40 %), recetas (40 %) y mejoras (20 %).
La pantalla de inicio siempre muestra la **siguiente meta** concreta y cuánto falta.

## Arquitectura

```
shared/   Reglas del juego (JS puro, sin dependencias). Lo usan servidor y cliente.
  data/catalog.js    Restaurantes, 40 recetas, estaciones, mejoras (con validación de integridad)
  rules.js           Efecto de las mejoras y tiempos mínimos físicamente posibles
  levelgen.js        Generación determinista de clientes a partir de una semilla
  scoring.js         Validación anti-trampas y cálculo de monedas/estrellas/XP
  economy.js         Compras, niveles, progreso del imperio, reto diario
server/   API REST (Fastify + SQLite integrado en Node)
client/   Juego web para celular (HTML/CSS/JS sin framework ni build)
```

### Backend

- **Autoritativo:** el servidor genera la partida (semilla, menú, mejoras) y la guarda.
  El cliente sólo envía *qué pedidos sirvió y cuándo*; el servidor regenera los clientes
  y **calcula el pago él mismo**.
- **Anti-trampas:** rechaza platos imposibles de preparar en ese tiempo, clientes que ya
  se habían ido o que no tenían mesa, estaciones usadas por encima de su capacidad,
  recetas cambiadas, duplicados y resultados enviados antes de que el tiempo real de la
  partida haya pasado. Los reincidentes quedan bloqueados (`MAX_CHEAT_STRIKES`).
- **Dinero seguro:** cada movimiento queda en un **libro contable inmutable** (`ledger`)
  con saldo resultante; `CHECK (coins >= 0)` en la base de datos; todas las operaciones
  de dinero en transacciones `BEGIN IMMEDIATE`.
- **Idempotencia:** las compras aceptan `Idempotency-Key` y completar una partida dos
  veces devuelve el mismo resultado sin pagar dos veces.
- **Cuentas:** invitado instantáneo; registro opcional con usuario y contraseña (scrypt).
  Tokens HMAC-SHA256 con versión para revocarlos.
- **Endurecimiento:** validación de esquemas JSON en cada ruta, límite de peticiones,
  cabeceras de seguridad (Helmet/CSP), límite de tamaño de cuerpo, cierre ordenado.

### API (`/api/v1`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/guest` | Crea un jugador invitado |
| POST | `/auth/register` | Guarda la cuenta con usuario y contraseña |
| POST | `/auth/login` | Inicia sesión |
| GET | `/me` | Perfil, progreso del imperio, siguiente meta, reto diario |
| GET | `/me/ledger` | Historial de monedas |
| GET | `/catalog` | Catálogo completo |
| POST | `/shop/purchase` | Compra `{kind: restaurant\|recipe\|upgrade, id}` |
| POST | `/runs` | Empieza un servicio `{restaurantId, mode: normal\|daily}` |
| POST | `/runs/:id/complete` | Envía los platos servidos y cobra |
| POST | `/runs/:id/abandon` | Abandona el servicio |
| GET | `/leaderboard/:restaurantId` | Ranking semanal |
| GET | `/health` | Estado del servicio |

## Uso

Requiere **Node.js 22.5 o superior** (usa el módulo `node:sqlite` integrado).

```bash
npm install
npm start          # http://localhost:3000
npm test           # pruebas de reglas, economía, anti-trampas y API
```

Variables de entorno:

| Variable | Por defecto | |
|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | |
| `DB_PATH` | `data/a-fuego.db` | Archivo SQLite |
| `AUTH_SECRET` | aleatorio en desarrollo | **Obligatorio en producción** (≥ 32 caracteres) |
| `TOKEN_TTL_SEC` | 30 días | |
| `RATE_LIMIT_PER_MIN` | `120` | |
| `MAX_CHEAT_STRIKES` | `5` | |

### Microapp para el celular (sin servidor)

`npm run build:static` genera `dist/`: un `index.html` con todo el juego dentro, más
manifiesto, iconos y service worker. Se instala en la pantalla de inicio y funciona sin
conexión. Ejecuta el mismo motor de `/shared` en el navegador y guarda el progreso en el
dispositivo (sin ranking global ni protección anti-trampas del servidor).

Cada push a `main` la publica en GitHub Pages con `.github/workflows/pages.yml`
(requiere **Settings → Pages → Source: GitHub Actions**):
**https://gllm57.github.io/a-fuego/**
