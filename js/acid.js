// Shared parts for AcidBaseClear: the equilibrium solver every chapter uses, sourced constants,
// indicator colours, number formats, chart boards, glassware and the layout helpers.
// Boards and stage helpers follow PhotoelectricClear and CurdClear so the boxes look alike.
// +x right, +y up, +z towards you.
import { THREE, M, box, canvasTexture, clamp } from './kit.js';

export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- water
// Kw = [H₃O⁺][OH⁻]. pKw against temperature at 0.1 MPa: 0 °C 14.95, 25 °C 13.99, 50 °C 13.26,
// 75 °C 12.70, 100 °C 12.25 (Bandura and Lvov, J. Phys. Chem. Ref. Data 35, 15, 2006, as tabulated in
// Wikipedia "Self-ionization of water"). Chapters 1 to 4 work at 25 °C with the usual rounded
// Kw = 1.0 × 10⁻¹⁴, so neutral water is pH 7.00. Chapter 5 uses the table, joined by the one smooth
// curve (a quartic) that passes through all five points.
export const KW = 1.0e-14;
const PKW_T = [[0, 14.95], [25, 13.99], [50, 13.26], [75, 12.70], [100, 12.25]];
export function pKwAt(T) {
  let sum = 0;
  for (let i = 0; i < PKW_T.length; i++) {
    let l = 1;
    for (let j = 0; j < PKW_T.length; j++) if (j !== i) l *= (T - PKW_T[j][0]) / (PKW_T[i][0] - PKW_T[j][0]);
    sum += l * PKW_T[i][1];
  }
  return sum;
}

// ---------------------------------------------------------------- acid constants (25 °C, in water)
// pKa = −log Ka. Acetic 4.756; phosphoric 2.14, 7.20, 12.37; citric 3.13, 4.76, 6.40 (Wikipedia
// "Acid dissociation constant", from the CRC Handbook and IUPAC tables). Carbonic acid counted as
// all dissolved CO₂: 6.35 and 10.33 (Wikipedia "Carbonic acid"). Ammonium ion 9.25 (CRC Handbook).
// Hydrochloric acid and sodium hydroxide are treated as fully ionised (HCl's pKa is far below zero).
export const PKA = { acetic: [4.756], phosphoric: [2.14, 7.20, 12.37], citric: [3.13, 4.76, 6.40], carbonic: [6.35, 10.33], ammonium: [9.25] };
// Solubility products at 25 °C (CRC Handbook): Mg(OH)₂ 5.61 × 10⁻¹², CaCO₃ as calcite 3.36 × 10⁻⁹.
export const KSP = { mgoh2: 5.61e-12, caco3: 3.36e-9 };
// Henry's law for CO₂ in water at 25 °C: 0.034 mol/L per atmosphere (Sander's compilation, 2015).
export const KH_CO2 = 0.034;
// Molar masses, g/mol.
export const MM = { nahco3: 84.007, caco3: 100.087, mgoh2: 58.320 };

// Fractions of an acid HₙA in each state of ionisation at hydrogen-ion concentration H.
// Returns [α₀ … αₙ], where αⱼ has lost j protons.
export function fractions(H, pKa) {
  const n = pKa.length, t = [1];
  for (let j = 0; j < n; j++) t.push((t[j] * Math.pow(10, -pKa[j])) / H);
  const D = t.reduce((a, b) => a + b, 0);
  return t.map((x) => x / D);
}
// Average charge on the acid: z for the fully protonated form, one less for each proton lost.
const meanCharge = (H, sp) => { const a = fractions(H, sp.pKa); let q = sp.z || 0; for (let j = 1; j < a.length; j++) q -= j * a[j]; return q; };

