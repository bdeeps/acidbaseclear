// Chapter 2: acids and bases around the house. Two scenes.
// "shelf": fifteen everyday liquids standing above a pH ruler. Values and their sources:
//   battery acid: below 1 (29–32% sulphuric acid, 4.2–5.0 mol/L; Wikipedia "Sulfuric acid" and "pH");
//   stomach contents 1.5–3.5 (MedlinePlus "Stomach acid test"; see StomachClear);
//   lemon juice 2.0–2.6, vinegar 2.4–3.4, milk 6.4–6.8 (US FDA, "Approximate pH of Foods and Food
//   Products"); set curd about 4.6 (see CurdClear); clean rain 5.6 (CO₂ in equilibrium with air, computed
//   in chapter 4; US EPA gives the same figure); pure water 7.0 at 25 °C; blood 7.35–7.45 (Wikipedia
//   "Bicarbonate buffer system"); surface sea water about 8.05 in 2020 (Wikipedia "Ocean acidification");
//   baking soda in water 8.3 and milk of magnesia 10.4 (both computed by the solver in acid.js);
//   bar soap about 9–10 and household bleach about 11–13 (typical textbook figures, they vary by brand);
//   household ammonia 11.0–11.5 (Wikipedia "pH"); 1 mol/L caustic soda 14.0 (computed).
//   Each liquid's [H₃O⁺] is 10^−pH; the comparison with pure water follows from that.
// "ind": five indicators in test tubes and a turmeric stain on a white cloth. Each indicator is a weak
//   acid whose two forms have different colours; its colour is computed from the pH and its sourced
//   transition range (see acid.js). Turmeric turning red with soap is the same chemistry as the
//   haldi stain that goes red in the wash and yellow again when rinsed.
import { THREE, M, box, clamp, approach } from '../kit.js';
import {
  INDICATORS, indColor, indName, indOpacity, uniColor, css, toHex, conc, times, fpH, COL, VIEW, REEL_VIEW,
  board, panelBg, title, text, strip, liquidMat, ruler, bench, fitNarrow, placeBoard, fit, focusSwitch, showLabels,
} from '../acid.js';

