// Ilustración propia para cada uno de los 40 ingredientes (lienzo de 48×48).
// Estilo "pegatina": contorno cálido oscuro, sombra interior y un brillo.

const K = 'stroke="#3B2416" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
const shine = (x, y, rx = 3, ry = 2, r = -30) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})" fill="#fff" opacity=".6"/>`;
const shadow = `<ellipse cx="24" cy="43" rx="15" ry="2.6" fill="#3B2416" opacity=".13"/>`;

export const FOOD = {
  tortilla: `${shadow}
    <ellipse cx="24" cy="31" rx="19" ry="8" fill="#D9B26F" ${K}/>
    <ellipse cx="24" cy="26" rx="19" ry="8" fill="#F2D49B" ${K}/>
    <ellipse cx="24" cy="21" rx="19" ry="8" fill="#F7DFAE" ${K}/>
    <circle cx="16" cy="20" r="1.6" fill="#B98443"/><circle cx="27" cy="18" r="1.3" fill="#B98443"/><circle cx="31" cy="23" r="1.8" fill="#C99555"/><circle cx="21" cy="24" r="1.1" fill="#B98443"/>`,

  carne_res: `${shadow}
    <path d="M8 22c1-9 12-14 23-12 10 2 13 10 10 18-3 9-13 13-22 11C10 37 7 30 8 22z" fill="#F3D3C4" ${K}/>
    <path d="M12 22c1-6 10-10 19-9 7 1 10 7 8 13-2 7-10 10-18 9-6-1-10-6-9-13z" fill="#B0402C"/>
    <path d="M16 21c4-2 8 1 12-1M15 27c5-1 9 2 14 0M20 32c3 0 6 1 9 0" stroke="#E7A08D" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <circle cx="32" cy="20" r="3.2" fill="#FFF6EA" ${K}/>
    ${shine(18, 17)}`,

  pollo: `${shadow}
    <path d="M29 28l9 9" stroke="#3B2416" stroke-width="7" stroke-linecap="round"/>
    <path d="M29 28l9 9" stroke="#FFF6EA" stroke-width="4.2" stroke-linecap="round"/>
    <circle cx="40" cy="36" r="3.4" fill="#FFF6EA" ${K}/><circle cx="37" cy="40" r="3.4" fill="#FFF6EA" ${K}/>
    <path d="M9 18c2-9 14-13 21-6 7 6 5 16-3 19-8 3-19 1-18-13z" fill="#E7A766" ${K}/>
    <path d="M12 23c4 4 11 5 16 2" stroke="#C47F3E" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${shine(16, 14, 4, 2.4)}`,

  cerdo: `${shadow}
    <path d="M10 18c4-8 18-10 26-4 7 6 5 18-3 22-9 4-22 2-24-6-1-4-1-8 1-12z" fill="#FFF0E6" ${K}/>
    <path d="M14 19c4-6 15-7 21-2 5 5 3 13-3 16-7 3-16 2-18-4-1-3-1-7 0-10z" fill="#EE9C86"/>
    <path d="M30 14l6 4" stroke="#FFF6EA" stroke-width="4" stroke-linecap="round"/>
    <path d="M18 24c4 1 8-1 11 1" stroke="#F8C5B6" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    ${shine(18, 18)}`,

  pescado: `${shadow}
    <path d="M37 24l8-8v16z" fill="#7F9BB4" ${K}/>
    <path d="M5 24c5-10 20-13 32-1v2C25 36 10 34 5 24z" fill="#B9CCDD" ${K}/>
    <path d="M7 25c6 5 17 6 28 0" fill="#E6EEF5"/>
    <path d="M17 15c3 2 4 5 3 8" stroke="#7F9BB4" stroke-width="1.6" fill="none"/>
    <path d="M22 20l3 3-3 3M27 20l3 3-3 3" stroke="#8FA9C0" stroke-width="1.3" fill="none"/>
    <circle cx="12" cy="22" r="2.4" fill="#fff" ${K}/><circle cx="12.5" cy="22" r="1" fill="#3B2416"/>`,

  camaron: `${shadow}
    <path d="M33 11c-12-3-24 4-24 15 0 8 7 13 14 12" fill="none" stroke="#3B2416" stroke-width="12.5" stroke-linecap="round"/>
    <path d="M33 11c-12-3-24 4-24 15 0 8 7 13 14 12" fill="none" stroke="#F4895F" stroke-width="9.5" stroke-linecap="round"/>
    <path d="M17 13l2 6M11 20l5 3M10 28l5 0M14 34l4-3" stroke="#D45E35" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M23 38l7 4 1-7z" fill="#E8693F" ${K}/>
    <path d="M34 9c4-3 8-3 10-1M33 13c4 0 7 1 9 4" stroke="#3B2416" stroke-width="1.2" fill="none"/>
    <circle cx="31" cy="12" r="1.3" fill="#3B2416"/>`,

  salmon: `${shadow}
    <path d="M6 30c4-12 18-20 34-18 3 9-3 21-16 25-9 3-16 0-18-7z" fill="#FA8B5F" ${K}/>
    <path d="M12 31c6-6 13-11 22-14M15 35c6-5 13-9 21-12M10 26c5-5 11-9 18-11" stroke="#FFD9C4" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M6 30c3 5 9 8 16 7" stroke="#E8E4DE" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,

  atun: `${shadow}
    <rect x="8" y="12" width="32" height="26" rx="9" fill="#B82E42" ${K}/>
    <rect x="8" y="30" width="32" height="8" rx="4" fill="#8E2433"/>
    <path d="M14 19c5 2 15 2 20 0M14 25c5 2 15 2 20 0" stroke="#D96477" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    ${shine(15, 16)}`,

  salchicha: `${shadow}
    <path d="M10 33c-3-4 0-8 4-9 8-2 16-7 21-12 3-3 8-1 8 3 0 3-2 5-4 7-6 6-14 10-24 13-2 1-4 0-5-2z" fill="#C0583A" ${K}/>
    <path d="M14 30c8-2 15-7 21-13" stroke="#E08568" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M8 34l-3 3M43 13l3-3" stroke="#3B2416" stroke-width="2" stroke-linecap="round"/>`,

  tocino: `${shadow}
    <path d="M5 30c6-7 10 3 16-4s10 3 16-4c3-3 5-4 7-3l-1 8c-6 5-9-4-15 3s-11-3-17 4c-2 2-5 2-6 0z" fill="#E7A08D" ${K}/>
    <path d="M7 32c6-6 10 2 15-4s10 3 15-4" stroke="#B9473A" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M8 27c5-5 9 2 14-3" stroke="#FFE3D6" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,

  huevo: `${shadow}
    <path d="M24 6c8 0 14 12 14 21s-6 14-14 14-14-5-14-14S16 6 24 6z" fill="#FFF6E0" ${K}/>
    <path d="M14 30c2 6 6 9 10 9s9-3 10-8" stroke="#E7D8B5" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    ${shine(19, 15, 3, 5, 20)}`,

  queso: `${shadow}
    <path d="M5 33l31-19c4 2 7 6 7 10v12H5z" fill="#FFC94A" ${K}/>
    <path d="M5 33h38v6H5z" fill="#E0A21C" ${K}/>
    <circle cx="30" cy="27" r="3" fill="#E9AE2A"/><circle cx="38" cy="30" r="2" fill="#E9AE2A"/><circle cx="20" cy="30" r="1.8" fill="#E9AE2A"/><circle cx="34" cy="21" r="1.4" fill="#E9AE2A"/>`,

  mozzarella: `${shadow}
    <circle cx="24" cy="26" r="15" fill="#FFFDF5" ${K}/>
    <path d="M12 31c4 6 18 7 24 0" stroke="#EFE3C6" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M27 8c5-3 10-1 11 3-4 2-9 1-11-3z" fill="#3E9A50" ${K}/>
    ${shine(18, 19, 4, 2.6)}`,

  leche: `${shadow}
    <path d="M14 16l10-8 10 8v25H14z" fill="#fff" ${K}/>
    <path d="M14 16l10-8 10 8" fill="#9EC5E8" ${K}/>
    <path d="M14 24h20v10H14z" fill="#5E9BD6"/>
    <path d="M18 29c2-2 4 2 6 0s4 2 6 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M24 8v8" stroke="#3B2416" stroke-width="1.2"/>`,

  tomate: `${shadow}
    <path d="M24 12c10 0 17 7 17 15s-7 14-17 14S7 35 7 27s7-15 17-15z" fill="#E8452C" ${K}/>
    <path d="M10 30c3 6 9 9 16 9" stroke="#B32D18" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M24 14l-5-4 4 1 1-5 1 5 4-1-5 4 6 0-6 2z" fill="#3E9A50" ${K}/>
    ${shine(15, 20, 4, 2.6)}`,

  cebolla: `${shadow}
    <path d="M24 9c3 4 15 9 15 19 0 8-7 13-15 13S9 36 9 28c0-10 12-15 15-19z" fill="#D7B4E6" ${K}/>
    <path d="M24 13c-5 6-7 15-4 27M24 13c5 6 7 15 4 27" stroke="#A97CC0" stroke-width="1.5" fill="none"/>
    <path d="M24 9c0-3 1-5 3-6" stroke="#5E9E4A" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M21 41l-2 3M27 41l2 3M24 41v3" stroke="#3B2416" stroke-width="1.2"/>
    ${shine(16, 22)}`,

  cilantro: `${shadow}
    <path d="M24 42V24M24 30l-9-8M24 28l9-9" stroke="#2A7535" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M15 22c-5-1-7-6-3-9 2 3 5 3 6 0 3 3 2 8-3 9z" fill="#4CAF50" ${K}/>
    <path d="M33 19c5 0 8-5 4-8-2 3-5 3-6 0-3 3-2 7 2 8z" fill="#4CAF50" ${K}/>
    <path d="M24 24c-4-1-6-6-2-9 1 2 3 2 4 0 3 3 2 8-2 9z" fill="#5DBB5F" ${K}/>`,

  aguacate: `${shadow}
    <path d="M24 5c8 4 15 15 15 23a15 15 0 0 1-30 0c0-8 7-19 15-23z" fill="#3E5E1A" ${K}/>
    <path d="M24 9c6 4 12 13 12 19a12 12 0 0 1-24 0c0-6 6-15 12-19z" fill="#C9E07A"/>
    <circle cx="24" cy="30" r="6.5" fill="#8D5A2B" ${K}/>
    ${shine(22, 28, 2, 1.4)}`,

  lechuga: `${shadow}
    <path d="M24 9c5-3 10 0 11 4 4 0 7 4 6 8 3 3 2 8-1 10 0 5-5 9-10 8-3 3-9 3-12 0-5 1-10-3-10-8-3-2-4-7-1-10-1-4 2-8 6-8 1-4 6-7 11-4z" fill="#8BC34A" ${K}/>
    <path d="M24 13c-1 8-1 16 0 25M24 22l-7-5M24 22l7-5M24 30l-8-4M24 30l8-4" stroke="#5E8F28" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    ${shine(16, 16)}`,

  chile: `${shadow}
    <path d="M30 13c-4 1-6 6-8 12-3 7-8 12-14 14 7 2 18-2 23-9 4-6 4-14-1-17z" fill="#D32F2F" ${K}/>
    <path d="M28 12c2-3 5-4 8-3-1 2-3 4-6 5z" fill="#2E7D32" ${K}/>
    <path d="M33 9c1-3 3-5 6-5" stroke="#2E7D32" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${shine(27, 20, 1.6, 4, 25)}`,

  aji: `${shadow}
    <path d="M30 13c-4 1-6 6-8 12-3 7-8 12-14 14 7 2 18-2 23-9 4-6 4-14-1-17z" fill="#F4A300" ${K}/>
    <path d="M28 12c2-3 5-4 8-3-1 2-3 4-6 5z" fill="#2E7D32" ${K}/>
    <path d="M33 9c1-3 3-5 6-5" stroke="#2E7D32" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${shine(27, 20, 1.6, 4, 25)}`,

  limon: `${shadow}
    <circle cx="24" cy="25" r="16" fill="#7FB52E" ${K}/>
    <circle cx="24" cy="25" r="12.5" fill="#E6F49A"/>
    <path d="M24 13v24M12 25h24M16 17l16 16M32 17L16 33" stroke="#B5D33A" stroke-width="1.6"/>
    <circle cx="24" cy="25" r="2" fill="#F4FAD0"/>`,

  pina: `${shadow}
    <path d="M24 16c-3-4-7-6-10-5 2 2 4 4 5 6-3-2-6-2-8-1 3 2 6 3 9 3M24 16c3-4 7-6 10-5-2 2-4 4-5 6 3-2 6-2 8-1-3 2-6 3-9 3M24 17c0-5-1-9-2-12 3 2 4 6 4 12" fill="#3E9A50" ${K}/>
    <rect x="13" y="18" width="22" height="24" rx="11" fill="#F7C948" ${K}/>
    <path d="M15 25l14 14M14 32l9 9M19 20l15 15M27 20l7 7M33 25l-14 14M34 32l-9 9M29 20L14 35M21 20l-7 7" stroke="#C99A12" stroke-width="1.3"/>`,

  papa: `${shadow}
    <path d="M10 22c2-8 12-11 20-9s12 9 10 16-11 11-19 10-13-9-11-17z" fill="#D9B26F" ${K}/>
    <circle cx="18" cy="21" r="1.4" fill="#9C7438"/><circle cx="30" cy="19" r="1.2" fill="#9C7438"/><circle cx="27" cy="31" r="1.5" fill="#9C7438"/><circle cx="16" cy="30" r="1.1" fill="#9C7438"/>
    ${shine(17, 16, 3.5, 2)}`,

  camote: `${shadow}
    <path d="M7 30c0-6 10-13 22-16 8-2 13 1 12 5-1 6-11 14-23 17-7 2-11 0-11-6z" fill="#B8573A" ${K}/>
    <path d="M10 31c4-4 13-10 25-13" stroke="#E07B52" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M41 18l4-3M7 30l-3 2" stroke="#3B2416" stroke-width="1.6" stroke-linecap="round"/>`,

  maiz: `${shadow}
    <path d="M24 6c6 0 9 8 9 17s-3 17-9 17-9-8-9-17 3-17 9-17z" fill="#F4C430" ${K}/>
    <path d="M18 12h12M16 18h16M15 24h18M16 30h16M18 36h12M21 7v32M27 7v32" stroke="#D9A514" stroke-width="1.3"/>
    <path d="M15 22c-5 4-6 12-2 19 4-2 8-5 10-9M33 22c5 4 6 12 2 19-4-2-8-5-10-9" fill="#7DB343" ${K}/>`,

  frijol: `${shadow}
    ${[[16, 30, -20], [28, 32, 15], [22, 22, 30], [32, 22, -10], [13, 21, 10]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><path d="M${x - 7} ${y}c0-5 4-7 7-6 2 0 3 2 5 2s3-1 3 2c0 5-4 8-9 8-4 0-6-3-6-6z" fill="#7A3B2B" stroke="#3B2416" stroke-width="1.4"/><ellipse cx="${x - 2}" cy="${y - 2}" rx="2" ry="1" fill="#fff" opacity=".45"/></g>`).join('')}`,

  pepino: `${shadow}
    <rect x="5" y="17" width="32" height="13" rx="6.5" transform="rotate(-20 21 23)" fill="#3F8A35" ${K}/>
    <path d="M10 28l2-1M16 25l2-1M22 22l2-1M27 20l2-1" stroke="#9BD27E" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="36" cy="31" r="8" fill="#3F8A35" ${K}/>
    <circle cx="36" cy="31" r="6" fill="#D7EFB8"/>
    <circle cx="34" cy="30" r=".9" fill="#9BBF6A"/><circle cx="38" cy="30" r=".9" fill="#9BBF6A"/><circle cx="36" cy="33" r=".9" fill="#9BBF6A"/>`,

  champinon: `${shadow}
    <path d="M19 26h10l2 13c0 2-2 3-7 3s-7-1-7-3z" fill="#F3EADB" ${K}/>
    <path d="M6 26C6 14 15 8 24 8s18 6 18 18c-4 2-30 2-36 0z" fill="#C49A6C" ${K}/>
    <circle cx="16" cy="17" r="2.6" fill="#E9D3B6"/><circle cx="29" cy="14" r="2" fill="#E9D3B6"/><circle cx="34" cy="21" r="1.6" fill="#E9D3B6"/>`,

  albahaca: `${shadow}
    <path d="M24 42c0-8 0-14 0-18" stroke="#1D5E3A" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M24 26C14 26 8 18 10 9c9 0 15 7 14 17z" fill="#2E8B57" ${K}/>
    <path d="M24 26c10 0 16-8 14-17-9 0-15 7-14 17z" fill="#3FA56B" ${K}/>
    <path d="M24 26c-4-4-8-9-10-14M24 26c4-4 8-9 10-14" stroke="#1D5E3A" stroke-width="1.3" fill="none"/>`,

  alga: `${shadow}
    <rect x="9" y="8" width="30" height="32" rx="4" fill="#24402F" ${K}/>
    <path d="M9 16h30M9 24h30M9 32h30" stroke="#3E6A50" stroke-width="1.3"/>
    <path d="M13 11l10 10" stroke="#5E8C70" stroke-width="2" stroke-linecap="round" opacity=".7"/>`,

  tofu: `${shadow}
    <path d="M10 18l14-7 14 7v15l-14 7-14-7z" fill="#F4F1E8" ${K}/>
    <path d="M10 18l14 7 14-7M24 25v15" fill="none" ${K}/>
    <path d="M10 18l14 7v15l-14-7z" fill="#E6E0CE"/>
    <path d="M10 18l14 7v15l-14-7z" fill="none" ${K}/>`,

  arroz: `${shadow}
    <path d="M7 24h34c0 10-8 17-17 17S7 34 7 24z" fill="#E8452C" ${K}/>
    <path d="M10 30c5 4 23 4 28 0" stroke="#fff" stroke-width="1.8" fill="none" opacity=".6"/>
    <path d="M9 24c0-8 7-13 15-13s15 5 15 13z" fill="#FFFDF7" ${K}/>
    ${[[15, 19], [20, 15], [26, 14], [31, 18], [23, 20], [18, 22], [29, 22]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="1" fill="#E6DFCC"/>`).join('')}`,

  pasta: `${shadow}
    <path d="M24 24l-14-9c-3 4-3 14 0 18zM24 24l14-9c3 4 3 14 0 18z" fill="#F5DC9A" ${K}/>
    <path d="M13 18l3 12M17 20l1 9M35 18l-3 12M31 20l-1 9" stroke="#D4B66A" stroke-width="1.3"/>
    <rect x="20" y="19" width="8" height="10" rx="4" fill="#E8C66F" ${K}/>`,

  fideos: `${shadow}
    <path d="M7 24h34c0 10-8 17-17 17S7 34 7 24z" fill="#2E2019" ${K}/>
    <path d="M10 24c3-6 4 0 7-6s4 0 7-6 4 0 7-6 4 0 7 6" stroke="#F2CF7A" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M12 24c3-4 5 2 8-3s5 2 8-3 5 2 8 2" stroke="#E2B856" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M34 4l-6 20M40 6l-9 18" stroke="#B98443" stroke-width="2.2" stroke-linecap="round"/>`,

  harina: `${shadow}
    <path d="M11 41c-2-11 1-23 6-28h14c5 5 8 17 6 28z" fill="#F5EFE6" ${K}/>
    <path d="M17 13l-2-5 5 3 4-4 4 4 5-3-2 5" fill="#E9DDC6" ${K}/>
    <rect x="15" y="24" width="18" height="10" rx="5" fill="#E8452C" opacity=".85"/>
    <path d="M20 29h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,

  pan: `${shadow}
    <path d="M6 30c0-12 8-19 18-19s18 7 18 19c0 6-4 9-18 9S6 36 6 30z" fill="#E0A040" ${K}/>
    <path d="M15 20l4 6M23 17l3 7M31 19l3 6" stroke="#B07424" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M9 33c5 3 25 3 30 0" stroke="#C98A3A" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${shine(15, 17, 4, 2)}`,

  fresa: `${shadow}
    <path d="M24 42C11 34 7 24 11 17c3-4 8-4 13-2 5-2 10-2 13 2 4 7 0 17-13 25z" fill="#E2394B" ${K}/>
    <path d="M14 14l6 3 4-7 4 7 6-3-3 6H17z" fill="#3E9A50" ${K}/>
    ${[[18, 24], [25, 22], [31, 26], [21, 31], [27, 33], [16, 29], [24, 38]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx=".9" ry="1.3" fill="#FFE3A3"/>`).join('')}
    ${shine(16, 21, 2.4, 1.6)}`,

  miel: `${shadow}
    <rect x="10" y="16" width="28" height="25" rx="9" fill="#F2A93B" ${K}/>
    <rect x="12" y="9" width="24" height="8" rx="3" fill="#B9473A" ${K}/>
    <path d="M10 22c4 3 7-2 10 2s6-3 9 1 6-2 9 0" stroke="#C27C16" stroke-width="2" fill="none"/>
    <path d="M17 26h14v8H17z" fill="#FFF3D6" rx="2"/>
    <path d="M20 30h8" stroke="#C27C16" stroke-width="1.6" stroke-linecap="round"/>
    ${shine(15, 33, 1.6, 3.5, 0)}`,

  chocolate: `${shadow}
    <rect x="8" y="8" width="26" height="32" rx="3" fill="#5C3317" ${K}/>
    <path d="M8 16.5h26M8 24.5h26M8 32.5h26M17 8v32M25.5 8v32" stroke="#3A1E0B" stroke-width="1.4"/>
    <path d="M22 20l18 4v16H22z" fill="#E8452C" ${K}/>
    <path d="M22 26l18 3" stroke="#FFC23D" stroke-width="2"/>
    ${shine(12, 12, 2, 1.2)}`
};