// The solver. Every solution is electrically neutral, so
//   [H₃O⁺] − [OH⁻] + (spectator ions) + Σ C × (mean charge of each acid or base) + extra = 0,
// with [OH⁻] = Kw ÷ [H₃O⁺]. The left side only ever rises as [H₃O⁺] rises, so one answer exists and
// bisection on pH finds it. No "weak acid" or "buffer" shortcut formulas are used anywhere.
//   species: [{ C mol/L, pKa: [...], z: charge when fully protonated }]
//   strong:  net spectator charge in mol/L (Na⁺ counts +, Cl⁻ counts −)
//   extra:   optional (H) => further charge, for solids that dissolve or a gas held at fixed pressure
export function solve({ species = [], strong = 0, Kw = KW, extra = null }) {
  const f = (pH) => {
    const H = Math.pow(10, -pH);
    let q = H - Kw / H + strong;
    for (const sp of species) q += sp.C * meanCharge(H, sp);
    if (extra) q += extra(H);
    return q;
  };
  let lo = -2, hi = 16;                                       // f(lo) > 0, f(hi) < 0
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  const pH = (lo + hi) / 2, H = Math.pow(10, -pH);
  return { pH, H, OH: Kw / H };
}

// Chapter 1's five solutions, each at concentration C mol/L.
export const SUBS = {
  hcl: { name: 'Hydrochloric acid', short: 'HCl', kind: 'acid', strong: true, formula: 'HCl', ion: 'Cl⁻', where: 'the acid in your stomach' },
  acetic: { name: 'Acetic acid', short: 'Acetic', kind: 'acid', strong: false, formula: 'CH₃COOH', ion: 'CH₃COO⁻', where: 'the acid in vinegar' },
  nh3: { name: 'Ammonia', short: 'Ammonia', kind: 'base', strong: false, formula: 'NH₃', ion: 'NH₄⁺', where: 'in some glass cleaners' },
  naoh: { name: 'Sodium hydroxide', short: 'NaOH', kind: 'base', strong: true, formula: 'NaOH', ion: 'Na⁺', where: 'caustic soda, in drain cleaner' },
};
export function solution(sub, C, Kw = KW) {
  let r, ion;
  if (sub === 'hcl') { r = solve({ strong: -C, Kw }); ion = 1; }
  else if (sub === 'naoh') { r = solve({ strong: C, Kw }); ion = 1; }
  else if (sub === 'acetic') { r = solve({ species: [{ C, pKa: PKA.acetic, z: 0 }], Kw }); ion = fractions(r.H, PKA.acetic)[1]; }
  else { r = solve({ species: [{ C, pKa: PKA.ammonium, z: 1 }], Kw }); ion = fractions(r.H, PKA.ammonium)[0]; }
  return { ...r, ion };                                       // ion: the share of molecules that have ionised
}

