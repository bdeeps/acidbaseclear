// Chapter 4: buffers, and three places where pH control matters. Three scenes.
// "buffer": plain water against a buffer, each given the same dose of strong acid or base.
//   Acetate: 0.1 mol/L acetic acid + 0.1 mol/L sodium acetate (pKa 4.756). Phosphate: 0.05 mol/L
//   each of H₂PO₄⁻ and HPO₄²⁻ (pKa₂ 7.20). Both are solved from the charge balance in acid.js.
//   Blood: the bicarbonate system as doctors write it (Henderson 1908, Hasselbalch 1917):
//   pH = 6.1 + log([HCO₃⁻] ÷ (0.0307 × pCO₂)), with bicarbonate 24 mmol/L and pCO₂ 40 mmHg giving
//   pH 7.39; normal range 7.35 to 7.45 (Wikipedia "Bicarbonate buffer system"). The lungs hold pCO₂
//   steady by breathing CO₂ out, so the dissolved CO₂ is a fixed 0.0307 × pCO₂ mmol/L and added acid
//   only uses up bicarbonate. The dashed line shows the same mixture if the CO₂ could not leave.
//   Real blood also has haemoglobin, proteins and phosphate as buffers, and the kidneys rebuild the
//   bicarbonate over hours: this scene shows the bicarbonate part only.
// "teeth": the Stephan curve (R. M. Stephan, 1940s): after sugar, plaque bacteria make acid and the
//   plaque pH falls from a resting 6.5–7 to about 5 within a few minutes, staying below the "critical
//   pH" of about 5.5 for roughly 20 minutes and recovering in 30 to 60 minutes (dental teaching texts,
//   e.g. the Canadian Dental Association and dentalcare.com course notes). Below about 5.5 enamel
//   (hydroxyapatite) loses calcium and phosphate; above it, saliva puts them back. The curve here is
//   a typical shape, rest 6.8 minus 1.9 × (e^(−t/25) − e^(−t/2)) scaled to its peak (t in minutes),
//   not a measurement of any one mouth. Drops from snacks close together add up, to a floor of 4.5.
// "rain": rain in equilibrium with the CO₂ in air. Dissolved CO₂ = 0.034 mol/L per atm × its
//   pressure (Henry's law), carbonic acid pKa 6.35 and 10.33, plus any strong acid from sulphur and
//   nitrogen oxides, all in the same solver. 427 ppm of CO₂ (NOAA Mauna Loa, August 2026: 427.55 ppm)
//   gives pH 5.59, the "about 5.6" of clean rain; acid rain is usually put at pH 4 to 5 (Wikipedia
//   "Acid rain"). Marble is calcium carbonate: CaCO₃ + H₂SO₄ → CaSO₄ + H₂O + CO₂, two H⁺ for each
//   CaCO₃ (100.09 g/mol), which sets the most marble a given rain could convert.
import { THREE, M, box, sphere, clamp, approach } from '../kit.js';
import {
  solve, PKA, KW, KH_CO2, MM, uniColor, css, toHex, times, fpH, fmt0, COL, HEX, VIEW, REEL_VIEW,
  board, panelBg, title, axes, curve, line, dot, text, hline, vline, dots, makeDisplay, beaker, bench, fitNarrow, placeBoard, fit, focusSwitch, showLabels, rng,
} from '../acid.js';

// ---------------------------------------------------------------- buffers
const SOL = 0.0307;                                              // mmol/L of dissolved CO₂ per mmHg, at body temperature
export const BUFFERS = {
  acetate: { name: 'Acetate', desc: '0.1 mol/L acetic acid + 0.1 mol/L sodium acetate' },
  phosphate: { name: 'Phosphate', desc: '0.05 mol/L each of H₂PO₄⁻ and HPO₄²⁻' },
  blood: { name: 'Blood', desc: 'bicarbonate 24 mmol/L, CO₂ held steady by the lungs' },
};
// a: strong acid added in mol/L (negative means strong base)
export const waterPH = (a) => solve({ strong: -a }).pH;
export function bufferPH(kind, a, pco2 = 40) {
  if (kind === 'acetate') return solve({ species: [{ C: 0.2, pKa: PKA.acetic, z: 0 }], strong: 0.1 - a }).pH;
  if (kind === 'phosphate') return solve({ species: [{ C: 0.1, pKa: PKA.phosphoric, z: 0 }], strong: 0.15 - a }).pH;
  const co2 = SOL * pco2 * 1e-3, K = Math.pow(10, -6.1);
  return solve({ strong: 0.024 - a, extra: (H) => -(K * co2) / H }).pH;        // open: CO₂ fixed by breathing
}
export const bloodClosed = (a) => solve({ species: [{ C: 0.024 + SOL * 40e-3, pKa: [6.1], z: 0 }], strong: 0.024 - a }).pH;

