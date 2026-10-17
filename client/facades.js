// Fachadas de los restaurantes en Inicio, con el mismo estilo "pegatina" que los alimentos
// (contorno café oscuro, sombra interior y brillos). Cada cocina tiene su propia
// arquitectura: casa colonial, adobe, diner retro, casita italiana, izakaya, caseta del
// muelle, estancia de la pampa y hanok coreano.
// Etapas (ver facadeStage en shared/economy.js):
//   0 en obra · 1 recién abierto · 2 con clientela · 3 local leyenda.
// La fachada se ve completa desde que se abre; la etapa leyenda sólo suma la estrella.

const INK = '#3B2416';
const K = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const K2 = `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;
const shine = (x, y, rx = 9, ry = 3.5, r = -20) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})" fill="#fff" opacity=".55"/>`;
const pot = (x, leaf = '#5E9E4A', w = 15) => `<circle cx="${x - 6}" cy="${206}" r="${w * 0.7}" fill="${shade(leaf)}" ${K2}/><circle cx="${x + 5}" cy="${203}" r="${w * 0.8}" fill="${leaf}" ${K2}/>${shine(x + 1, 197, 4, 2)}<path d="M${x - 12} 232l3-18h18l3 18z" fill="#C2683A" ${K2}/><path d="M${x - 10} 218h20" stroke="#9C4E28" stroke-width="2.4"/>`;
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.round(v * 0.78));
  return `#${[c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Banderín tricolor con el arco de estrellas (letrero de la arepera).
const TRICOLOR = `<path d="M124 26h52a8 8 0 0 1 8 8v6h-68v-6a8 8 0 0 1 8-8z" fill="#F2C200"/><rect x="116" y="40" width="68" height="13" fill="#1C4E9C"/><path d="M116 53h68v6a8 8 0 0 1-8 8h-52a8 8 0 0 1-8-8z" fill="#C8102E"/>${[[138.2, 52], [140.6, 48.5], [143.9, 46], [147.9, 44.7], [152.1, 44.7], [156.1, 46], [159.4, 48.5], [161.8, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#fff"/>`).join('')}<rect x="116" y="26" width="68" height="41" rx="8" fill="none" ${K}/>`;

const FACADES = {
  // Casa colonial: techo de tejas, ventanas con rejas de madera, portón y buganvilla.
  arepera: {
    star: [240, 64],
    draw: () => `
      <rect x="48" y="98" width="204" height="134" fill="#FFF4E2" ${K}/>
      <rect x="216" y="100" width="34" height="130" fill="#4A2270" opacity=".08"/>
      ${shine(78, 112, 14, 4)}
      <path d="M30 104L150 46l120 58z" fill="#C2683A" ${K}/>
      <path d="M62 89L150 47l88 42M94 74l56-27 56 27" stroke="#9C4E28" stroke-width="3" fill="none"/>
      <path d="M78 96l-4 8M106 82l-4 8M134 68l-3 8M166 68l3 8M194 82l4 8M222 96l4 8" stroke="#9C4E28" stroke-width="2.4"/>
      <rect x="26" y="100" width="248" height="10" rx="5" fill="#A65427" ${K}/>
      <g transform="translate(150 133) scale(.62) translate(-150 -46)">${TRICOLOR}</g>
      <path d="M140 118v-8M160 118v-8" stroke="${INK}" stroke-width="2"/>
      ${[70, 194].map((x) => `<rect x="${x}" y="150" width="36" height="50" rx="4" fill="#EADCF6" ${K}/>${shine(x + 10, 160, 5, 2.5)}<path d="M${x + 7} 150v50M${x + 14} 150v50M${x + 21} 150v50M${x + 28} 150v50" stroke="#8E4A26" stroke-width="3"/><rect x="${x - 6}" y="198" width="48" height="7" rx="3" fill="#8E4A26" ${K2}/><path d="M${x - 4} 150h44" stroke="#7B3FA6" stroke-width="6" stroke-linecap="round"/>`).join('')}
      <path d="M126 232v-60a24 24 0 0 1 48 0v60z" fill="#8E4A26" ${K}/>
      <path d="M150 148v84M134 180h32M134 206h32" stroke="#6E3618" stroke-width="2.4"/>
      <circle cx="144" cy="194" r="3" fill="#FFC23D" ${K2}/><circle cx="156" cy="194" r="3" fill="#FFC23D" ${K2}/>
      ${shine(140, 166, 4, 8, 0)}
      <path d="M48 232c-6-30-2-64 8-96" stroke="#3E7A34" stroke-width="3" fill="none"/>
      ${[[52, 132, '#E2577B'], [44, 150, '#C8336A'], [58, 162, '#F28CA8'], [46, 178, '#E2577B'], [56, 196, '#C8336A'], [44, 210, '#F28CA8']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="8" fill="${c}" ${K2}/><circle cx="${x + 7}" cy="${y + 5}" r="4" fill="#5E9E4A" ${K2}/>`).join('')}
      ${pot(266)}`
  },

  // Adobe con pretil escalonado, franja pintada, papel picado y nopales.
  taqueria: {
    star: [242, 70],
    draw: () => `
      <path d="M44 232V104h26V92h30v12h100V92h30v12h26v128z" fill="#F2C9A0" ${K}/>
      <rect x="226" y="106" width="28" height="124" fill="#8F2414" opacity=".07"/>
      ${[[70, 150], [118, 210], [214, 168], [182, 124]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#D9A877"/>`).join('')}
      <rect x="44" y="112" width="212" height="12" fill="#1E8A5F" ${K2}/>
      <path d="M48 118l6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4 6-4 6 4" stroke="#F2C200" stroke-width="2.4" fill="none"/>
      <path d="M52 94q98 26 196 0" stroke="${INK}" stroke-width="1.6" fill="none"/>
      ${[[70, 99, '#E2577B'], [96, 105, '#F2C200'], [123, 108, '#1E8A5F'], [150, 109, '#5AB4E5'], [177, 108, '#E2577B'], [204, 105, '#F2C200'], [230, 99, '#1E8A5F']].map(([x, y, c]) => `<path d="M${x - 7} ${y - 1}h14l-1 14-6-3-6 3z" fill="${c}" ${K2}/>`).join('')}
      <circle cx="150" cy="148" r="15" fill="#FFC23D" ${K}/>
      <path d="M150 127v-4M150 173v-4M129 148h-4M175 148h-4M135 133l-3-3M165 133l3-3M135 163l-3 3M165 163l3 3" stroke="#F2A900" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M144 146c1-2 3-2 4 0M152 146c1-2 3-2 4 0M144 153c3 3 9 3 12 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      ${[62, 194].map((x) => `<path d="M${x} 206v-36a22 22 0 0 1 44 0v36z" fill="#FDE3D8" ${K}/>${shine(x + 12, 164, 5, 2.5)}<path d="M${x + 22} 148v58M${x} 178h44" stroke="#8F2414" stroke-width="2.6"/><path d="M${x - 4} 206h52" stroke="#D9412B" stroke-width="7" stroke-linecap="round"/>`).join('')}
      <path d="M128 232v-56h44v56z" fill="#8F2414" ${K}/>
      <path d="M128 190h44M128 204h44M128 218h44" stroke="#B8402A" stroke-width="2.4"/>
      <circle cx="164" cy="204" r="3" fill="#FFC23D" ${K2}/>
      <rect x="22" y="182" width="14" height="40" rx="7" fill="#4E8E3A" ${K2}/><path d="M22 204h-8v-14" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M22 204h-8v-14" fill="none" stroke="#4E8E3A" stroke-width="5.5" stroke-linecap="round"/><circle cx="29" cy="180" r="4" fill="#E2577B" ${K2}/><path d="M16 232l3-12h20l3 12z" fill="#C2683A" ${K2}/>
      <rect x="266" y="190" width="13" height="32" rx="6.5" fill="#5E9E4A" ${K2}/><path d="M279 210h7v-10" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M279 210h7v-10" fill="none" stroke="#5E9E4A" stroke-width="4.5" stroke-linecap="round"/><path d="M260 232l3-12h20l3 12z" fill="#C2683A" ${K2}/>`
  },

  // Diner retro: caja redondeada cromada, ventanales con gabinetes y letrero de neón 66.
  diner: {
    star: [254, 92],
    draw: () => `
      <path d="M150 72v40" stroke="${INK}" stroke-width="9"/><path d="M150 72v40" stroke="#C9D4DD" stroke-width="5"/>
      <rect x="98" y="24" width="104" height="50" rx="25" fill="#1B3A85" ${K}/>
      <rect x="106" y="31" width="88" height="36" rx="18" fill="none" stroke="#FF7AB6" stroke-width="2" opacity=".7"/>
      <text x="150" y="60" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="26" fill="#FF7AB6" stroke="#FFD1E6" stroke-width=".8">66</text>
      ${shine(116, 34, 8, 2.5, -10)}
      <rect x="34" y="108" width="232" height="124" rx="28" fill="#F4F1EC" ${K}/>
      <rect x="230" y="112" width="30" height="116" rx="14" fill="#1B3A85" opacity=".07"/>
      <rect x="35" y="168" width="230" height="14" fill="#2F5FD0"/><path d="M35 186h230" stroke="#D9412B" stroke-width="3"/>
      ${shine(66, 118, 18, 4, 0)}
      ${[50, 176].map((x) => `<rect x="${x}" y="122" width="74" height="40" rx="12" fill="#DCE6FB" ${K}/>${shine(x + 14, 132, 7, 2.5)}<path d="M${x + 6} 162v-12a6 6 0 0 1 12 0v12M${x + 56} 162v-12a6 6 0 0 1 12 0v12" fill="#D9412B" ${K2}/><rect x="${x + 26}" y="148" width="22" height="5" rx="2" fill="#C9D4DD" ${K2}/>`).join('')}
      <rect x="128" y="140" width="44" height="92" rx="10" fill="#2F5FD0" ${K}/>
      <circle cx="150" cy="166" r="12" fill="#DCE6FB" ${K2}/>${shine(146, 162, 4, 2)}
      <rect x="160" y="190" width="5" height="18" rx="2.5" fill="#C9D4DD" ${K2}/>
      <path d="M36 218h228v14H36z" fill="#fff"/>
      <path d="M36 218h12v7H36zM60 218h12v7H60zM84 218h12v7H84zM108 218h12v7h-12zM180 218h12v7h-12zM204 218h12v7h-12zM228 218h12v7h-12zM252 218h12v7h-12zM48 225h12v7H48zM72 225h12v7H72zM96 225h12v7H96zM192 225h12v7h-12zM216 225h12v7h-12zM240 225h12v7h-12z" fill="#2A170D"/>
      <rect x="34" y="108" width="232" height="124" rx="28" fill="none" ${K}/>
      ${pot(20)}${pot(280, '#4E8E3A')}`
  },

  // Casita italiana de dos pisos: tejado, postigos verdes, jardineras, toldo a rayas y parra.
  trattoria: {
    star: [236, 46],
    draw: () => `
      <rect x="66" y="64" width="168" height="168" fill="#F6D7A7" ${K}/>
      <rect x="204" y="66" width="28" height="164" fill="#0F4A35" opacity=".08"/>
      ${shine(92, 78, 14, 4)}
      <path d="M52 68L150 26l98 42z" fill="#C2683A" ${K}/><path d="M78 57l72-31 72 31" stroke="#9C4E28" stroke-width="3" fill="none"/>
      <circle cx="150" cy="52" r="10" fill="#F2C94C" ${K2}/><circle cx="147" cy="50" r="2.4" fill="#C8102E"/><circle cx="154" cy="54" r="2.4" fill="#C8102E"/><circle cx="148" cy="56" r="1.8" fill="#2E8B57"/>
      ${[92, 184].map((x) => `<rect x="${x - 12}" y="84" width="24" height="34" rx="3" fill="#D6EEE4" ${K}/>${shine(x - 5, 92, 3.5, 2)}<rect x="${x - 26}" y="84" width="12" height="34" rx="2" fill="#1E7A5A" ${K2}/><rect x="${x + 14}" y="84" width="12" height="34" rx="2" fill="#1E7A5A" ${K2}/><path d="M${x - 23} 92h6M${x - 23} 100h6M${x - 23} 108h6M${x + 17} 92h6M${x + 17} 100h6M${x + 17} 108h6" stroke="#0F4A35" stroke-width="1.6"/><rect x="${x - 16}" y="118" width="32" height="8" rx="3" fill="#8E5A2C" ${K2}/><circle cx="${x - 9}" cy="116" r="4" fill="#C8102E" ${K2}/><circle cx="${x}" cy="114" r="4" fill="#F2C200" ${K2}/><circle cx="${x + 9}" cy="116" r="4" fill="#C8102E" ${K2}/>`).join('')}
      <path d="M72 146h156l-8 22H80z" fill="#1E7A5A" ${K}/>
      <path d="M96 146l-3 22M120 146l-2 22M144 146l-1 22M168 146l1 22M192 146l2 22M214 146l3 22" stroke="#fff" stroke-width="9"/>
      <path d="M72 146h156l-8 22H80z" fill="none" ${K}/>
      <rect x="80" y="178" width="40" height="40" rx="4" fill="#D6EEE4" ${K}/>${shine(90, 186, 5, 2.5)}<path d="M100 178v40M80 198h40" stroke="#0F4A35" stroke-width="2.4"/>
      <path d="M140 232v-38a20 20 0 0 1 40 0v38z" fill="#0F4A35" ${K}/><circle cx="172" cy="212" r="3" fill="#FFC23D" ${K2}/>
      <rect x="194" y="186" width="30" height="46" rx="3" fill="#E2A98A" ${K2}/><path d="M194 198h30M194 210h30M194 222h30M209 186v12M201 198v12M216 210v12" stroke="#F3D4C2" stroke-width="1.6"/>
      <path d="M66 232c-4-40 4-90-2-140" stroke="#3E7A34" stroke-width="3" fill="none"/>
      ${[[64, 104], [70, 128], [62, 156], [70, 184], [64, 208]].map(([x, y]) => `<path d="M${x} ${y}c-8-2-10-10-4-12 2 4 6 6 4 12z" fill="#5E9E4A" ${K2}/><circle cx="${x + 6}" cy="${y + 2}" r="2.6" fill="#7A3B8C"/>`).join('')}
      ${pot(30)}${pot(268, '#4E8E3A')}`
  },

  // Izakaya: techo oscuro de aleros curvos, celosías, cortina noren y faroles rojos.
  izakaya: {
    star: [254, 70],
    draw: () => `
      <rect x="54" y="116" width="192" height="116" fill="#F2E6D0" ${K}/>
      <rect x="216" y="118" width="28" height="112" fill="#6E1229" opacity=".08"/>
      <rect x="54" y="116" width="12" height="116" fill="#6B3A2B" ${K2}/><rect x="234" y="116" width="12" height="116" fill="#6B3A2B" ${K2}/>
      <path d="M58 118L150 82l92 36z" fill="#E8D8BC" ${K2}/><path d="M150 86v30M120 106v12M180 106v12" stroke="#C8B496" stroke-width="2"/>
      <path d="M22 120L150 70l128 50-10 10L150 86 32 130z" fill="#4A2E2A" ${K}/>
      <path d="M56 108L150 72l94 36M90 96l60-23 60 23" stroke="#6B4A44" stroke-width="3" fill="none"/>
      <path d="M22 120c-8-2-12-8-10-16M278 120c8-2 12-8 10-16" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M22 120c-8-2-12-8-10-16M278 120c8-2 12-8 10-16" stroke="#4A2E2A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <rect x="126" y="64" width="48" height="12" rx="5" fill="#2A1C16" ${K2}/>
      ${shine(96, 100, 14, 3, -21)}
      <path d="M66 116h168" stroke="#C8A27A" stroke-width="6"/><path d="M66 116h168" stroke="${INK}" stroke-width="1.4" stroke-dasharray="3 5"/>
      <rect x="124" y="124" width="52" height="20" rx="3" fill="#6B3A2B" ${K2}/><path d="M134 130h10M134 136h8M156 130h10M158 136h8" stroke="#F2E6D0" stroke-width="2.4" stroke-linecap="round"/>
      ${[72, 182].map((x) => `<rect x="${x}" y="150" width="46" height="48" rx="3" fill="#FBF4F1" ${K}/><path d="M${x + 11.5} 150v48M${x + 23} 150v48M${x + 34.5} 150v48M${x} 162h46M${x} 174h46M${x} 186h46" stroke="#8E5A2C" stroke-width="1.6"/>${shine(x + 9, 156, 4, 2)}`).join('')}
      <rect x="126" y="152" width="48" height="80" fill="#3B1A1F" ${K}/>
      <path d="M122 148h56v32h-56z" fill="#1C2A4A" ${K2}/><path d="M140.6 148v32M159.3 148v32" stroke="#F2E6D0" stroke-width="2"/><circle cx="150" cy="164" r="6" fill="#F2E6D0"/>
      ${[[86, 128], [214, 128]].map(([x, y]) => `<path d="M${x} ${y - 6}v6" stroke="${INK}" stroke-width="2"/><ellipse cx="${x}" cy="${y + 12}" rx="11" ry="14" fill="#E8452C" ${K}/><path d="M${x - 10} ${y + 7}h20M${x - 10} ${y + 17}h20" stroke="#B32D18" stroke-width="2"/><rect x="${x - 6}" y="${y - 3}" width="12" height="4" rx="2" fill="#2A170D"/><rect x="${x - 6}" y="${y + 25}" width="12" height="4" rx="2" fill="#2A170D"/>${shine(x - 4, y + 6, 3, 4, 0)}`).join('')}
      <path d="M18 232l3-14h20l3 14z" fill="#6B5444" ${K2}/><circle cx="30" cy="210" r="11" fill="#4E8E3A" ${K2}/>
      <path d="M256 232l3-14h20l3 14z" fill="#6B5444" ${K2}/><circle cx="268" cy="210" r="11" fill="#4E8E3A" ${K2}/>`
  },

  // Caseta de madera en el muelle: tablas pintadas, ojos de buey, salvavidas, red y olas.
  cevicheria: {
    star: [240, 70],
    draw: () => `
      <path d="M44 232v-12h212v12" fill="#8E5A2C" ${K}/>
      <rect x="56" y="118" width="188" height="102" fill="#EAF6F8" ${K}/>
      <path d="M56 136h188M56 154h188M56 172h188M56 190h188M56 208h188" stroke="#BFDDE3" stroke-width="2"/>
      <rect x="214" y="120" width="28" height="98" fill="#7A4A00" opacity=".08"/>
      <path d="M36 124L150 58l114 66z" fill="#C77A00" ${K}/>
      <path d="M64 108l86-50 86 50M92 92l58-34 58 34" stroke="#9C5E00" stroke-width="3" fill="none"/>
      <path d="M126 104c10-12 34-12 44 0-10 12-34 12-44 0z" fill="#5AB4E5" ${K}/><path d="M170 104l10-8v16z" fill="#3F8FC4" ${K2}/><circle cx="136" cy="102" r="2" fill="${INK}"/>${shine(144, 99, 5, 1.6, 0)}
      ${[96, 204].map((x) => `<circle cx="${x}" cy="162" r="20" fill="#9AA7B1" ${K}/><circle cx="${x}" cy="162" r="13" fill="#CDEFF0" ${K2}/>${shine(x - 4, 157, 4, 2.4)}${[0, 90, 180, 270].map((a) => `<circle cx="${(x + 16.5 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(162 + 16.5 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="1.6" fill="#5C6B76"/>`).join('')}`).join('')}
      <rect x="130" y="146" width="40" height="74" rx="4" fill="#7A4A00" ${K}/><path d="M130 170h40M130 194h40" stroke="#5E3800" stroke-width="2"/><circle cx="162" cy="186" r="3" fill="#FFC23D" ${K2}/>
      <circle cx="150" cy="134" r="11" fill="none" stroke="${INK}" stroke-width="9"/><circle cx="150" cy="134" r="11" fill="none" stroke="#E8452C" stroke-width="6" stroke-dasharray="8.6 8.6"/><circle cx="150" cy="134" r="11" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="8.6 8.6" stroke-dashoffset="8.6"/>
      <path d="M56 124l26 48M56 148l14 26M70 124l-14 24M84 124l-28 50" stroke="#B9A07A" stroke-width="1.8"/>
      <path d="M36 222c11-8 22 8 33 0s22 8 33 0 22 8 33 0 22 8 33 0 22 8 33 0 22 8 33 0 22 8 33 0v10H36z" fill="#5AB4E5" ${K}/>
      ${shine(70, 226, 8, 2, 0)}${shine(190, 226, 8, 2, 0)}
      <path d="M262 232v-36" stroke="#8E5A2C" stroke-width="6" stroke-linecap="round"/><path d="M262 196c-10 4-12 14-6 18" stroke="${INK}" stroke-width="2" fill="none"/><ellipse cx="262" cy="190" rx="7" ry="10" fill="#C98B52" ${K2}/>`
  },

  // Estancia: muro de ladrillo, pérgola, chimenea humeante, parrilla en la vereda y tranquera.
  asador: {
    star: [56, 66],
    draw: () => `
      <rect x="206" y="44" width="26" height="62" rx="3" fill="#C2683A" ${K}/><rect x="200" y="38" width="38" height="10" rx="4" fill="#8E4A26" ${K2}/>
      <g class="facade-smoke"><circle cx="222" cy="26" r="8" fill="#DAD4CD" ${K2}/><circle cx="234" cy="12" r="10" fill="#E8E3DD" ${K2}/></g>
      <rect x="50" y="106" width="200" height="126" fill="#F0E2CC" ${K}/>
      <rect x="50" y="184" width="200" height="48" fill="#C98B52" ${K2}/>
      <path d="M50 196h200M50 208h200M50 220h200M70 184v12M100 184v12M130 184v12M160 184v12M190 184v12M220 184v12M85 196v12M115 196v12M175 196v12M205 196v12M235 196v12M70 208v12M100 208v12M190 208v12M220 208v12" stroke="#A86B3A" stroke-width="1.8"/>
      <rect x="222" y="108" width="26" height="76" fill="#1D5687" opacity=".07"/>
      <rect x="38" y="96" width="224" height="14" rx="3" fill="#8E5A2C" ${K}/>
      ${[48, 84, 120, 156, 192, 228].map((x) => `<rect x="${x}" y="90" width="10" height="8" rx="2" fill="#6E4422" ${K2}/>`).join('')}
      <rect x="98" y="52" width="104" height="38" rx="7" fill="#1D5687" ${K}/>
      <rect x="114" y="70" width="52" height="10" rx="3" fill="#2A1C16"/><path d="M120 70v10M130 70v10M140 70v10M150 70v10M160 70v10" stroke="#8A7A6E" stroke-width="1.6"/>
      <path d="M180 82c-10-8-3-20 2-24 0 8 11 10 5 24z" fill="#FFC23D" ${K2}/>
      <path d="M126 70c4-2 6 2 10 0s6 2 10 0" stroke="#B3402A" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M130 90v6M170 90v6" stroke="${INK}" stroke-width="2"/>
      ${[66, 190].map((x) => `<rect x="${x}" y="124" width="44" height="44" rx="3" fill="#DCEEFB" ${K}/>${shine(x + 10, 132, 5, 2.4)}<path d="M${x + 22} 124v44M${x} 146h44" stroke="#1D5687" stroke-width="2.4"/><rect x="${x - 10}" y="124" width="10" height="44" rx="2" fill="#3E8FD0" ${K2}/><rect x="${x + 44}" y="124" width="10" height="44" rx="2" fill="#3E8FD0" ${K2}/>`).join('')}
      <path d="M126 232v-64a4 4 0 0 1 4-4h40a4 4 0 0 1 4 4v64z" fill="#8E5A2C" ${K}/><path d="M138 164v68M150 164v68M162 164v68" stroke="#6E4422" stroke-width="2"/><circle cx="166" cy="200" r="3" fill="#FFC23D" ${K2}/>
      <path d="M8 232v-28M38 232v-28M8 212h30M8 224h30" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M8 232v-28M38 232v-28M8 212h30M8 224h30" stroke="#A86B3A" stroke-width="4" stroke-linecap="round"/>
      <rect x="252" y="200" width="42" height="10" rx="3" fill="#2A1C16" ${K2}/><path d="M256 200v10M264 200v10M272 200v10M280 200v10M288 200v10" stroke="#8A7A6E" stroke-width="1.6"/><path d="M258 210l-4 22M288 210l4 22" stroke="${INK}" stroke-width="4"/>
      <circle cx="266" cy="197" r="3.5" fill="#E8541C" ${K2}/><circle cx="280" cy="196" r="4" fill="#F28C2C" ${K2}/>`
  },

  // Hanok: gran techo de tejas curvo, columnas de madera, celosías de papel, faroles y vasijas.
  coreana: {
    star: [254, 74],
    draw: () => `
      <rect x="44" y="210" width="212" height="22" fill="#B9AA98" ${K}/><path d="M80 210v22M120 210v22M160 210v22M200 210v22M240 210v22M62 221h196" stroke="#9A8A78" stroke-width="1.8"/>
      <rect x="60" y="120" width="180" height="90" fill="#F4EFE2" ${K}/>
      <rect x="214" y="122" width="24" height="86" fill="#07505A" opacity=".08"/>
      ${[60, 140, 230].map((x) => `<rect x="${x}" y="120" width="10" height="90" fill="#8E4A26" ${K2}/>`).join('')}
      <path d="M10 118c40 0 60-40 140-46 80 6 100 46 140 46-12 12-36 12-52 4-18-24-46-34-88-36-42 2-70 12-88 36-16 8-40 8-52-4z" fill="#2E3A40" ${K}/>
      <path d="M36 112c30-6 50-34 114-38 64 4 84 32 114 38" stroke="#56656C" stroke-width="3" fill="none" stroke-dasharray="6 5"/>
      <path d="M100 82c16-7 32-10 50-10s34 3 50 10" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M100 82c16-7 32-10 50-10s34 3 50 10" stroke="#1C2328" stroke-width="5.5" fill="none" stroke-linecap="round"/>
      ${shine(90, 100, 14, 3, -16)}
      <circle cx="150" cy="96" r="13" fill="#fff" ${K}/><path d="M139 96a11 11 0 0 1 22 0 5.5 5.5 0 0 1-11 0 5.5 5.5 0 0 0-11 0z" fill="#C8102E"/><path d="M139 96a5.5 5.5 0 0 0 11 0 5.5 5.5 0 0 1 11 0 11 11 0 0 1-22 0z" fill="#1C4E9C"/>
      ${[78, 166].map((x) => `<rect x="${x}" y="136" width="52" height="56" rx="2" fill="#FFFDF4" ${K}/><path d="M${x + 13} 136v56M${x + 26} 136v56M${x + 39} 136v56M${x} 150h52M${x} 164h52M${x} 178h52" stroke="#8E4A26" stroke-width="1.6"/>${shine(x + 10, 142, 4, 2)}`).join('')}
      <path d="M136 210v-60h28v60z" fill="#07505A" ${K}/><path d="M150 150v60M136 172h28M136 192h28" stroke="#F4EFE2" stroke-width="1.6"/>
      ${[[82, 124, '#C8102E'], [218, 124, '#1C4E9C']].map(([x, y, c]) => `<path d="M${x} ${y}v8" stroke="${INK}" stroke-width="2"/><rect x="${x - 9}" y="${y + 8}" width="18" height="24" rx="6" fill="#F4EFE2" stroke="${c}" stroke-width="3"/><rect x="${x - 9}" y="${y + 8}" width="18" height="24" rx="6" fill="none" ${K2}/>`).join('')}
      ${[[24, 224], [276, 224]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="17" ry="10" fill="#7A5640" ${K}/><ellipse cx="${x}" cy="${y - 8}" rx="11" ry="4" fill="#9C7458" ${K2}/>${shine(x - 6, y - 2, 4, 2)}`).join('')}`
  }
};

// Local leyenda: sólo la estrella dorada.
const legend = (d, [x, y]) => `<g class="facade-star"><circle cx="${x}" cy="${y}" r="17" fill="#FFC23D" ${K}/><path d="M${x} ${y - 11}l3.4 7 7.6 1.1-5.5 5.4 1.3 7.6-6.8-3.6-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z" fill="#fff"/>${shine(x - 6, y - 8, 4, 2)}</g>`;

export function storefrontSvg(theme, id = 'arepera', { stage = 1 } = {}) {
  if (stage === 0) return obraSvg(theme);
  const d = theme.deep;
  const f = FACADES[id] ?? FACADES.arepera;
  return `<svg viewBox="0 0 300 240" aria-hidden="true">
    <ellipse cx="150" cy="234" rx="140" ry="10" fill="${d}" opacity=".18"/>
    ${f.draw()}
    ${stage >= 3 ? legend(d, f.star) : ''}
  </svg>`;
}

// Local sin abrir: una casa en obra, con andamios, grúa, conos y el letrero.
export function obraSvg(theme) {
  const d = theme.deep;
  return `<svg viewBox="0 0 300 240" aria-hidden="true">
    <ellipse cx="150" cy="234" rx="140" ry="10" fill="${d}" opacity=".16"/>
    <rect x="50" y="100" width="200" height="132" fill="#FFF8EE" ${K}/>
    <path d="M38 104L150 54l112 50z" fill="#EFE6DA" stroke="${d}" stroke-width="3" stroke-dasharray="10 7" stroke-linejoin="round"/>
    <g class="obra-scaffold">
      <path d="M30 232V70M270 232V70M30 120h240M30 176h240M30 70h240" stroke="${INK}" stroke-width="8"/>
      <path d="M30 232V70M270 232V70M30 120h240M30 176h240M30 70h240" stroke="#E0B455" stroke-width="5"/>
      <path d="M30 120l60 56M90 120l-60 56M210 120l60 56M270 120l-60 56" stroke="#C99A3A" stroke-width="3"/>
      <rect x="26" y="114" width="248" height="9" rx="2" fill="#8E5A2C" ${K2}/><rect x="26" y="170" width="248" height="9" rx="2" fill="#8E5A2C" ${K2}/>
    </g>
    <g class="obra-crane"><path d="M232 70V8h50" stroke="${INK}" stroke-width="9" fill="none"/><path d="M232 70V8h50" stroke="#F2A900" stroke-width="5.5" fill="none"/><path d="M282 8v26" stroke="${INK}" stroke-width="2"/><rect x="272" y="34" width="20" height="12" rx="2" fill="${theme.primary}" ${K2}/></g>
    <rect x="104" y="40" width="92" height="30" rx="10" fill="#FFC23D" ${K}/>
    <text x="150" y="60" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="14" fill="#2A170D">PRÓXIMAMENTE</text>
    <path d="M120 232l10-32h10l10 32z" fill="#F28C2C" ${K2}/><path d="M124 218h22" stroke="#fff" stroke-width="5"/>
    <path d="M160 232l10-32h10l10 32z" fill="#F28C2C" ${K2}/><path d="M164 218h22" stroke="#fff" stroke-width="5"/>
    <path d="M44 210h70v12H44z" fill="#F2C200" ${K2}/><path d="M52 210l-8 12M66 210l-8 12M80 210l-8 12M94 210l-8 12M108 210l-8 12" stroke="#2A170D" stroke-width="4"/>
  </svg>`;
}