// ---------------------------------------------------------------- colours
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mix = (a, b, k) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k));
export const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const toHex = (c) => (c[0] << 16) | (c[1] << 8) | c[2];
function ramp(stops, x) {
  if (x <= stops[0][0]) return hex(stops[0][1]);
  for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) return mix(hex(stops[i - 1][1]), hex(stops[i][1]), (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return hex(stops[stops.length - 1][1]);
}
// Universal indicator: red, orange, yellow, green at 7, blue, then violet (the usual school chart).
const UNI = [[0, 0xe5262b], [2, 0xf0502a], [4, 0xf59a23], [6, 0xf2dc2a], [7, 0x4fb84a], [8.5, 0x2a9d8f], [10, 0x2f6fd6], [12, 0x5347c9], [14, 0x7a2fb5]];
export const uniColor = (pH) => ramp(UNI, pH);
// Red cabbage juice (anthocyanins): red and pink in acid, purple near neutral, then blue, green and
// yellow as it gets more alkaline (RHS and Flinn Scientific school colour charts; Wikipedia "Red cabbage").
const CABBAGE = [[1, 0xe0304a], [3, 0xd94a8c], [5, 0xa64db8], [7, 0x7a4fc0], [8.5, 0x3f6fd0], [10, 0x2aa59a], [12, 0x8fc23f], [13.5, 0xe6d24a]];
// Indicators. Transition ranges from Wikipedia "pH indicator": methyl orange 3.1–4.4 red to yellow,
// litmus 4.5–8.3 red to blue, bromothymol blue 6.0–7.6 yellow to blue, phenolphthalein 8.3–10.0
// colourless to pink. Turmeric (curcumin): yellow below about 7.4, red-brown above about 8.6
// (Questacon and museum conservation notes; some sources put the top of the range at 9.2).
// "clear" marks a form with no colour, drawn as plain water.
export const WATER = [214, 232, 246];
export const INDICATORS = {
  mo: { name: 'Methyl orange', lo: 3.1, hi: 4.4, a: hex(0xe8382f), b: hex(0xf5c83a), an: 'red', bn: 'yellow', mn: 'orange' },
  litmus: { name: 'Litmus', lo: 4.5, hi: 8.3, a: hex(0xe0455a), b: hex(0x3f62d8), an: 'red', bn: 'blue', mn: 'purple' },
  btb: { name: 'Bromothymol blue', lo: 6.0, hi: 7.6, a: hex(0xf2d43a), b: hex(0x2f62d0), an: 'yellow', bn: 'blue', mn: 'green' },
  haldi: { name: 'Turmeric', lo: 7.4, hi: 8.6, a: hex(0xf2c21a), b: hex(0xb3341f), an: 'yellow', bn: 'red-brown', mn: 'orange' },
  pp: { name: 'Phenolphthalein', lo: 8.3, hi: 10.0, a: WATER, b: hex(0xe83e9c), an: 'colourless', bn: 'pink', mn: 'pale pink', clearA: true },
  cabbage: { name: 'Red cabbage juice', multi: true },
  uni: { name: 'Universal indicator', multi: true },
};
// The share of the indicator in its high-pH form. An indicator is itself a weak acid, so the share
// follows the same S-curve as any acid; the curve is stretched so 9% to 91% spans the quoted range.
export const indShare = (ind, pH) => 1 / (1 + Math.pow(10, ((ind.lo + ind.hi) / 2 - pH) * (2 / (ind.hi - ind.lo))));
export function indColor(id, pH) {
  if (id === 'uni') return uniColor(pH);
  if (id === 'cabbage') return ramp(CABBAGE, pH);
  const ind = INDICATORS[id];
  return mix(ind.a, ind.b, indShare(ind, pH));
}
export function indName(id, pH) {
  if (id === 'uni') return pH < 3 ? 'red' : pH < 5 ? 'orange' : pH < 6.5 ? 'yellow' : pH < 7.6 ? 'green' : pH < 9.3 ? 'blue-green' : pH < 11.5 ? 'blue' : 'violet';
  if (id === 'cabbage') return pH < 2.5 ? 'red' : pH < 4.5 ? 'pink' : pH < 7.6 ? 'purple' : pH < 9.3 ? 'blue' : pH < 11.5 ? 'blue-green' : pH < 13 ? 'green' : 'yellow';
  const ind = INDICATORS[id], k = indShare(ind, pH);
  return k < 0.15 ? ind.an : k > 0.85 ? ind.bn : ind.mn;
}
// How strongly a liquid shows its colour (phenolphthalein's acid form is clear).
export const indOpacity = (id, pH) => { const ind = INDICATORS[id]; return ind.clearA ? 0.3 + 0.5 * indShare(ind, pH) : 0.8; };

// ---------------------------------------------------------------- number formats
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export const sup = (e) => String(e).split('').map((c) => SUP[c] ?? c).join('');
export function sci(v, d = 1) {
  if (!v) return '0';
  let e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e);
  if (+m.toFixed(d) >= 10) { m /= 10; e += 1; }
  return `${m.toFixed(d)} × 10${sup(e)}`;
}
export const fmt0 = (v) => Math.round(v).toLocaleString('en-IN');
// A concentration in mol/L, written the way a school book would.
export function conc(v) {
  if (v >= 0.1) return `${+v.toPrecision(2)} mol/L`;
  if (v >= 1e-3) return `${+(v * 1e3).toPrecision(2)} mmol/L`;
  return `${sci(v)} mol/L`;
}
// "times as many": 3.2, 48, 12,000, 3.2 × 10⁸
export function times(v) {
  if (v < 10) return (+v.toPrecision(2)).toString();
  if (v < 1e6) return fmt0(+v.toPrecision(2));
  return sci(v);
}
export const pct = (k) => (k >= 0.995 ? '100%' : k >= 0.1 ? `${(k * 100).toFixed(0)}%` : k >= 0.001 ? `${(k * 100).toPrecision(2)}%` : `${sci(k * 100)}%`);
export const fpH = (v, d = 2) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(d)).replace('-', '−');