export const ITEMS = [
  { name: 'Battery acid', pH: 0, range: 'below 1', shape: 'bottle', col: 0x8a8f9a, note: 'Sulphuric acid at 4 to 5 mol/L, inside the lead-acid battery of a car or an inverter (see UPSClear). The simple scale runs out here.' },
  { name: 'Stomach acid', pH: 2.0, range: '1.5 to 3.5', shape: 'drop', col: 0xd9c86a, note: 'Hydrochloric acid, made by the stomach lining (see StomachClear).' },
  { name: 'Lemon juice', pH: 2.3, range: '2.0 to 2.6', shape: 'lemon', col: 0xf2d63a, note: 'Citric acid. Sour is the taste of H⁺ itself (see TongueClear).' },
  { name: 'Vinegar', pH: 2.9, range: '2.4 to 3.4', shape: 'bottle', col: 0xc98a3a, note: 'About 5% acetic acid, a weak acid.' },
  { name: 'Curd (dahi)', pH: 4.6, range: 'about 4.6 when set', shape: 'bowl', col: 0xf4efe2, note: 'Bacteria turn milk sugar into lactic acid, and at pH 4.6 the milk sets (see CurdClear).' },
  { name: 'Clean rain', pH: 5.6, range: 'about 5.6', shape: 'drop', col: 0x9fc8ee, note: 'Rain dissolves carbon dioxide from the air, which makes weak carbonic acid.' },
  { name: 'Milk', pH: 6.6, range: '6.4 to 6.8', shape: 'glass', col: 0xf7f5ee, note: 'Very slightly acidic.' },
  { name: 'Pure water', pH: 7.0, range: '7.0 at 25 °C', shape: 'glass', col: 0xbfe0f7, note: 'Neutral: equal H₃O⁺ and OH⁻.' },
  { name: 'Blood', pH: 7.4, range: '7.35 to 7.45', shape: 'drop', col: 0xb3202a, note: 'Held in this narrow range by buffers, the lungs and the kidneys (chapter 4).' },
  { name: 'Sea water', pH: 8.05, range: 'about 8.05', shape: 'glass', col: 0x3f8fb5, note: 'It was about 8.15 in 1950. Dissolved CO₂ is slowly lowering it.' },
  { name: 'Baking soda water', pH: 8.3, range: '8.3', shape: 'glass', col: 0xe8eef2, note: 'Sodium bicarbonate, a mild base (see CakeClear).' },
  { name: 'Soap', pH: 10, range: 'about 9 to 10', shape: 'bar', col: 0xf0b7c8, note: 'Soap is the salt of a weak acid and a strong base, so it is basic. This is what turns turmeric red.' },
  { name: 'Milk of magnesia', pH: 10.4, range: '10.4', shape: 'bottle', col: 0x9ad0e8, note: 'Magnesium hydroxide barely dissolves, so its pH cannot climb higher than this.' },
  { name: 'Household ammonia', pH: 11.3, range: '11.0 to 11.5', shape: 'bottle', col: 0xcfd8e8, note: 'A weak base, used in some glass cleaners.' },
  { name: 'Bleach', pH: 12.5, range: 'about 11 to 13', shape: 'bottle', col: 0xf0f0f0, note: 'Kept strongly basic so that it stays stable in the bottle.' },
  { name: 'Drain cleaner', pH: 14, range: 'about 14', shape: 'bottle', col: 0x7a4fb5, note: 'Sodium hydroxide (caustic soda). As dangerous to skin and eyes as a strong acid.' },
];
const TUBES = ['mo', 'litmus', 'haldi', 'pp', 'cabbage'];
const likeOf = (pH) => ITEMS.reduce((a, b) => (Math.abs(b.pH - pH) < Math.abs(a.pH - pH) ? b : a));
const fmtPH = (v) => { const it = likeOf(v); return `pH ${v.toFixed(1)}${Math.abs(it.pH - v) < 0.35 ? ` · like ${it.name.toLowerCase()}` : ''}`; };

function vessel(it) {
  const g = new THREE.Group(), mat = M.plastic(it.col, { roughness: 0.35 });
  const add = (m, y) => { m.position.y = y; m.castShadow = true; g.add(m); return m; };
  if (it.shape === 'bottle') { add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 20), mat), 0.25); add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.16, 16), mat), 0.58); add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 16), M.plastic(0x2a2e37)), 0.7); }
  else if (it.shape === 'glass') { add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.42, 20), M.plastic(it.col, { transparent: true, opacity: 0.85, roughness: 0.15 })), 0.21); }
  else if (it.shape === 'bowl') { add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.22, 24), M.matte(0xb8623a)), 0.11); add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 24), mat), 0.22); }
  else if (it.shape === 'bar') { add(box(0.36, 0.14, 0.24, mat), 0.07); }
  else if (it.shape === 'lemon') { const m = add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), mat), 0.15); m.scale.set(1.3, 0.95, 0.95); }
  else { const m = add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), mat), 0.2); m.scale.y = 1.25; }
  return g;
}