// ---------------------------------------------------------------- teeth
const REST = 6.8, DEEP = 1.9, TR = 25, TF = 2, CRIT = 5.5, DAY0 = 7, DAY1 = 23;
const TP = (Math.log(TR / TF) * TR * TF) / (TR - TF), PEAK = Math.exp(-TP / TR) - Math.exp(-TP / TF);
const dip = (t) => (t <= 0 ? 0 : (DEEP * (Math.exp(-t / TR) - Math.exp(-t / TF))) / PEAK);
export const sugarTimes = (n) => Array.from({ length: n }, (_, i) => DAY0 + 0.5 + (i * (DAY1 - DAY0 - 1)) / n);   // hours
export function plaquePH(hour, n) { let d = 0; for (const h of sugarTimes(n)) d += dip((hour - h) * 60); return REST - Math.min(REST - 4.5, d); }
export function minutesBelow(n) { let m = 0; for (let t = DAY0 * 60; t < DAY1 * 60; t += 0.5) if (plaquePH(t / 60, n) < CRIT) m += 0.5; return m; }
const clock = (h) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${((hh + 11) % 12) + 1}:${String(mm === 60 ? 59 : mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`; };

// ---------------------------------------------------------------- rain
const K1 = Math.pow(10, -PKA.carbonic[0]), K2 = Math.pow(10, -PKA.carbonic[1]);
// ppm of CO₂ in the air, and strong acid from pollution in micromoles of H⁺ per litre
export function rainPH(ppm, acid) {
  const c = KH_CO2 * ppm * 1e-6;
  return solve({ strong: -acid * 1e-6, extra: (H) => -((K1 * c) / H) * (1 + (2 * K2) / H) }).pH;
}

export default {
  id: 'buffers',
  short: 'Buffers, blood, teeth, rain',
  title: 'Holding pH steady, and losing it',
  subtitle: 'A buffer soaks up acid. Your blood has one, your teeth rely on one, and marble has none.',
  view: VIEW,
  learn: `<p>Add a few drops of acid to water and the pH plunges. Add the same drops to a <b>buffer</b> and it barely moves. A buffer is a weak acid mixed with its own salt, about half and half. The salt's ions mop up added H₃O⁺, and the acid molecules give up protons to mop up added OH⁻. It works best near the acid's own <b>pKa</b>, and only until one half is used up.</p>
    <p><b>Blood</b> must stay between <b>pH 7.35 and 7.45</b>. Its main buffer is carbon dioxide and <b>bicarbonate</b>. What makes it far better than a buffer in a beaker is that it is open at both ends: the <b>lungs</b> breathe out CO₂ within minutes, and the <b>kidneys</b> remove acid and rebuild bicarbonate over hours (see LungsClear and KidneyClear). The chart shows how much worse the same mixture would be in a sealed bottle.</p>
    <p><b>Teeth.</b> Enamel is a calcium phosphate mineral, the hardest thing in your body, but acid dissolves it. Bacteria in plaque turn sugar into acid within minutes, and the plaque's pH drops below about <b>5.5</b>, where enamel starts to lose mineral. Saliva is a buffer and brings the pH back in about half an hour to an hour, and puts mineral back. This dip and recovery is called the <b>Stephan curve</b>. What counts is not only how much sugar, but <b>how often</b>: sip a sweet drink all day and the pH never gets time to recover.</p>
    <p><b>Rain.</b> Even clean rain is slightly acidic, about <b>pH 5.6</b>, because it dissolves carbon dioxide. Burning coal and oil adds sulphur dioxide and nitrogen oxides, which become sulphuric and nitric acid: <b>acid rain</b>, usually pH 4 to 5. Marble and limestone are calcium carbonate, a base, and acid turns them into soluble salts and gas. Lakes and soils with little natural buffer turn acidic too, and farmers spread <b>lime</b> (the same calcium carbonate) to neutralise acid soil. India has about 25 million hectares of soil below pH 5.5, more than half of it in the north-east (ICAR).</p>
    <p><b>The Taj Mahal</b> is the best-known worry. In 1996 India's Supreme Court, in a case brought by the lawyer M. C. Mehta, ordered industries around Agra off coal and coke, to protect the marble from sulphur dioxide. Later research adds a twist: a 2015 study by IIT Kanpur and American researchers found that the yellow-brown tint seen today comes mostly from <b>soot and dust</b> settling on the marble, not from acid. The acid chemistry is real, but it is not the whole story.</p>
    <p class="tip"><b>Try it:</b> add 10 mmol/L of acid to water and to the acetate buffer and compare. Switch to blood and raise the CO₂, as if holding your breath. In <b>Teeth</b>, go from 3 sugary moments a day to 15. In <b>Rain</b>, add pollution and watch how little acid it takes.</p>`,
  terms: [
    { t: 'Buffer', d: 'A mixture of a weak acid and its salt that resists changes in pH when acid or base is added.' },
    { t: 'pKa', d: 'The pH at which a weak acid is exactly half ionised. A buffer works best within about one unit of it.' },
    { t: 'Bicarbonate (HCO₃⁻)', d: 'The ion that carbonic acid leaves behind. It is the main buffer of blood, and the base in baking soda.' },
    { t: 'Critical pH', d: 'About 5.5: below it, tooth enamel loses calcium and phosphate faster than saliva can put them back.' },
    { t: 'Acid rain', d: 'Rain made more acidic than its natural pH 5.6 by sulphur and nitrogen oxides from burning fuels.' },
    { t: 'Liming', d: 'Adding crushed limestone or lime to acid soil or water to raise its pH.' },
  ],
  defaults: { focus: 'buffer', buf: 'acetate', add: 0, pco2: 40, sugar: 4, hour: 9, ppm: 427, acid: 0 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'buffer', label: 'Buffer and blood' }, { v: 'teeth', label: 'Teeth' }, { v: 'rain', label: 'Rain and marble' }] },
    { key: 'buf', type: 'seg', label: 'Buffer: which one', options: Object.entries(BUFFERS).map(([v, m]) => ({ v, label: m.name })), fmt: (v) => BUFFERS[v].desc },
    { key: 'add', type: 'range', label: 'Buffer: strong acid or base added to both', min: -20, max: 20, step: 0.5, ends: ['20 mmol/L of base', '20 mmol/L of acid'], fmt: (v) => (v === 0 ? 'nothing yet' : `${Math.abs(v)} mmol/L of ${v > 0 ? 'hydrochloric acid' : 'sodium hydroxide'}`) },
    { key: 'pco2', type: 'range', label: 'Blood: CO₂ pressure set by breathing', min: 20, max: 80, step: 1, ends: ['20, breathing fast', '80 mmHg, holding breath'], fmt: (v) => `${v} mmHg${v === 40 ? ' (normal)' : ''}` },
    { key: 'sugar', type: 'range', label: 'Teeth: sugary moments in a day', min: 1, max: 20, step: 1, ends: ['1', '20, sipping all day'], fmt: (v) => `${v} a day` },
    { key: 'hour', type: 'range', label: 'Teeth: time of day', min: DAY0, max: DAY1, step: 0.05, ends: ['7 am', '11 pm'], fmt: clock },
    { key: 'ppm', type: 'range', label: 'Rain: CO₂ in the air', min: 280, max: 1000, step: 1, ends: ['280 ppm, before industry', '1,000 ppm'], fmt: (v) => `${Math.round(v)} ppm${Math.round(v) === 427 ? ' (2026)' : ''}` },
    { key: 'acid', type: 'range', label: 'Rain: strong acid from pollution', min: 0, max: 300, step: 1, ends: ['none', '300 µmol/L'], fmt: (v) => `${Math.round(v)} µmol of H⁺ per litre` },
  ],
  onChange(s, key) {
    if (key === 'buf' || key === 'add') s.focus = 'buffer';
    if (key === 'pco2') { s.focus = 'buffer'; s.buf = 'blood'; }
    if (key === 'sugar' || key === 'hour') s.focus = 'teeth';
    if (key === 'ppm' || key === 'acid') s.focus = 'rain';
  },
  quiz: [
    { q: 'What is a buffer made of?', options: ['A strong acid and a strong base', 'A weak acid and its salt, in similar amounts', 'Pure water', 'Any coloured indicator'], answer: 1, why: 'The salt’s ions soak up added acid, and the weak acid’s molecules soak up added base, so the pH barely moves.' },
    { q: 'Two children eat the same amount of sweets. One eats them all after lunch, the other spreads them through the day. Whose teeth spend longer below the critical pH?', options: ['The one who spreads them out', 'The one who eats them at once', 'Both the same', 'Neither: sweets are not acidic'], answer: 0, why: 'Each sugary moment holds the plaque below the critical pH for a quarter of an hour or so. Many separate moments mean many separate dips, with little time for saliva to repair the enamel.' },
    { q: 'Why is clean rain slightly acidic, at about pH 5.6?', options: ['It dissolves carbon dioxide from the air, making carbonic acid', 'Clouds contain vinegar', 'It picks up salt from the sea', 'Lightning makes it acidic'], answer: 0, why: 'CO₂ dissolves in the drops and forms weak carbonic acid. Pollution from burning fuels adds stronger acids and takes the pH lower still.' },
  ],
  reel: [
    { ms: 5400, caption: 'The same acid goes into water and into a buffer. The water crashes to pH 2. The buffer barely moves.', set: { focus: 'buffer', buf: 'acetate' }, anim: { add: [0, 20] }, view: REEL_VIEW, spin: 0 },
    { ms: 5400, caption: 'After sugar, plaque turns acid in minutes. Below pH 5.5 enamel dissolves, and each snack starts the clock again.', set: { focus: 'teeth', sugar: 8 }, anim: { hour: [7, 13] }, view: REEL_VIEW, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = rng(9);

    // ================================================================ BUFFER
    const B = new THREE.Group(); root.add(B);
    B.add(bench(7.2, 3.2));
    const XS = [-2.0, 0.75];
    const bks = XS.map((x) => { const b = beaker(1.05, 2.3, 1.6); b.position.set(x, 0.1, -0.2); B.add(b); return b; });
    const mets = XS.map((x) => { const m = makeDisplay(1.25, 0.75, '#8ef0ff'); m.position.set(x, 0.55, 1.25); m.rotation.x = -0.25; B.add(m); return m; });
    const dropMat = new THREE.MeshBasicMaterial({ color: 0xff6b5e, toneMapped: false });
    const pips = XS.map((x) => {
      const g = new THREE.Group(); g.position.set(x, 3.55, -0.2); B.add(g);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.03, 0.8, 12), M.clear(0xcfe8ff, 0.35)); g.add(tube);
      const bulb = sphere(0.14, M.plastic(0x2a2e37), 16); bulb.position.y = 0.5; g.add(bulb);
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), dropMat); g.add(d); g.d = d;
      return g;
    });
    const lW = stage.label('plain water', [XS[0], 2.75, -0.2], B), lB = stage.label('', [XS[1], 2.75, -0.2], B, 'hot'), lAdd = stage.label('', [(XS[0] + XS[1]) / 2, 4.15, -0.2], B, 'hot');
    const bufLabels = [lW, lB, lAdd];
    let dripT = 0, lastAdd = 0;

    // ================================================================ TEETH
    const T = new THREE.Group(); root.add(T);
    const gum = box(4.2, 1.5, 2.2, M.matte(0xb85568)); gum.position.set(-0.6, 0.75, 0); T.add(gum);
    const enamel = new THREE.MeshStandardMaterial({ color: 0xf7f4ea, roughness: 0.25, metalness: 0 });
    const crownProf = [[0.0, 0], [0.62, 0], [0.86, 0.35], [0.92, 0.8], [0.82, 1.2], [0.6, 1.42], [0.3, 1.34], [0.0, 1.22]].map(([x, y]) => new THREE.Vector2(x, y));
    const plaqueMat = new THREE.MeshBasicMaterial({ color: 0x5ce1a9, transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false });
    const teeth = [-2.1, -0.6, 0.9].map((x, i) => {
      const g = new THREE.Group(); g.position.set(x, 1.45, 0); T.add(g);
      const c = new THREE.Mesh(new THREE.LatheGeometry(crownProf, 40), enamel); c.castShadow = true; c.scale.set(i === 1 ? 0.8 : 0.72, i === 1 ? 1 : 0.92, 0.8); g.add(c);
      const p = new THREE.Mesh(new THREE.LatheGeometry(crownProf, 40), plaqueMat); p.scale.copy(c.scale).multiplyScalar(1.07); p.position.y = -0.02; g.add(p);
      return g;
    });
    const NI = 40, ions = dots(NI, 0.05, 0xfff0b0); T.add(ions);
    const IO = Array.from({ length: NI }, () => ({ a: rnd() * 6.283, y: 0.2 + rnd() * 1.1, t: rnd(), x: [-2.1, -0.6, 0.9][Math.floor(rnd() * 3)] }));
    const sweet = sphere(0.22, M.plastic(0xff5aa0, { roughness: 0.2 }), 20); T.add(sweet);
    const lTooth = stage.label('', [-0.6, 3.35, 0], T, 'hot'), lGum = stage.label('gum', [1.9, 1.0, 1.15], T), lEn = stage.label('enamel: calcium phosphate', [-2.6, 2.2, 1.0], T);
    const toothLabels = [lTooth, lGum, lEn];
    let below = 0, belowKey = -1;

    // ================================================================ RAIN
    const R = new THREE.Group(); root.add(R);
    const ground = box(7.2, 0.1, 3.4, M.matte(0x3f5a3c)); ground.position.y = 0.05; R.add(ground);
    const marble = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.45, metalness: 0 });
    const site = new THREE.Group(); site.position.set(0.75, 0, 0); site.scale.setScalar(0.9); R.add(site);
    const plinth = box(2.9, 0.35, 2.3, marble); plinth.position.set(0.3, 0.27, 0); site.add(plinth);
    const hall = box(1.7, 0.95, 1.4, marble); hall.position.set(0.3, 0.92, 0); site.add(hall);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 32), marble); drum.position.set(0.3, 1.54, 0); drum.castShadow = true; site.add(drum);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.58, 32, 20), marble); dome.scale.y = 1.15; dome.position.set(0.3, 2.05, 0); dome.castShadow = true; site.add(dome);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 10), M.metal(0xd9b65a)); fin.position.set(0.3, 2.9, 0); site.add(fin);
    for (const [x, z] of [[-1.0, -1.0], [1.6, -1.0], [-1.0, 1.0], [1.6, 1.0]]) { const mn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.9, 12), marble); mn.position.set(x, 1.4, z); mn.castShadow = true; site.add(mn); const cap = sphere(0.11, marble, 12); cap.position.set(x, 2.4, z); site.add(cap); }
    const arch = box(0.5, 0.65, 0.04, M.matte(0x8a8478)); arch.position.set(0.3, 0.82, 0.71); site.add(arch);
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xdfe5ee, roughness: 1 });
    for (const [x, y, z, r] of [[-0.8, 3.7, -0.2, 0.5], [-0.1, 3.85, 0, 0.62], [0.7, 3.8, -0.1, 0.66], [1.5, 3.7, 0.1, 0.55], [2.1, 3.65, -0.1, 0.42], [0.3, 3.6, 0.4, 0.45], [1.1, 3.6, 0.4, 0.45]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), cloudMat); c.position.set(x, y, z); site.add(c); }
    const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 2.0, 16), M.matte(0x7a4a3a)); chim.position.set(-2.9, 1.1, -0.9); chim.castShadow = true; R.add(chim);
    const ND = 90, rain = dots(ND, 0.035, 0x9fd0ff), smoke = dots(24, 0.13, 0x6a6f78), fizz = dots(30, 0.04, 0xfff0b0); site.add(rain, fizz); R.add(smoke);
    const RD = Array.from({ length: ND }, () => ({ x: -1.1 + rnd() * 3.4, z: -0.9 + rnd() * 1.8, t: rnd(), f: 0.7 + rnd() * 0.5 }));
    const FZ = Array.from({ length: 30 }, () => ({ a: rnd() * 6.283, b: rnd() * 1.2, t: rnd() }));
    const lRain = stage.label('', [2.3, 2.75, 0], site, 'hot'), lMarble = stage.label('marble: calcium carbonate', [2.2, 1.5, 0.8], site), lSmoke = stage.label('sulphur and nitrogen oxides', [-2.4, 1.6, 0.6], R);
    const rainLabels = [lRain, lMarble, lSmoke];

    // ================================================================ board
    let S = null, key = '';
    const bd = board(root, 3.3, 2.31, 640, 448, (g, w, h) => {
      panelBg(g, w, h); if (!S) return;
      if (S.focus === 'teeth') {
        title(g, 'Plaque pH through the day');
        const { X, Y, y0 } = axes(g, w, h, { xMin: DAY0, xMax: DAY1, yMin: 4, yMax: 7.5, xTicks: [7, 11, 15, 19, 23], yTicks: [4, 5, 6, 7], xFmt: (v) => `${((v + 11) % 12) + 1}${v < 12 ? ' am' : ' pm'}`, xLabel: '' });
        g.fillStyle = 'rgba(255,90,138,.16)'; g.fillRect(X(DAY0), Y(CRIT), X(DAY1) - X(DAY0), y0 - Y(CRIT));
        hline(g, X, Y, DAY0, DAY1, CRIT, COL.bad);
        text(g, 'below 5.5 enamel dissolves', X(DAY0) + 10, Y(4.25), COL.bad, '20px sans-serif');
        curve(g, (hh) => plaquePH(hh, S.sugar), DAY0, DAY1, X, Y, '#fff', 4, null, 640);
        dot(g, X(S.hour), Y(plaquePH(S.hour, S.sugar)), plaquePH(S.hour, S.sugar) < CRIT ? COL.bad : COL.ok, 10);
        text(g, `${S.sugar} sugary moments: ${fmt0(below)} min below 5.5`, 104, 82, COL.light, 'bold 22px sans-serif');
      } else if (S.focus === 'rain') {
        title(g, 'Rain pH against pollution');
        const { X, Y } = axes(g, w, h, { xMax: 300, yMin: 3, yMax: 6, xTicks: [0, 100, 200, 300], yTicks: [3, 4, 5, 6], xLabel: 'strong acid, µmol of H⁺ per litre →' });
        hline(g, X, Y, 0, 300, 5, COL.bad); text(g, 'acid rain: below about 5', X(120), Y(5) - 10, COL.bad, '20px sans-serif');
        curve(g, (a) => rainPH(S.ppm, a), 0, 300, X, Y, COL.h, 6, null, 150);
        dot(g, X(S.acid), Y(rainPH(S.ppm, S.acid)), COL.light, 10);
        text(g, `CO₂ alone, ${Math.round(S.ppm)} ppm: pH ${rainPH(S.ppm, 0).toFixed(2)}`, 104, 82, COL.text, 'bold 22px sans-serif');
      } else {
        const blood = S.buf === 'blood';
        title(g, blood ? 'Blood against water' : 'Buffer against water');
        const { X, Y } = axes(g, w, h, { xMin: -20, xMax: 20, yMax: 14, xTicks: [-20, -10, 0, 10, 20], yTicks: [0, 2, 4, 6, 8, 10, 12, 14], xFmt: (v) => String(Math.abs(v)), xLabel: '← base added      mmol/L      acid added →' });
        if (blood) { g.fillStyle = 'rgba(92,225,169,.3)'; g.fillRect(X(-20), Y(7.45) - 2, X(20) - X(-20), Y(7.35) - Y(7.45) + 4); curve(g, (a) => bloodClosed(a / 1000), -20, 20, X, Y, COL.ok, 3, [8, 6], 80); }
        curve(g, (a) => waterPH(a / 1000), -20, 20, X, Y, 'rgba(255,255,255,.55)', 3, null, 400);
        curve(g, (a) => bufferPH(S.buf, a / 1000, S.pco2), -20, 20, X, Y, COL.ok, 6, null, 80);
        dot(g, X(S.add), Y(waterPH(S.add / 1000)), '#bbb', 8); dot(g, X(S.add), Y(bufferPH(S.buf, S.add / 1000, S.pco2)), COL.light, 10);
        text(g, 'water', X(-19), Y(12.6), 'rgba(255,255,255,.7)', '20px sans-serif');
        text(g, blood ? 'solid: lungs working · dashed: CO₂ trapped' : `${BUFFERS[S.buf].name.toLowerCase()} buffer holds near ${bufferPH(S.buf, 0).toFixed(2)}`, 104, 82, COL.ok, 'bold 21px sans-serif');
      }
    }, [2.85, 5.62, 0]);

    const setFocus = focusSwitch({ buffer: B, teeth: T, rain: R });
    const cc = new THREE.Color(), good = new THREE.Color(0x5ce1a9), bad = new THREE.Color(0xff3b5c), blue = new THREE.Color(0x9fd0ff), orange = new THREE.Color(0xff8a4a);
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt); S = s;
        setFocus(s.focus);
        const narrow = fitNarrow(stage, []);
        showLabels(bufLabels, s.focus === 'buffer'); showLabels(toothLabels, s.focus === 'teeth'); showLabels(rainLabels, s.focus === 'rain');
        if (narrow) showLabels([lW, lGum, lEn, lMarble, lSmoke], false);
        placeBoard(bd);
        if (s.focus === 'buffer') {
          const a = s.add / 1000, pw = waterPH(a), pb = bufferPH(s.buf, a, s.pco2);
          bks[0].liquid.tint(uniColor(pw), 0.5); bks[1].liquid.tint(s.buf === 'blood' ? [170, 30, 40] : uniColor(pb), s.buf === 'blood' ? 0.8 : 0.5);
          mets[0].set(fpH(pw), 'water'); mets[1].set(fpH(pb), s.buf === 'blood' ? 'blood' : 'buffer');
          if (s.add !== lastAdd) { dripT = 0.8; lastAdd = s.add; } dripT = Math.max(0, dripT - dt);
          dropMat.color.setHex(s.add < 0 ? 0x5aa2ff : 0xff6b5e);
          pips.forEach((p) => { const k = (time * 1.5) % 1; p.d.visible = dripT > 0; p.d.position.y = -0.45 - k * k * 1.3; });
          lB.element.style.setProperty('--c', COL.ok); lB.element.innerHTML = s.buf === 'blood' ? 'blood: <b>bicarbonate buffer</b>' : `<b>${BUFFERS[s.buf].name.toLowerCase()} buffer</b>`;
          lAdd.element.style.setProperty('--c', s.add < 0 ? COL.oh : s.add > 0 ? COL.h : COL.soft);
          lAdd.element.textContent = s.add === 0 ? 'nothing added yet' : `${Math.abs(s.add)} mmol/L of strong ${s.add > 0 ? 'acid' : 'base'} into each`;
        } else if (s.focus === 'teeth') {
          if (belowKey !== s.sugar) { belowKey = s.sugar; below = minutesBelow(s.sugar); key = ''; }
          const p = plaquePH(s.hour, s.sugar), k = clamp((6.3 - p) / 1.3, 0, 1), under = p < CRIT;
          plaqueMat.color.copy(cc.copy(good).lerp(bad, k)); plaqueMat.opacity = 0.08 + 0.42 * k;
          // calcium and phosphate ions leave the enamel below the critical pH and settle back above it
          IO.forEach((q, i) => {
            q.t = (q.t + dt * 0.35) % 1;
            const out = under ? q.t : 1 - q.t, r = 0.75 + out * 0.9;
            if (!under && p < 6.2 ? i % 3 : (!under && i % 6)) return ions.hide(i);
            ions.place(i, q.x + r * Math.cos(q.a) * 0.8, 1.5 + q.y + out * 0.3, r * Math.sin(q.a) * 0.8, 1 - 0.5 * out);
          });
          ions.done();
          const since = sugarTimes(s.sugar).map((h) => (s.hour - h) * 60).filter((m) => m >= 0 && m < 4);
          sweet.visible = since.length > 0; if (since.length) sweet.position.set(-0.6 + 1.6 * (1 - since[0] / 4), 3.2 - 0.7 * (since[0] / 4), 0.9);
          lTooth.element.style.setProperty('--c', under ? COL.bad : COL.ok);
          lTooth.element.innerHTML = `${clock(s.hour)}: plaque <b>pH ${p.toFixed(1)}</b>, ${under ? 'enamel losing mineral' : p < 6.3 ? 'recovering' : 'saliva repairing'}`;
        } else {
          const p = rainPH(s.ppm, s.acid), k = clamp((5.6 - p) / 1.8, 0, 1);
          rain.material.color.copy(cc.copy(blue).lerp(orange, k));
          RD.forEach((q, i) => { q.t = (q.t + dt * q.f * 0.55) % 1; const inside = Math.abs(q.x - 0.3) < 0.6 && Math.abs(q.z) < 0.6, floor = inside ? 2.4 - 0.5 * Math.hypot(q.x - 0.3, q.z) : Math.abs(q.x - 0.3) < 1.45 && Math.abs(q.z) < 1.15 ? 0.45 : 0.1, y = 3.3 - q.t * 3.3; if (y < floor) rain.hide(i); else rain.place(i, q.x, y, q.z, 1); });
          rain.done();
          const ns = Math.round(24 * clamp(s.acid / 150, 0, 1));
          for (let i = 0; i < 24; i++) { if (i >= ns) { smoke.hide(i); continue; } const t = (time * 0.12 + i / 24) % 1; smoke.place(i, -2.9 + t * 2.4 + 0.15 * Math.sin(i * 2.1), 2.2 + t * 1.2 + 0.12 * Math.cos(i * 1.3), -0.9 + 0.5 * t, 0.6 + t * 1.6); }
          smoke.done();
          const nf = Math.round(30 * clamp(s.acid / 200, 0, 1));
          FZ.forEach((q, i) => { if (i >= nf) return fizz.hide(i); q.t = (q.t + dt * 0.5) % 1; const r = 0.6 * Math.cos(q.b); fizz.place(i, 0.3 + r * Math.cos(q.a) * (1 + q.t * 0.4), 2.05 + 0.66 * Math.sin(q.b) + q.t * 0.35, r * Math.sin(q.a) * (1 + q.t * 0.4), 1 - q.t); });
          fizz.done();
          marble.color.setRGB(0.93 - 0.1 * k, 0.9 - 0.12 * k, 0.83 - 0.16 * k);
          lSmoke.visible = !narrow && s.acid > 0;
          lRain.element.style.setProperty('--c', p < 5 ? COL.bad : COL.ok);
          lRain.element.innerHTML = `rain: <b>pH ${p.toFixed(2)}</b>${p < 5 ? ', acid rain' : ''}`;
        }
        const k = s.focus === 'teeth' ? `t|${s.sugar}|${s.hour}` : s.focus === 'rain' ? `r|${s.ppm}|${s.acid}` : `b|${s.buf}|${s.add}|${s.pco2}`;
        if (k !== key) { key = k; bd.redraw(); }
      },
      readout: (s) => fit(((s) => {
        if (s.focus === 'teeth') {
          const p = plaquePH(s.hour, s.sugar), m = minutesBelow(s.sugar);
          return `<div class="big">Plaque pH ${p.toFixed(1)} at ${clock(s.hour)}</div>
            <div class="row"><span>Sugary moments today</span><b>${s.sugar}</b></div>
            <div class="row"><span>Time below pH 5.5</span><b>${m >= 90 ? `${(m / 60).toFixed(1)} hours` : `${fmt0(m)} minutes`} of 16 waking hours</b></div>
            <div class="row x"><span>H₃O⁺ now, against resting plaque</span><b>${times(Math.pow(10, REST - p))}×</b></div>
            <div class="${p < CRIT ? 'no' : 'ok'}">${p < CRIT ? 'Below 5.5: enamel is losing mineral.' : 'Above 5.5: saliva is putting mineral back.'}</div>
            <small>A typical curve (Stephan, 1940s). Real mouths differ.</small>`;
        }
        if (s.focus === 'rain') {
          const p = rainPH(s.ppm, s.acid), p0 = rainPH(s.ppm, 0), g = (s.acid * 1e-6 * 1000 * MM.caco3) / 2;
          return `<div class="big">Rain pH ${p.toFixed(2)}</div>
            <div class="row"><span>From CO₂ alone (${Math.round(s.ppm)} ppm)</span><b>pH ${p0.toFixed(2)}</b></div>
            <div class="row"><span>H₃O⁺ against clean rain</span><b>${times(Math.pow(10, p0 - p))}×</b></div>
            <div class="row x"><span>1,000 L of it can attack up to</span><b>${g < 0.05 ? '0' : g.toFixed(1)} g of marble</b></div>
            <div class="row x"><span>Lime to cancel it on a hectare</span><b>${g < 0.05 ? '0' : fmt0(g * 10)} kg per metre of rain</b></div>
            <small>${s.acid > 0 ? 'Marble + acid → a calcium salt + water + CO₂.' : 'Clean rain is already a weak acid: it carves limestone caves.'}</small>`;
        }
        const a = s.add / 1000, pw = waterPH(a), pb = bufferPH(s.buf, a, s.pco2), pb0 = bufferPH(s.buf, 0, s.pco2), blood = s.buf === 'blood';
        return `<div class="big">Water ${fpH(pw)} · ${blood ? 'blood' : 'buffer'} ${fpH(pb)}</div>
          <div class="row"><span>Added to each</span><b>${s.add === 0 ? 'nothing yet' : `${Math.abs(s.add)} mmol/L of strong ${s.add > 0 ? 'acid' : 'base'}`}</b></div>
          ${blood ? '' : `<div class="row"><span>Water moved by</span><b>${Math.abs(pw - 7).toFixed(2)} pH units</b></div>`}
          <div class="row"><span>${blood ? 'Blood' : 'Buffer'} moved by</span><b>${Math.abs(pb - pb0).toFixed(2)} pH units</b></div>
          ${blood ? `<div class="row x"><span>CO₂ pressure · bicarbonate left</span><b>${s.pco2} mmHg · ${(24 - s.add).toFixed(1)} mmol/L</b></div>
          <div class="${pb >= 7.35 && pb <= 7.45 ? 'ok' : 'no'}">${pb >= 7.35 && pb <= 7.45 ? 'Inside the normal range, 7.35 to 7.45.' : `${pb < 7.35 ? 'Below' : 'Above'} the normal range, 7.35 to 7.45.`}</div>
          <small>Bicarbonate only: real blood has other buffers too.</small>` : `<div class="row x"><span>Made of</span><b>${BUFFERS[s.buf].desc}</b></div>`}`;
      })(s)),
    };
  },
};