// ---------------------------------------------------------------- boards (live charts in 3D)
export const COL = { h: '#ff6b5e', oh: '#5aa2ff', light: '#ffe28a', ok: '#5ce1a9', bad: '#ff5a8a', volt: '#c49bff', text: '#e8eef8', soft: 'rgba(255,255,255,.6)', faint: 'rgba(255,255,255,.3)' };
export const HEX = { h: 0xff6b5e, oh: 0x5aa2ff, mol: 0xb9c0cc, ion: 0xd9c98a, ok: 0x5ce1a9, light: 0xffe28a };
export function panelBg(g, w, h) { g.fillStyle = '#0b0d13'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const tex = canvasTexture(pxW, pxH, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex.tex, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return Object.assign(tex, { mesh: m });
}
export function title(g, text, sub = '') {
  g.fillStyle = COL.text; g.font = 'bold 30px sans-serif'; g.fillText(text, 20, 40);
  if (sub) { const x = 34 + g.measureText(text).width; g.font = '21px sans-serif'; g.fillStyle = COL.soft; g.fillText(sub, x, 40); }
}
export function axes(g, w, h, { x0 = 92, x1 = w - 26, y0 = h - 70, y1 = 104, xMax, yMax, xMin = 0, yMin = 0, xTicks, yTicks, xFmt = String, yFmt = String, xLabel = '', yLabel = '', xLog = false }) {
  const X = xLog ? (x) => x0 + (Math.log(x / xMin) / Math.log(xMax / xMin)) * (x1 - x0) : (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0);
  const Y = (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = COL.soft; g.font = '22px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 28); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 7); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '21px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 58);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 10);
  return { X, Y, x0, x1, y0, y1 };
}
export function line(g, pts, X, Y, col, wdt = 4, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.setLineDash(dash || []); g.lineJoin = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function curve(g, fn, a, b, X, Y, col, wdt = 4, dash = null, n = 200, log = false) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const x = log ? a * Math.pow(b / a, i / n) : a + ((b - a) * i) / n; pts.push([x, fn(x)]); }
  line(g, pts, X, Y, col, wdt, dash);
}
export function dot(g, x, y, col, r = 10) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function text(g, s, x, y, col = COL.text, font = '22px sans-serif') { g.fillStyle = col; g.font = font; g.fillText(s, x, y); }
export function hline(g, X, Y, xa, xb, y, col, dash = [6, 6], wdt = 2) { g.strokeStyle = col; g.setLineDash(dash); g.lineWidth = wdt; g.beginPath(); g.moveTo(X(xa), Y(y)); g.lineTo(X(xb), Y(y)); g.stroke(); g.setLineDash([]); }
export function vline(g, X, Y, x, ya, yb, col, dash = [6, 6], wdt = 2) { g.strokeStyle = col; g.setLineDash(dash); g.lineWidth = wdt; g.beginPath(); g.moveTo(X(x), Y(ya)); g.lineTo(X(x), Y(yb)); g.stroke(); g.setLineDash([]); }
// A strip coloured by an indicator from pH a to pH b, drawn between pixel positions from X().
export function strip(g, id, X, y, hgt, a = 0, b = 14) {
  const n = 70, xa = X(a), wpx = (X(b) - xa) / n;
  for (let i = 0; i < n; i++) { g.fillStyle = css(indColor(id, a + ((b - a) * (i + 0.5)) / n)); g.fillRect(xa + i * wpx - 0.5, y, wpx + 1, hgt); }
}