export default {
  id: 'home',
  short: 'Around the house',
  title: 'From lemon juice to drain cleaner',
  subtitle: 'Everyday liquids on the pH scale, and the plant dyes that give them away.',
  view: VIEW,
  learn: `<p>Your kitchen and bathroom cover almost the whole pH scale. <b>Lemon juice</b> sits near pH 2.3 and <b>vinegar</b> near 2.9. <b>Curd</b> sets when milk falls from pH 6.6 to about 4.6 (see CurdClear). <b>Milk</b> is just on the acid side of neutral and <b>blood</b> just on the basic side, at 7.4. <b>Baking soda</b> in water is 8.3, <b>soap</b> about 9 to 10, <b>bleach</b> about 12.5.</p>
    <p>Remember what the numbers mean. Lemon juice at 2.3 and milk at 6.6 are 4.3 steps apart, so lemon juice has about <b>20,000 times</b> more H₃O⁺. And notice the two ends. A strong base is as harsh as a strong acid. Drain cleaner at pH 14 is at least as dangerous to skin and eyes as battery acid near pH 0.</p>
    <p>How could anyone tell acid from base before pH meters? With colour. In the 1660s Robert Boyle showed that plant dyes such as <b>syrup of violets</b> change colour: one colour in acids, another in alkalis. Such a dye is called an <b>indicator</b>. <b>Litmus</b>, made from lichens, turns <b>red in acid and blue in base</b>. <b>Phenolphthalein</b> is colourless until about pH 8.3, then pink. <b>Red cabbage</b> juice runs from red through purple and blue to green and yellow.</p>
    <p>An Indian kitchen has its own indicator: <b>turmeric (haldi)</b>. Its yellow dye, curcumin, turns <b>red-brown above about pH 8.6</b>. That is why a curry stain on a white shirt turns red when you rub soap on it, and goes yellow again when the soap is rinsed out. The stain did not get worse. It did a chemistry test.</p>
    <p>An indicator works because it is itself a weak acid. With its proton it is one colour, without it another. Each one flips over its own narrow range, so a chemist picks the indicator to suit the job, as you will see in the next chapter.</p>
    <p class="tip"><b>Try it:</b> walk along the shelf and watch the "times" figure. Then open <b>Indicators</b>, start at pH 7 and slide up to 10: the haldi stain turns red and phenolphthalein goes pink. Which tube would you use to tell lemon juice from vinegar? (None of them: you would need a meter.)</p>`,
  terms: [
    { t: 'Indicator', d: 'A dye that is one colour in acid and another in base, because it gains or loses a proton.' },
    { t: 'Litmus', d: 'A dye from lichens: red below about pH 4.5, blue above about 8.3, purple in between.' },
    { t: 'Phenolphthalein', d: 'Colourless in acid and neutral solutions, pink above about pH 8.3 to 10.' },
    { t: 'Curcumin', d: 'The yellow dye of turmeric. It turns red-brown in bases, above about pH 8.6.' },
    { t: 'Neutral', d: 'Neither acidic nor basic: equal amounts of H₃O⁺ and OH⁻. pH 7 at 25 °C.' },
    { t: 'Alkali', d: 'A base that dissolves in water, such as caustic soda or washing soda.' },
  ],
  defaults: { focus: 'shelf', item: 2, ph: 7 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'shelf', label: 'The pH shelf' }, { v: 'ind', label: 'Indicators' }] },
    { key: 'item', type: 'range', label: 'Shelf: pick a liquid', min: 0, max: ITEMS.length - 1, step: 1, ends: ['battery acid', 'drain cleaner'], fmt: (v) => `${ITEMS[Math.round(v)].name} · pH ${ITEMS[Math.round(v)].range}` },
    { key: 'ph', type: 'range', label: 'Indicators: pH of the liquid tested', min: 0, max: 14, step: 0.1, ends: ['0 strong acid', '14 strong base'], fmt: fmtPH },
    { key: 'dip', type: 'buttons', label: 'Indicators: test something', items: [
      { label: 'Lemon juice', act: (s) => { s.ph = 2.3; s.focus = 'ind'; } },
      { label: 'Milk', act: (s) => { s.ph = 6.6; s.focus = 'ind'; } },
      { label: 'Baking soda', act: (s) => { s.ph = 8.3; s.focus = 'ind'; } },
      { label: 'Soap', act: (s) => { s.ph = 10; s.focus = 'ind'; } },
      { label: 'Bleach', act: (s) => { s.ph = 12.5; s.focus = 'ind'; } },
    ] },
  ],
  onChange(s, key) { if (key === 'item') s.focus = 'shelf'; if (key === 'ph') s.focus = 'ind'; },
  quiz: [
    { q: 'A yellow turmeric stain on a white shirt turns red when you rub soap on it. Why?', options: ['Soap is basic, and curcumin turns red-brown in a base', 'The soap contains red dye', 'The stain is burning', 'Turmeric is an acid that dissolves the cloth'], answer: 0, why: 'Curcumin is an indicator: yellow in acid and neutral, red-brown above about pH 8.6. Soap is around pH 9 to 10. Rinse the soap away and the stain goes yellow again.' },
    { q: 'Lemon juice is about pH 2.3 and milk about pH 6.6. Roughly how many times more H₃O⁺ does lemon juice have?', options: ['About 4 times', 'About 40 times', 'About 20,000 times', 'About 3 times'], answer: 2, why: 'The gap is 4.3 pH steps, and each step is ×10. 10 to the power 4.3 is about 20,000.' },
    { q: 'Blue litmus paper dipped in a liquid stays blue. What can you say?', options: ['The liquid is a strong acid', 'The liquid is not acidic: it is neutral or basic', 'The liquid is exactly pH 7', 'The liquid is pure water'], answer: 1, why: 'Blue litmus only turns red in acid. Staying blue rules out an acid, but it cannot tell neutral from basic. For that you would try red litmus.' },
  ],
  reel: [
    { ms: 5400, caption: 'Battery acid, lemon, curd, milk, blood, soap, bleach: every step along the shelf is ten times.', set: { focus: 'shelf' }, anim: { item: [0, 15] }, view: REEL_VIEW, spin: 0 },
    { ms: 5200, caption: 'Rub soap on a haldi stain and it turns red. Turmeric is a pH indicator.', set: { focus: 'ind' }, anim: { ph: [5, 10.5] }, view: REEL_VIEW, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    root.add(bench(7.2, 3.4));
    const rl = ruler(6.4, 0, 14, 0.46); rl.position.set(0, 0.5, 1.85); rl.rotation.x = -0.35; root.add(rl);

    // ================================================================ SHELF
    const Sh = new THREE.Group(); root.add(Sh);
    const ROWS = [-0.95, 0.05, 1.0];
    const vs = ITEMS.map((it, i) => {
      const g = new THREE.Group(); g.position.set(rl.xOf(it.pH), 0.1, ROWS[i % 3]);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24), new THREE.MeshBasicMaterial({ color: toHex(uniColor(it.pH)), toneMapped: false })); ped.position.y = 0.03; g.add(ped);
      const v = vessel(it); v.position.y = 0.06; g.add(v); g.v = v; Sh.add(g);
      return g;
    });
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); Sh.add(pin);
    const lItem = stage.label('', [0, 2.4, 0], Sh, 'hot');
    const lAcid = stage.label('← more acidic', [-2.2, -0.05, 2.3], Sh), lBase = stage.label('more basic →', [2.2, -0.05, 2.3], Sh), lNeu = stage.label('neutral', [0, -0.05, 2.3], Sh);

    // ================================================================ INDICATORS
    const In = new THREE.Group(); root.add(In);
    const rack = box(4.0, 0.14, 0.8, M.matte(0x8a6a48)); rack.position.set(-1.2, 1.5, 0); In.add(rack);
    for (const x of [-3.1, 0.7]) { const leg = box(0.14, 1.5, 0.8, M.matte(0x8a6a48)); leg.position.set(x, 0.85, 0); In.add(leg); }
    const tubes = TUBES.map((id, i) => {
      const x = -2.8 + i * 0.8, g = new THREE.Group(); g.position.set(x, 0.55, 0); In.add(g);
      const glass = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.7, 8, 24), M.clear(0xcfe8ff, 0.2)); glass.position.y = 1.05; g.add(glass);
      const mat = liquidMat(); const liq = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.0, 8, 24), mat); liq.position.y = 0.7; liq.renderOrder = 2; glass.renderOrder = 3; g.add(liq);
      const l = stage.label('', [x, 3.0 + (i % 3) * 0.42, 0], In, 'hot');
      return { id, mat, l };
    });
    // the white cloth with a turmeric stain, and a bar of soap that slides in when the liquid is basic
    const cloth = box(1.9, 0.06, 1.5, M.matte(0xf4f4f0)); cloth.position.set(2.3, 0.75, 0.3); cloth.rotation.x = 0.5; In.add(cloth);
    const stainMat = new THREE.MeshBasicMaterial({ color: 0xf2c21a, toneMapped: false, transparent: true, opacity: 0.92 });
    const stain = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), stainMat); stain.rotation.x = -Math.PI / 2; stain.position.set(0, 0.035, 0); stain.scale.set(1.2, 0.85, 1); cloth.add(stain);
    const stain2 = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), stainMat); stain2.rotation.x = -Math.PI / 2; stain2.position.set(0.5, 0.036, 0.25); cloth.add(stain2);
    const soap = box(0.6, 0.22, 0.4, M.plastic(0xf0b7c8)); soap.position.set(3.0, 0.3, 1.2); In.add(soap);
    const lCloth = stage.label('', [2.3, 2.0, 0.3], In, 'hot');
    const indLabels = [...tubes.map((t) => t.l), lCloth], shelfLabels = [lItem, lAcid, lBase, lNeu];

    // ================================================================ board
    let S = null, key = '';
    const bd = board(root, 3.3, 2.31, 640, 448, (g, w, h) => {
      panelBg(g, w, h); if (!S) return;
      if (S.focus === 'ind') {
        title(g, 'Indicator colours', 'pH 0 to 14');
        const x0 = 196, x1 = w - 24, X = (p) => x0 + (p / 14) * (x1 - x0);
        TUBES.forEach((id, i) => {
          const y = 76 + i * 62;
          text(g, id === 'cabbage' ? 'Red cabbage' : id === 'pp' ? 'Phenolphth.' : INDICATORS[id].name, 18, y + 30, COL.text, '22px sans-serif');
          g.fillStyle = '#d6e8f6'; g.fillRect(x0, y, x1 - x0, 42); strip(g, id, X, y, 42);
        });
        g.fillStyle = COL.soft; g.font = '20px sans-serif';
        for (const p of [0, 2, 4, 6, 8, 10, 12, 14]) g.fillText(String(p), X(p) - (p > 9 ? 11 : 6), 412);
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(S.ph), 68); g.lineTo(X(S.ph), 390); g.stroke();
        text(g, `pH ${S.ph.toFixed(1)}`, clamp(X(S.ph) - 34, x0, x1 - 80), 438, COL.light, 'bold 22px sans-serif');
      } else {
        const it = ITEMS[Math.round(S.item)];
        title(g, 'H₃O⁺ compared with water');
        const x0 = 100, x1 = w - 24, yMid = 250, sc = 21, bw = (x1 - x0) / ITEMS.length;
        g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = COL.soft; g.font = '20px sans-serif';
        [[7, '10⁷ ×'], [3.5, ''], [0, 'water'], [-3.5, ''], [-7, '10⁻⁷ ×']].forEach(([v, s]) => { const y = yMid - v * sc; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); if (s) g.fillText(s, x0 - 8 - g.measureText(s).width, y + 7); });
        ITEMS.forEach((q, i) => {
          const v = 7 - q.pH, x = x0 + i * bw + 4, sel = q === it;
          g.fillStyle = css(uniColor(q.pH), sel ? 1 : 0.55); g.fillRect(x, v >= 0 ? yMid - v * sc : yMid, bw - 8, Math.max(3, Math.abs(v) * sc));
          if (sel) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(x - 2, (v >= 0 ? yMid - v * sc : yMid) - 2, bw - 4, Math.max(3, Math.abs(v) * sc) + 4); }
        });
        text(g, `${it.name}: pH ${it.range}`, 104, 82, COL.light, 'bold 24px sans-serif');
        text(g, 'each grid line is × 3,000 or so; the scale is logarithmic', 104, 436, COL.soft, '19px sans-serif');
      }
    }, [2.85, 5.62, 0]);

    const setFocus = focusSwitch({ shelf: Sh, ind: In });
    let soapX = 3.6;
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt); S = s;
        const isInd = s.focus === 'ind';
        setFocus(isInd ? 'ind' : 'shelf');
        const narrow = fitNarrow(stage, []);
        showLabels(shelfLabels, !isInd); showLabels(indLabels, isInd);
        if (narrow) showLabels([lAcid, lBase, lNeu, ...tubes.map((t) => t.l)], false);
        placeBoard(bd);
        if (isInd) {
          rl.set(s.ph);
          tubes.forEach((t) => {
            t.mat.tint(indColor(t.id, s.ph), indOpacity(t.id, s.ph));
            const nm = t.id === 'cabbage' ? 'red cabbage' : INDICATORS[t.id].name.toLowerCase(), c = indColor(t.id, s.ph);
            t.l.element.style.setProperty('--c', t.id === 'pp' && indName('pp', s.ph) === 'colourless' ? COL.soft : css(c.map((v) => Math.min(255, v + 50))));
            t.l.element.innerHTML = `${nm}: <b>${indName(t.id, s.ph)}</b>`;
          });
          const hc = indColor('haldi', s.ph); stainMat.color.setRGB(hc[0] / 255, hc[1] / 255, hc[2] / 255, THREE.SRGBColorSpace);
          soapX = approach(soapX, s.ph > 8 ? 2.9 : 3.9, 4, dt); soap.position.x = soapX; soap.visible = soapX < 3.7;
          lCloth.element.style.setProperty('--c', css(hc.map((v) => Math.min(255, v + 40))));
          lCloth.element.innerHTML = `haldi stain: <b>${indName('haldi', s.ph)}</b>`;
        } else {
          const idx = clamp(Math.round(s.item), 0, ITEMS.length - 1), it = ITEMS[idx];
          rl.set(it.pH);
          vs.forEach((g, i) => { const on = i === idx; g.v.scale.setScalar(approach(g.v.scale.x, on ? 2.7 : 1.7, 8, dt)); g.v.position.y = approach(g.v.position.y, on ? 0.45 + 0.05 * Math.sin(time * 2) : 0.06, 8, dt); });
          const g = vs[idx];
          pin.position.set(g.position.x, 0.33, g.position.z); pin.scale.y = 0.4;
          lItem.position.set(g.position.x, 2.75, g.position.z);
          lItem.element.style.setProperty('--c', css(uniColor(it.pH).map((v) => Math.min(255, v + 50))));
          lItem.element.innerHTML = `${it.name}: <b>pH ${it.range}</b>`;
        }
        const k = isInd ? `i|${s.ph}` : `s|${Math.round(s.item)}`;
        if (k !== key) { key = k; bd.redraw(); }
      },
      readout: (s) => fit(((s) => {
        if (s.focus === 'ind') {
          const it = likeOf(s.ph);
          return `<div class="big">pH ${s.ph.toFixed(1)}: litmus ${indName('litmus', s.ph)}</div>
            <div class="row"><span>Turmeric (haldi)</span><b>${indName('haldi', s.ph)}</b></div>
            <div class="row"><span>Phenolphthalein</span><b>${indName('pp', s.ph)}</b></div>
            <div class="row x"><span>Methyl orange</span><b>${indName('mo', s.ph)}</b></div>
            <div class="row x"><span>Red cabbage juice</span><b>${indName('cabbage', s.ph)}</b></div>
            <div class="row x"><span>Nearest on the shelf</span><b>${it.name.toLowerCase()} (pH ${it.range})</b></div>
            <small>${s.ph > 8.6 ? 'Basic enough to turn turmeric red-brown, as soap does to a curry stain.' : s.ph > 7.4 ? 'Turmeric is part-way through its change.' : 'Turmeric stays yellow in anything acidic or neutral.'}</small>`;
        }
        const it = ITEMS[clamp(Math.round(s.item), 0, ITEMS.length - 1)], H = Math.pow(10, -it.pH), r = H / 1e-7;
        return `<div class="big">${it.name}: pH ${it.pH === 0 ? 'below 1' : it.pH}</div>
          <div class="row"><span>Usual range</span><b>${it.range}</b></div>
          <div class="row"><span>[H₃O⁺]</span><b>${it.pH === 0 ? 'more than 1 mol/L' : conc(H)}</b></div>
          <div class="row"><span>Compared with pure water</span><b>${Math.abs(it.pH - 7) < 0.01 ? 'the same' : r > 1 ? `${it.pH === 0 ? 'over ' : ''}${times(r)}× the H₃O⁺` : `${times(1 / r)}× the OH⁻`}</b></div>
          <small>${it.note}</small>`;
      })(s)),
    };
  },
};
