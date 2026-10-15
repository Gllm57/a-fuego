# ¡A Fuego!

Juego de cocina para celular: atiende clientes, prepara sus platos con gestos simples y
usa las propinas para construir tu cadena de restaurantes.

## El juego

- **Servicio de 2 minutos** en un local ilustrado: clientes frente a la barra con su
  pedido en un globo y un anillo de paciencia, la comanda de papel, fogones redondos y
  una repisa de frascos con la despensa.
- Toca un cliente → toca los frascos resaltados → toca los fogones: **cortar** y **batir**
  con toques; **freír**, **hornear** y **hervir** se cocinan solos y hay que recogerlos a
  tiempo (la sartén y el horno queman). Recoger justo a tiempo da **¡Perfecto!**.
- **Eventos dentro del servicio:** ¡fuego en la sartén o el horno! (tócalo rápido para
  apagarlo; lo que había se pierde), **hora pico** (llegan clientes sin parar) y
  **críticos gastronómicos** con boina: pagan el doble y tienen poca paciencia.
- **Combos** hasta ×1.5 si nadie se va enojado.
- **40 recetas** en 5 restaurantes (mexicana, americana, italiana, japonesa y peruana).

### Economía (difícil a propósito)

- **Mercado:** sólo cocinas con lo que compraste. Precios que cambian cada día (±25 %),
  3 ofertas diarias al −40 %, −10 % comprando 10 o más, y una **canasta gratis** al día (12 ingredientes).
- **Despensa limitada** (60 lugares; el refrigerador suma 25 por nivel). El botón **Surtir**
  arma el carrito con lo que falta para un servicio completo.
- **Pedido urgente:** si algo se agota en pleno servicio, toca su frasco: llegan 2 unidades
  en 3 segundos al doble de precio (máximo 12 por servicio). Lo quemado, lo que queda
  en el plato de un cliente que se fue y lo que sobra a medio preparar se desperdicia.
- **Gastos del local** por servicio (60 → 280 según el restaurante).
- Propinas y combos moderados; el servidor recalcula todo y rechaza servir más platos
  de los que alcanzan con la despensa.

### Para qué sirve el dinero

La meta es construir la cadena **¡A Fuego!** y llegar a **Chef Leyenda** (100 % del imperio):

| Inversión | Efecto |
|---|---|
| Ingredientes del mercado | Sin ellos no hay servicio |
| Abrir restaurantes (2.500 → 22.000) | Nueva cocina con 8 recetas; platos más caros |
| Aprender recetas (250 → 7.500) | El plato entra al menú; mejor margen |
| Mejoras de cocina | Más rápido, menos toques, más tiempo antes de quemarse, clientes más pacientes, más mesas, despensa más grande |
| Equipo extra (nivel 3 → 7) | Segunda tabla, bol, sartén, olla y horno: cocinar dos cosas iguales a la vez |

### Pantallas

Antes de cada servicio: tutorial ilustrado (la primera vez) y **parte del día** con una línea
de tiempo de la hora pico, los incendios y los críticos. Inicio (imperio, siguiente meta,
restaurantes en arco, reto del día) · **Mercado** ·
Recetario · Mejoras · **Diario de caja** (ganancias y gastos de cada servicio) · Ranking
semanal · Cocina · Cierre de caja.

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
| GET | `/me/runs` | Diario de caja (servicios con ganancias y gastos) |
| GET | `/market` | Precios del día, despensa, capacidad y canasta |
| POST | `/market/buy` | Compra ingredientes `{items: {tomate: 5}}` |
| POST | `/market/basket` | Recoge la canasta gratis del día |
| GET | `/catalog` | Catálogo completo |
| POST | `/shop/purchase` | Compra `{kind: restaurant\|recipe\|upgrade, id}` |
| POST | `/runs` | Empieza un servicio `{restaurantId, mode: normal\|daily}` |
| POST | `/runs/:id/complete` | Envía platos servidos y desperdicio; descuenta la despensa y cobra |
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

**Prueba del nivel máximo** (Cevichería sin mejoras, ritmo de reto diario):
**https://gllm57.github.io/a-fuego/nivel-maximo/** — se genera con `npm run build:demo`.

**Publicada con GitHub Pages** desde la raíz de `main`: **https://gllm57.github.io/a-fuego/**
(Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`).

Para actualizarla después de cambiar el código:

```bash
npm run build:pages   # regenera index.html, manifiesto e iconos en la raíz
git add -A && git commit -m "Actualizar microapp" && git push
```