// ---------------------------------------------------------------- 3D pieces
// n glowing spheres placed each frame with place(i, x, y, z, s).
export function dots(n, r, color = 0xffffff, seg = 10) {
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 3)), mat, n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const o = new THREE.Object3D();
  mesh.place = (i, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.setScalar(Math.max(0.0001, s)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  mesh.hide = (i) => mesh.place(i, 0, -80, 0, 0.0001);
  mesh.done = () => { mesh.instanceMatrix.needsUpdate = true; };
  for (let i = 0; i < n; i++) mesh.hide(i);
  return mesh;
}
// A small screen with text drawn on a canvas (a pH meter). set(big line, small line).
export function makeDisplay(w = 1, h = 0.6, color = '#8ef0ff') {
  const g = new THREE.Group();
  g.add(box(w, h, 0.16, M.plastic(0x1f232b, { roughness: 0.5 })));
  let a = '', b = '';
  const face = canvasTexture(320, 190, (c, W, Hh) => {
    c.fillStyle = '#0b0f14'; c.fillRect(0, 0, W, Hh);
    c.fillStyle = color; c.font = 'bold 60px monospace'; c.fillText(a, (W - c.measureText(a).width) / 2, 96);
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '30px sans-serif'; c.fillText(b, (W - c.measureText(b).width) / 2, 152);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.84), new THREE.MeshBasicMaterial({ map: face.tex, toneMapped: false }));
  m.position.z = 0.081; g.add(m);
  let last = '';
  g.set = (x, y = '') => { const k = x + '|' + y; if (k === last) return; last = k; a = x; b = y; face.redraw(); };
  return g;
}
// The liquid in every vessel: a see-through coloured material. tint(rgb, opacity) recolours it.
export function liquidMat(c = WATER, opacity = 0.6) {
  const m = new THREE.MeshStandardMaterial({ color: toHex(c), transparent: true, opacity, roughness: 0.2, metalness: 0, depthWrite: false });
  m.tint = (rgb, op = opacity) => { m.color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace); m.opacity = op; };
  return m;
}
// A straight glass beaker standing on y = 0 with liquid to height `level`.
export function beaker(r = 1, h = 2, level = 1.4) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48, 1, true), M.clear(0xcfe8ff, 0.16)); wall.position.y = h / 2; g.add(wall);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 8, 48), M.clear(0xe8f4ff, 0.5)); rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 48), M.clear(0xcfe8ff, 0.3)); base.position.y = 0.025; g.add(base);
  const mat = liquidMat();
  const liq = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, 1, 48), mat); liq.renderOrder = 2; wall.renderOrder = 3; g.add(liq);
  g.setLevel = (y) => { liq.scale.y = Math.max(0.01, y - 0.05); liq.position.y = 0.05 + (y - 0.05) / 2; g.level = y; };
  g.setLevel(level); g.liquid = mat; g.r = r; g.h = h;
  return g;
}
// A conical flask standing on y = 0 (base radius r, height h) with liquid to height `level`.
export function flask(r = 0.9, h = 1.9, level = 0.6) {
  const g = new THREE.Group(), neck = r * 0.26, hc = h * 0.68;
  const prof = [[r * 0.9, 0], [r, 0.06], [neck, hc], [neck, h], [neck * 1.15, h + 0.03]].map(([x, y]) => new THREE.Vector2(x, y));
  const wall = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), M.clear(0xcfe8ff, 0.16)); wall.renderOrder = 3; g.add(wall);
  const mat = liquidMat();
  let liq = null;
  g.setLevel = (y) => {
    y = clamp(y, 0.1, hc * 0.9);
    if (liq && Math.abs(g.level - y) < 0.004) return;
    if (liq) { g.remove(liq); liq.geometry.dispose(); }
    const rt = r - ((r - neck) * (y - 0.06)) / (hc - 0.06);
    liq = new THREE.Mesh(new THREE.CylinderGeometry(rt * 0.96, r * 0.94, y - 0.05, 40), mat); liq.renderOrder = 2; liq.position.y = 0.05 + (y - 0.05) / 2; g.add(liq); g.level = y;
  };
  g.setLevel(level); g.liquid = mat;
  return g;
}
// A pH ruler: a strip coloured like universal indicator, from pH a at the left end to pH b at the right.
export function ruler(wid = 6, a = 0, b = 14, hgt = 0.5) {
  const g = new THREE.Group();
  const tex = canvasTexture(1024, 96, (c, W, Hh) => {
    for (let i = 0; i < 256; i++) { c.fillStyle = css(uniColor(a + ((b - a) * (i + 0.5)) / 256)); c.fillRect((i * W) / 256, 0, W / 256 + 1, Hh); }
    c.fillStyle = 'rgba(8,10,14,.82)'; c.font = `bold ${b - a > 14 ? 30 : 38}px sans-serif`;
    for (let p = Math.ceil(a); p <= b; p++) { const s = String(p).replace('-', '−'), x = ((p - a) / (b - a)) * W; c.fillText(s, clamp(x - c.measureText(s).width / 2, 6, W - c.measureText(s).width - 6), 62); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wid, hgt), new THREE.MeshBasicMaterial({ map: tex.tex, toneMapped: false, side: THREE.DoubleSide })); g.add(m);
  const back = box(wid + 0.12, hgt + 0.12, 0.05, M.plastic(0x1f232b)); back.position.z = -0.035; g.add(back);
  const mark = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); mark.rotation.x = Math.PI; mark.position.set(0, hgt / 2 + 0.2, 0.02); g.add(mark);
  g.xOf = (pH) => (clamp((pH - a) / (b - a), 0, 1) - 0.5) * wid;
  g.set = (pH) => { mark.position.x = g.xOf(pH); };
  g.mark = mark;
  return g;
}
export const bench = (w = 7, d = 3, col = 0x3a3f4b) => { const b = box(w, 0.1, d, M.matte(col, { roughness: 0.7 })); b.position.y = 0.05; return b; };

// ---------------------------------------------------------------- layout
export const inReel = () => document.body.classList.contains('gb-reel');
// On a phone-width stage: hide the minor labels (the board sits under the model there, see placeBoard).
export function fitNarrow(stage, minor = [], shift = 0.01) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? shift : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// Boards sit beside the model on a wide screen, above it in the tall reel video, and under it on a
// phone (where the readout fills the top of the stage). Each placement is [position, rotationY, scale].
const WIDE = [[2.85, 5.62, 0], -0.08, 1.2], PHONE = [[0, -1.25, 1.2], 0, 0.95], REEL = [[0, 6.75, 0], 0, 2];
export const isPhone = () => !inReel() && window.innerWidth < 560;
export function placeBoard(b, wide = WIDE, reel = REEL, phone = PHONE) {
  const [p, r = 0, s = 1] = inReel() ? reel : isPhone() ? phone : wide;
  b.mesh.position.set(...p); b.mesh.rotation.set(0, r, 0); b.mesh.scale.setScalar(s);
}
// The camera positions every chapter shares, so the bench, the board and the readout never collide.
export const VIEW = { pos: [0.1, 3.2, 8.8], target: [0.1, 2.9, 0] };
export const REEL_VIEW = { pos: [0, 4.5, 6.6], target: [0, 4.2, 0] };
// On a phone the readout keeps only its main rows: rows marked "row x" and small notes are dropped.
export const fit = (html) => (isPhone() ? html.replace(/<div class="row x">[\s\S]*?<\/div>\s*/g, '').replace(/<small>[\s\S]*?<\/small>/g, '') : html);
// Show one scene group of a chapter.
export function focusSwitch(groups) {
  let cur = '';
  return (id) => { if (id === cur) return false; cur = id; Object.entries(groups).forEach(([k, g]) => { g.visible = k === id; }); return true; };
}
// Hide a label together with its group (CSS2D labels ignore a parent's visibility on some paths).
export function showLabels(list, on) { list.forEach((l) => { if (l) l.visible = on; }); }
// Deterministic pseudo-random numbers so every run (and every video frame) looks the same.
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export { clamp, THREE, M, box };
